# Dinamik POS - Site Yükleme ve Yayına Alma Rehberi

## İlk Giriş
- **Admin varsayılan şifre:** `admin123`
- **Admin panel:** Ayarlar → Genel Ayarlar'dan şifreyi ve WhatsApp numarasını değiştirebilirsiniz.

## Seçenek 1: Sadece Statik Site (Ödeme Olmadan)

Eğer ödeme (PayTR) özelliği şimdilik gerekmiyorsa, sadece HTML/CSS/JS dosyalarını yükleyebilirsiniz.

### Yüklenecek Dosyalar
```
pos-website/
├── index.html, urunler.html, sepet.html, checkout.html
├── admin.html, crm.html, urunler-yonetim.html
├── siparisler.html, kampanyalar.html, ayarlar.html
├── odeme-basarili.html, odeme-basarisiz.html
├── css/          (tüm .css dosyaları)
├── js/           (tüm .js dosyaları)
├── images/       (logo.png, sambapos-mockup.png vb.)
├── favicon.svg
├── robots.txt
└── sitemap.xml
```

### Hosting Seçenekleri
- **Netlify**: Dosyaları sürükle-bırak veya GitHub bağlayıp otomatik deploy
- **Vercel**: Benzer şekilde ücretsiz statik hosting
- **GitHub Pages**: Repo'yu push edip Pages açın
- **cPanel / FTP**: `public_html` veya `www` klasörüne yükleyin
- **Turhost, Natro vb.**: FTP ile dosyaları yükleyin

---

## Seçenek 2: Tam Kurulum (PayTR Ödemeli)

Ödeme almak istiyorsanız Node.js sunucusu gerekir.

### Adım 1: Sunucu Hazırlığı
- **VPS** (DigitalOcean, Linode, Hetzner, Turhost VPS vb.) veya
- **PaaS** (Railway, Render, Fly.io – Node.js destekleyen)

### Adım 2: Projeyi Yükleme
```bash
# Sunucuya SSH ile bağlanın
cd /var/www   # veya uygun dizin
git clone <repo-url> dinamik-pos
cd dinamik-pos/pos-website
```

### Adım 3: Bağımlılıkları Yükleme
```bash
npm install
```

### Adım 4: Ortam Değişkenleri
`.env` dosyası oluşturun:
```
PAYTR_MERCHANT_ID=123456
PAYTR_MERCHANT_KEY=xxxxxxxxxxxxxx
PAYTR_MERCHANT_SALT=xxxxxxxxxxxxxx
PAYTR_TEST_MODE=1
BASE_URL=https://siteniz.com
CSRF_SECRET=rastgele-guvenli-bir-deger
PORT=3001
```
- **Canonical URL:** Tüm HTML sayfalarında `https://dinamikpos.com` kullanılıyor. Canlı sitede kendi domain'inize göre bu adresi değiştirin veya build sırasında `BASE_URL` ile değiştiren bir adım ekleyin.
- **CSRF:** Formlar ve API istekleri için `/api/csrf-token` kullanılır; production'da `CSRF_SECRET` mutlaka benzersiz ve güçlü bir değer olmalıdır.

### Adım 5: Çalıştırma
```bash
npm start
```

### Adım 6: Sürekli Çalışma (PM2)
```bash
npm install -g pm2
pm2 start server/index.js --name dinamik-pos
pm2 save
pm2 startup
```

### Adım 7: Nginx Reverse Proxy (Önerilen)
Domain'i 80/443 portuna yönlendirmek için:
```nginx
server {
    listen 80;
    server_name siteniz.com;
    root /var/www/dinamik-pos/pos-website;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Adım 8: SSL (HTTPS)
Let's Encrypt ile ücretsiz SSL:
```bash
sudo certbot --nginx -d siteniz.com
```

---

## Önemli Notlar

1. **API_BASE**: Checkout sayfası API'yi aynı domain'den çağırır. Nginx ile proxy kullanıyorsanız `API_BASE` boş bırakılabilir. API farklı sunucudaysa `checkout.html` içinde:
   ```html
   <script>window.API_BASE='https://api.siteniz.com';</script>
   ```

2. **PayTR Bildirim URL**: PayTR panelinde `https://siteniz.com/api/paytr/callback` olarak ayarlayın.

3. **BASE_URL**: Ödeme sonrası yönlendirme için mutlaka doğru domain yazın.
