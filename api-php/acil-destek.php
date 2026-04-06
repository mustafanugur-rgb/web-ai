<?php
require_once __DIR__ . '/config.php';
requireCsrf();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input') ?: '{}', true) ?: [];
$problem = trim($input['problem'] ?? '');
$name = trim($input['name'] ?? '');
$phone = trim($input['phone'] ?? '');
$email = trim($input['email'] ?? '');

if (strlen($problem) < 10) {
    jsonError('Sorun alanı en az 10 karakter olmalı.');
}
if (strlen($name) < 2) {
    jsonError('Ad soyad gerekli.');
}
if ($phone === '') {
    jsonError('Telefon gerekli.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError('Geçerli e-posta gerekli.');
}

$to = 'mustafa@dinamikpos.com';
$subject = 'SambaPOS Acil Destek - ' . mb_substr($name, 0, 50);
$body = "SambaPOS Acil Destek talebi\n--------------------------------\n";
$body .= "Ad Soyad: $name\nTelefon: $phone\nE-posta: $email\n";
$body .= "Tarih: " . date('d.m.Y H:i') . "\n\nSorun:\n$problem\n";
$headers = "From: " . (getenv('MAIL_FROM') ?: 'noreply@dinamikpos.com') . "\r\n";
$headers .= "Reply-To: $email\r\nContent-Type: text/plain; charset=utf-8\r\n";

if (@mail($to, $subject, $body, $headers)) {
    jsonResponse(['ok' => true, 'message' => 'Talebiniz alındı. En kısa sürede dönüş yapacağız.']);
}
jsonError('E-posta gönderilemedi. Lütfen tekrar deneyin veya WhatsApp ile iletin.', 500);
