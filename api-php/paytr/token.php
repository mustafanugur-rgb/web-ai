<?php
require_once dirname(__DIR__) . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$rawInput = file_get_contents('php://input') ?: '{}';
$input = json_decode($rawInput, true) ?: [];
$csrfToken = $input['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (!verifyCsrfToken($csrfToken)) {
    jsonError('Geçersiz veya süresi dolmuş güvenlik jetonu. Sayfayı yenileyip tekrar deneyin.', 403);
}
$paytr = getPaytrConfig();
$merchantId = trim($paytr['merchant_id'] ?? '');
$merchantKey = trim($paytr['merchant_key'] ?? '');
$merchantSalt = trim($paytr['merchant_salt'] ?? '');

if (!$merchantId || $merchantId === 'XXXXXX' || !$merchantKey || $merchantKey === 'YYYYYYYYYYYYYY' || !$merchantSalt || $merchantSalt === 'ZZZZZZZZZZZZZZ') {
    jsonResponse(['error' => 'PayTR henüz yapılandırılmadı. Yönetim paneli → Ayarlar → PayTR bölümünden Merchant ID, Key ve Salt kaydedin.'], 503);
}

$name = trim($input['name'] ?? '');
$email = trim($input['email'] ?? '');
$phone = trim($input['phone'] ?? '');
$business = trim($input['business'] ?? 'Restoran/Kafe');
$plan = $input['plan'] ?? '';
$amount = isset($input['amount']) ? (float)$input['amount'] : 0;
$cart = $input['cart'] ?? null;

if (!$email || !$name || !$phone) {
    jsonError('Eksik alan: name, email, phone gerekli');
}

if (is_array($cart) && count($cart) > 0) {
    $subtotal = 0;
    foreach ($cart as $item) {
        $price = (float)($item['price'] ?? 0);
        $qty = (int)($item['qty'] ?? 1);
        $subtotal += $price * $qty;
    }
    $kdv = $subtotal * 0.18;
    $totalAmount = $subtotal + $kdv;
    $basket = [];
    foreach ($cart as $item) {
        $basket[] = [$item['name'] ?? 'Ürün', number_format((float)($item['price'] ?? 0), 2, '.', ''), (int)($item['qty'] ?? 1)];
    }
    $basket[] = ['KDV (%18)', number_format($kdv, 2, '.', ''), 1];
} elseif ($plan && $amount > 0) {
    $totalAmount = $amount;
    $basket = [[($plan ?: 'Plan') . ' - Aylık Abonelik', number_format($amount, 2, '.', ''), 1]];
} else {
    jsonError('plan+amount veya cart gerekli');
}

$merchantOid = 'DP' . (string)(time() * 1000) . substr(bin2hex(random_bytes(4)), 0, 8);
$paymentAmount = (string)round($totalAmount * 100);
$userIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
if (strpos($userIp, ',') !== false) {
    $userIp = trim(explode(',', $userIp)[0]);
}

$baseUrl = getenv('BASE_URL') ?: ('https://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
$merchantOkUrl = $baseUrl . '/odeme-basarili.html?oid=' . $merchantOid;
$merchantFailUrl = $baseUrl . '/odeme-basarisiz.html?oid=' . $merchantOid;

$userBasket = base64_encode(json_encode($basket));
$testMode = getenv('PAYTR_TEST_MODE') ?: '1';
$userPhone = preg_replace('/\D/', '', $phone);
$userPhone = substr($userPhone, 0, 20);

$params = [
    'merchant_id' => $merchantId,
    'user_ip' => $userIp,
    'merchant_oid' => $merchantOid,
    'email' => $email,
    'payment_amount' => $paymentAmount,
    'user_basket' => $userBasket,
    'no_installment' => '0',
    'max_installment' => '0',
    'currency' => 'TL',
    'test_mode' => $testMode,
];
$hashStr = $params['merchant_id'] . $params['user_ip'] . $params['merchant_oid'] . $params['email'] . $params['payment_amount'] . $params['user_basket'] . $params['no_installment'] . $params['max_installment'] . $params['currency'] . $params['test_mode'] . $merchantSalt;
$paytrToken = base64_encode(hash_hmac('sha256', $hashStr, $merchantKey, true));

$postData = $params + [
    'merchant_key' => $merchantKey,
    'merchant_salt' => $merchantSalt,
    'user_name' => $name,
    'user_address' => $business,
    'user_phone' => $userPhone,
    'merchant_ok_url' => $merchantOkUrl,
    'merchant_fail_url' => $merchantFailUrl,
    'timeout_limit' => '30',
    'debug_on' => '1',
    'lang' => 'tr',
    'paytr_token' => $paytrToken,
];

$ch = curl_init('https://www.paytr.com/odeme/api/get-token');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query($postData),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_TIMEOUT => 30,
]);
$response = curl_exec($ch);
$err = curl_error($ch);
curl_close($ch);

if ($err) {
    jsonError('PayTR bağlantı hatası: ' . $err, 502);
}
$result = json_decode($response, true);
if (!$result) {
    jsonError('PayTR yanıtı işlenemedi', 502);
}
if (!empty($result['status']) && $result['status'] === 'success') {
    jsonResponse(['token' => $result['token'], 'merchant_oid' => $merchantOid]);
}
jsonError($result['reason'] ?? 'PayTR token alınamadı', 400);
