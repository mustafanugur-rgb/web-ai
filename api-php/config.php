<?php
/**
 * Dinamik POS - PHP API ortak ayarlar
 * Bu klasör sunucuda public_html/api/ içine yüklenir.
 */
if (!defined('DINAMIK_PHP_API')) {
    define('DINAMIK_PHP_API', true);
}

$basePath = dirname(__DIR__);
define('BASE_PATH', $basePath);
define('DATA_DIR', $basePath . '/data');
define('IMAGES_DIR', $basePath . '/images');
define('PAYTR_CONFIG_PATH', DATA_DIR . '/paytr-config.json');

/** js/config.js içindeki SITE_WHATSAPP ile aynı olmalı (90 ile, boşluksuz). */
define('SITE_WHATSAPP_DEFAULT', '905322652660');

/**
 * WhatsApp (sadece rakam, 90…).
 * Öncelik: ortam SITE_WHATSAPP → data/site-whatsapp.txt → SITE_WHATSAPP_DEFAULT
 */
function getSiteWhatsAppDigits() {
    $e = getenv('SITE_WHATSAPP');
    if ($e !== false && $e !== '') {
        $e = preg_replace('/\D/', '', $e);
        if (strlen($e) >= 10) {
            if (strlen($e) === 10 && $e[0] === '5') {
                $e = '90' . $e;
            }
            return $e;
        }
    }
    $f = DATA_DIR . '/site-whatsapp.txt';
    if (file_exists($f)) {
        $t = preg_replace('/\D/', '', trim((string)@file_get_contents($f)));
        if (strlen($t) >= 10) {
            if (strlen($t) === 10 && $t[0] === '5') {
                $t = '90' . $t;
            }
            return $t;
        }
    }
    return SITE_WHATSAPP_DEFAULT;
}

$csrfSecret = getenv('CSRF_SECRET') ?: 'dinamik-pos-csrf-secret-change-in-production';
define('CSRF_SECRET', $csrfSecret);
define('CSRF_MAX_AGE', 3600); // 1 saat

function getPaytrConfig() {
    if (file_exists(PAYTR_CONFIG_PATH)) {
        $json = @file_get_contents(PAYTR_CONFIG_PATH);
        if ($json !== false) {
            $data = @json_decode($json, true);
            if ($data && !empty($data['merchant_id']) && !empty($data['merchant_key']) && !empty($data['merchant_salt'])) {
                return $data;
            }
        }
    }
    return [
        'merchant_id' => getenv('PAYTR_MERCHANT_ID') ?: 'XXXXXX',
        'merchant_key' => getenv('PAYTR_MERCHANT_KEY') ?: 'YYYYYYYYYYYYYY',
        'merchant_salt' => getenv('PAYTR_MERCHANT_SALT') ?: 'ZZZZZZZZZZZZZZ',
    ];
}

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    $flags = JSON_UNESCAPED_UNICODE;
    if (defined('JSON_INVALID_UTF8_SUBSTITUTE')) {
        $flags |= JSON_INVALID_UTF8_SUBSTITUTE;
    }
    $out = json_encode($data, $flags);
    if ($out === false) {
        $out = json_encode(['detail' => 'Yanıt oluşturulamadı.'], JSON_UNESCAPED_UNICODE);
    }
    echo $out;
    exit;
}

function jsonError($message, $code = 400) {
    jsonResponse(['error' => $message], $code);
}

/**
 * Harici FastAPI satış asistanı kök URL (sonda / yok).
 * Öncelik: getenv('SALES_AGENT_URL') → data/sales-agent-api-url.txt
 * Canlıda chat.php bu adrese proxy yapar; boşsa WhatsApp yedeği döner.
 */
function getSalesAgentBaseUrl() {
    $e = getenv('SALES_AGENT_URL');
    if ($e !== false && $e !== null && trim((string) $e) !== '') {
        return rtrim(trim((string) $e), '/');
    }
    if (defined('DATA_DIR') && is_string(DATA_DIR) && DATA_DIR !== '') {
        $f = DATA_DIR . '/sales-agent-api-url.txt';
        if (file_exists($f)) {
            $t = trim((string) @file_get_contents($f));
            if ($t !== '' && preg_match('#^https?://#i', $t)) {
                return rtrim($t, '/');
            }
        }
    }
    return '';
}

/**
 * POST JSON gövdesini FastAPI /chat veya /lead'e iletir.
 * @return array{0:int,1:string}|null [http_code, body] veya başarısız
 */
function proxy_post_to_sales_agent($path, $rawJsonBody) {
    $base = getSalesAgentBaseUrl();
    if ($base === '') {
        return null;
    }
    $path = '/' . ltrim((string) $path, '/');
    $url = $base . $path;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_POSTFIELDS => $rawJsonBody,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 120,
            CURLOPT_CONNECTTIMEOUT => 25,
        ]);
        $out = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($out === false || $code < 200 || $code >= 500) {
            return null;
        }
        return [$code, $out];
    }
    $ctx = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nAccept: application/json\r\n",
            'content' => $rawJsonBody,
            'timeout' => 120,
            'ignore_errors' => true,
        ],
    ]);
    $out = @file_get_contents($url, false, $ctx);
    if ($out === false) {
        return null;
    }
    $code = 200;
    if (isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0], $m)) {
        $code = (int) $m[1];
    }
    if ($code < 200 || $code >= 500) {
        return null;
    }
    return [$code, $out];
}

function getCsrfTokenFromRequest() {
    return trim(isset($_SERVER['HTTP_X_CSRF_TOKEN']) ? $_SERVER['HTTP_X_CSRF_TOKEN'] : '');
}

function createCsrfToken() {
    $payload = ['iat' => time(), 'rnd' => bin2hex(random_bytes(16))];
    $payloadStr = json_encode($payload);
    $signature = hash_hmac('sha256', $payloadStr, CSRF_SECRET);
    $payloadB64 = strtr(base64_encode($payloadStr), '+/', '-_');
    $payloadB64 = rtrim($payloadB64, '=');
    return $payloadB64 . '.' . $signature;
}

function verifyCsrfToken($token) {
    if (!$token || !is_string($token)) return false;
    $parts = explode('.', $token, 2);
    if (count($parts) !== 2) return false;
    $payloadB64 = $parts[0];
    $payloadStr = base64_decode(strtr($payloadB64, '-_', '+/') . '==');
    if ($payloadStr === false) return false;
    $payload = json_decode($payloadStr, true);
    if (!$payload || !isset($payload['iat'], $payload['rnd'])) return false;
    $expected = hash_hmac('sha256', json_encode(['iat' => $payload['iat'], 'rnd' => $payload['rnd']]), CSRF_SECRET);
    if (!hash_equals($expected, $parts[1])) return false;
    if (time() - $payload['iat'] > CSRF_MAX_AGE) return false;
    return true;
}

function requireCsrf() {
    if ($_SERVER['REQUEST_METHOD'] === 'GET' || $_SERVER['REQUEST_METHOD'] === 'HEAD' || $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        return;
    }
    $token = getCsrfTokenFromRequest();
    if (!verifyCsrfToken($token)) {
        jsonError('Geçersiz veya süresi dolmuş güvenlik jetonu. Sayfayı yenileyip tekrar deneyin.', 403);
    }
}
