<?php
require_once dirname(__DIR__) . '/config.php';
requireCsrf();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    jsonError('Dosya seçin.');
}

$type = trim($_POST['type'] ?? $_GET['type'] ?? 'logo');
$file = $_FILES['file'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'], true)) {
    $ext = 'png';
}

if ($type === 'logo') {
    $destPath = IMAGES_DIR . '/logo.png';
    $info = @getimagesize($file['tmp_name']);
    if ($info && in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_GIF, IMAGETYPE_WEBP], true)) {
        $src = null;
        switch ($info[2]) {
            case IMAGETYPE_JPEG: $src = @imagecreatefromjpeg($file['tmp_name']); break;
            case IMAGETYPE_PNG:  $src = @imagecreatefrompng($file['tmp_name']); break;
            case IMAGETYPE_GIF:  $src = @imagecreatefromgif($file['tmp_name']); break;
            case IMAGETYPE_WEBP: $src = function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($file['tmp_name']) : null; break;
        }
        if ($src && imagepng($src, $destPath, 8)) {
            imagedestroy($src);
            jsonResponse(['url' => 'images/logo.png']);
        }
    }
    if (!empty($src)) imagedestroy($src);
    if (move_uploaded_file($file['tmp_name'], $destPath)) {
        jsonResponse(['url' => 'images/logo.png']);
    }
    jsonError('Logo kaydedilemedi.', 500);
}

$destName = 'site-' . $type . '.' . $ext;
$destPath = IMAGES_DIR . '/' . $destName;
if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    jsonError('Kayıt yapılamadı.', 500);
}
jsonResponse(['url' => 'images/' . $destName]);
