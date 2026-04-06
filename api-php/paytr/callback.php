<?php
require_once dirname(__DIR__) . '/config.php';
// PayTR sunucudan POST eder - CSRF kontrolü yok

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('HTTP/1.0 405 Method Not Allowed');
    exit;
}

$paytr = getPaytrConfig();
$merchantOid = $_POST['merchant_oid'] ?? '';
$status = $_POST['status'] ?? '';
$totalAmount = $_POST['total_amount'] ?? '';
$hash = $_POST['hash'] ?? '';

$hashStr = $merchantOid . $paytr['merchant_salt'] . $status . $totalAmount;
$token = base64_encode(hash_hmac('sha256', $hashStr, $paytr['merchant_key'], true));

if (!hash_equals($token, $hash)) {
    header('HTTP/1.0 400 Bad Request');
    echo 'OK';
    exit;
}

// Ödeme başarılı veya iptal - gerekirse log/sipariş güncelleme burada
// if ($status === 'success') { ... }

header('Content-Type: text/plain; charset=utf-8');
echo 'OK';
