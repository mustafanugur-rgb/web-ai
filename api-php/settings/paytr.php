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

$merchantId = trim($input['merchant_id'] ?? '');
$merchantKey = trim($input['merchant_key'] ?? '');
$merchantSalt = trim($input['merchant_salt'] ?? '');

$dir = dirname(PAYTR_CONFIG_PATH);
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}
$data = [
    'merchant_id' => $merchantId,
    'merchant_key' => $merchantKey,
    'merchant_salt' => $merchantSalt,
];
if (file_put_contents(PAYTR_CONFIG_PATH, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
    jsonError('Kayıt yapılamadı.', 500);
}
jsonResponse(['ok' => true, 'message' => 'PayTR ayarları sunucuya kaydedildi.']);
