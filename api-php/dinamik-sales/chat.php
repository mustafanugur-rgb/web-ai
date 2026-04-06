<?php
/**
 * AI satış asistanı — önce harici FastAPI'ye proxy (SALES_AGENT_URL veya data/sales-agent-api-url.txt).
 * Proxy yoksa veya hata: WhatsApp yedeği (eski davranış).
 * Tarayıcıdan doğrudan AI: js/config.js → DINAMIKPOS_SALES_AGENT_API.
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

$rawBody = (string) file_get_contents('php://input');
$proxied = proxy_post_to_sales_agent('/chat', $rawBody);
if ($proxied !== null) {
    list($code, $out) = $proxied;
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    echo $out;
    exit;
}

$wa = getSiteWhatsAppDigits();
$text = rawurlencode('Merhaba, POS ve yazarkasa hakkında bilgi almak istiyorum.');
/* Müşteriye teknik detay yok; WhatsApp: hosting’de SITE_WHATSAPP (ör. 905321234567) veya aşağıdaki varsayılan */
$reply = "Merhaba 👋 Size hemen otomatik yanıt veremiyoruz; en kısa sürede yardımcı olmak için WhatsApp hattımızdan yazabilirsiniz:\n\n"
    . "https://wa.me/{$wa}?text={$text}\n\n"
    . "İsterseniz aşağıdaki iletişim formundan adınızı ve telefonunuzu bırakın; satış ekibimiz sizi arayabilir.";

jsonResponse([
    'reply' => $reply,
    'show_contact_form' => true,
]);
