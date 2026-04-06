<?php
/**
 * Yedek sitemap: XML sunucuda bozuksa bu dosyayi kullanin.
 * robots.txt: Sitemap: https://www.dinamikpos.com.tr/sitemap.php
 */
header('Content-Type: application/xml; charset=UTF-8');
header('Cache-Control: no-cache, must-revalidate');
readfile(__DIR__ . '/sitemap-seo.xml');
