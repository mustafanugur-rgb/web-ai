<?php
/**
 * Satış sohbetinden iletişim bilgisi — JSON (widget ile uyumlu).
 * FastAPI adresi tanımlıysa önce oraya iletilir (Telegram bildirimi vb.); olmazsa yerel JSON.
 */
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    echo json_encode(['detail' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$rawLead = (string) file_get_contents('php://input');
$proxied = proxy_post_to_sales_agent('/lead', $rawLead);
if ($proxied !== null) {
    list($code, $out) = $proxied;
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    echo $out;
    exit;
}

$input = json_decode($rawLead ?: '{}', true) ?: [];
$name = trim((string)($input['name'] ?? ''));
$phone = trim((string)($input['phone'] ?? ''));
$email = trim((string)($input['email'] ?? ''));

if (!is_dir(DATA_DIR)) {
    @mkdir(DATA_DIR, 0755, true);
}
$path = DATA_DIR . '/sales-chat-leads.json';
$leads = [];
if (file_exists($path)) {
    $leads = json_decode((string)file_get_contents($path), true) ?: [];
}
$leads[] = [
    'ts' => date('c'),
    'name' => $name !== '' ? $name : null,
    'phone' => $phone !== '' ? $phone : null,
    'email' => $email !== '' ? $email : null,
];
@file_put_contents($path, json_encode($leads, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

jsonResponse(['ok' => true]);
