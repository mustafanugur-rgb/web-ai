/**
 * Tüm HTML dosyalarında canonical URL ve index'teki schema url'yi
 * verilen domain ile günceller. Web'e atmadan önce çalıştırın.
 * E-posta adresleri (mustafa@dinamikpos.com) değiştirilmez.
 *
 * Kullanım: node scripts/set-canonical.js https://www.dinamikpos.com.tr
 */

const fs = require('fs');
const path = require('path');

const newBase = process.argv[2];
if (!newBase || !newBase.startsWith('http')) {
  console.log('Kullanım: node scripts/set-canonical.js https://siteniz.com');
  process.exit(1);
}

const baseUrl = newBase.replace(/\/$/, ''); // sondaki / kaldır

// Proje kökü: script'in bir üst klasörü
const rootDir = path.join(__dirname, '..');

/** Kök ve bir alt klasörlerdeki tüm .html dosyalarını bul (node_modules hariç) */
function findHtmlFiles(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      findHtmlFiles(full, list);
    } else if (e.name.endsWith('.html')) {
      list.push(full);
    }
  }
  return list;
}

const htmlFiles = findHtmlFiles(rootDir);
console.log('Taranan klasör:', rootDir);
console.log('Bulunan HTML dosyası:', htmlFiles.length);
if (htmlFiles.length === 0) {
  console.log('Uyarı: Hiç HTML dosyası bulunamadı. Proje kökünde veya alt klasörlerde .html dosyaları var mı?');
  process.exit(1);
}

// Eski domain / placeholder varyantları (sadece URL olarak geçenleri değiştiriyoruz; @ içeren e-postalara dokunmuyoruz)
const oldPatterns = [
  'https://www.dinamikpos.com',
  'https://dinamikpos.com',
  'https://SIZIN-DOMAIN.com'  // WEB_ATMA rehberindeki placeholder
];

let updated = 0;
htmlFiles.forEach((filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  const before = content;
  for (const oldBase of oldPatterns) {
    // Sadece "https://..." şeklinde geçen URL'leri değiştir (href="...", "url": "...")
    // Böylece mustafa@dinamikpos.com gibi e-postalar değişmez
    const regex = new RegExp(oldBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\/[^"\'\\s]*)?', 'g');
    content = content.replace(regex, function (match, pathPart) {
      return baseUrl + (pathPart || '');
    });
  }
  if (content !== before) {
    fs.writeFileSync(filePath, content);
    updated++;
    console.log('Güncellendi:', path.relative(rootDir, filePath));
  }
});

console.log(updated ? `\nToplam ${updated} dosya güncellendi.` : '\nDeğişiklik yapılmadı (dosyalarda eski domain URL’si yok veya zaten hedef domain yazıyor).');
console.log('Hedef canonical/schema URL:', baseUrl);
