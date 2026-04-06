<?php
require_once dirname(__DIR__) . '/config.php';
requireCsrf();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$dir = IMAGES_DIR . '/ortaklar';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

if (empty($_FILES['logo']) || $_FILES['logo']['error'] !== UPLOAD_ERR_OK) {
    jsonError('Logo dosyası seçin.');
}

$file = $_FILES['logo'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$ext = preg_replace('/[^a-z0-9.]/', '', $ext);
if (!in_array($ext, ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'], true)) {
    $ext = 'png';
}
$filename = 'ortak-' . (string)(time() * 1000) . '.' . $ext;
$path = $dir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $path)) {
    jsonError('Dosya yüklenemedi.', 500);
}

jsonResponse(['url' => 'images/ortaklar/' . $filename]);
