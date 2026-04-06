<?php
require_once dirname(__DIR__) . '/config.php';
requireCsrf();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$dir = IMAGES_DIR . '/urunler';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    jsonError('Görsel dosyası seçin.');
}

$file = $_FILES['image'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['png', 'jpg', 'jpeg', 'gif', 'webp'], true)) {
    $ext = 'jpg';
}
$filename = 'urun-' . (string)(time() * 1000) . '.' . $ext;
$path = $dir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $path)) {
    jsonError('Dosya yüklenemedi.', 500);
}

$size = 600;
$info = getimagesize($path);
if ($info && in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_GIF, IMAGETYPE_WEBP], true)) {
    $w = (int)$info[0];
    $h = (int)$info[1];
    $src = null;
    switch ($info[2]) {
        case IMAGETYPE_JPEG:
            $src = @imagecreatefromjpeg($path);
            break;
        case IMAGETYPE_PNG:
            $src = @imagecreatefrompng($path);
            break;
        case IMAGETYPE_GIF:
            $src = @imagecreatefromgif($path);
            break;
        case IMAGETYPE_WEBP:
            $src = function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : null;
            break;
    }
    if ($src) {
        $dst = imagecreatetruecolor($size, $size);
        if ($dst) {
            imagecopyresampled($dst, $src, 0, 0, 0, 0, $size, $size, $w, $h);
            imagedestroy($src);
            $ok = false;
            if ($ext === 'jpg' || $ext === 'jpeg') {
                $ok = imagejpeg($dst, $path, 90);
            } elseif ($ext === 'png') {
                $ok = imagepng($dst, $path, 8);
            } elseif ($ext === 'gif') {
                $ok = imagegif($dst, $path);
            }
            }
            imagedestroy($dst);
        } else {
            imagedestroy($src);
        }
    }
}

$filename = basename($path);
jsonResponse(['url' => 'images/urunler/' . $filename]);
