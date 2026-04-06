<?php
require_once __DIR__ . '/config.php';
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['token' => createCsrfToken()]);
