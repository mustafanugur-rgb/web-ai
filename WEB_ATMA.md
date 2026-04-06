# Dinamik POS — Web'e Atma Rehberi

Siteyi canlıya almak için adım adım yapılacaklar. Ürün girerken gördüğünüz eksikleri aşağıdaki bölüme not alıp sonra tamamlayabilirsiniz.

---

## 1. Web'e atmadan önce (bir kez)

### 1.1 Domain ve canonical URL
- Kendi domain'inizi kullanacaksınız (örn. `https://sitem.com`).
- Tüm sayfalardaki **canonical URL** ve Schema.org **url** alanını bu domain ile değiştirin.
- **Kolay yol:** Proje klasöründe (sonunda `/` olmadan domain yazın):
  ```bash
  node scripts/set-canonical.js https://SIZIN-DOMAIN.com
  ```
  veya: `npm run set-domain -- https://SIZIN-DOMAIN.com`  
  Script tüm HTML’deki canonical ve schema URL’leri günceller.

### 1.2 Ortam değişkenleri (.env)
Sunucuda (veya hosting panelinde) aşağıdakileri ayarlayın. `.env.example` dosyasını kopyalayıp `.env` yapın ve değerleri doldurun:

| Değişken | Açıklama |
|----------|----------|
| `BASE_URL` | Sitenizin tam adresi (örn. https://sitem.com) |
| `PAYTR_MERCHANT_ID` | PayTR panelinden |
| `PAYTR_MERCHANT_KEY` | PayTR panelinden |
| `PAYTR_MERCHANT_SALT` | PayTR panelinden |
| `PAYTR_TEST_MODE` | Test: 1, Canlı ödeme: 0 |
| `CSRF_SECRET` | Uzun, rastgele bir metin (güvenlik için) |
| `PORT` | Sunucu portu (varsayılan 3001) |
| `MAIL_HOST`, `MAIL_USER`, `MAIL_PASS` | Acil destek formu mail göndermek için (isteğe bağlı) |

### 1.3 Güvenlik
- [ ] Admin varsayılan şifreyi değiştirin: Panel → **Ayarlar** → Genel Ayarlar → **Admin şifresi** (varsayılan: `admin123`).
- [ ] Canlıya geçince **PayTR** panelinde bildirim URL: `https://SIZIN-DOMAIN.com/api/paytr/callback`
- [ ] SSL (HTTPS) mutlaka açık olsun.

---

## 2. Sunucuya yüklenecek dosyalar

**Node.js + ödeme kullanıyorsanız** (PayTR ile) aşağıdaki yapıyı sunucuya atın. `node_modules` ve `.env` sunucuda **yeniden** oluşturulacak (yükleme listesine dahil etmeyin).

```
pos-website/
├── index.html
├── 404.html
├── admin.html
├── admin-login.html
├── ayarlar.html
├── checkout.html
├── crm.html
├── giris.html
├── hesabim.html
├── kampanyalar.html
├── kayit.html
├── kullanicilar.html
├── odeme-basarili.html
├── odeme-basarisiz.html
├── ortaklar.html
├── sepet.html
├── siparisler.html
├── urunler.html
├── urunler-yonetim.html
├── favicon.svg
├── robots.txt
├── sitemap.xml
├── package.json
├── package-lock.json
├── css/
│   ├── admin.css
│   ├── base.css
│   ├── cart.css
│   ├── checkout.css
│   ├── components.css
│   ├── crm.css
│   ├── index.css
│   ├── nav.css
│   ├── products.css
│   ├── products-admin.css
│   ├── side-partners.css
│   ├── theme-toggle.css
│   └── variables.css
├── js/
│   └── (tüm .js dosyaları)
├── images/
│   ├── logo.png
│   ├── logo.webp          (varsa)
│   ├── sambapos-mockup.png
│   ├── sambapos-mockup.webp (varsa)
│   └── ortaklar/          (çözüm ortağı/referans logoları; panelden yüklenenler burada)
├── server/
│   ├── index.js
│   └── data/               (sunucuda boş klasör oluşturulabilir; PayTR ayarları panelden de kaydedilir)
└── scripts/
    └── set-canonical.js    (isteğe bağlı; domain değiştirmek için)
```

**Yüklemeyin:** `node_modules/`, `.env`, `.git/`, `*.log`

### Sunucuda ilk kurulum (PayTR’li tam kurulum)
```bash
cd pos-website
npm install
# .env dosyasını oluşturup doldurun
npm start
# veya sürekli çalışsın: pm2 start server/index.js --name dinamik-pos
```

Detaylı sunucu adımları için **DEPLOYMENT.md** dosyasına bakın (Nginx, PM2, SSL).

### Canlıda “Ödemeye geç” deyince PayTR açılmıyorsa

FTP ile sadece dosya atmak **yeterli değil**. Ödeme için **Node.js uygulamasının sunucuda çalışıyor olması** gerekir.

1. **Hosting’iniz Node.js destekliyor mu?** (Güzel Hosting vb. panelde “Node.js uygulaması” veya “Uygulama” bölümüne bakın. Yoksa VPS/kurumsal hosting gerekir.)
2. **Sunucuda (SSH veya hosting panelinden):**
   - Proje klasörüne gidin (`public_html` veya atadığınız dizin).
   - `npm install` çalıştırın.
   - `.env` dosyasını oluşturup PayTR ve diğer değişkenleri doldurun.
   - Uygulamayı başlatın: `node server/index.js` veya `pm2 start server/index.js --name dinamik-pos`.
3. **İsteklerin Node’a gitmesi:** Hosting genelde “Node uygulaması” seçeneğinde domain’i bu uygulamaya yönlendirir. Bazen `/api` istekleri aynı sunucudaki Node’a proxy edilir; paneldeki dokümana göre ayarlayın.
4. **Test:** Tarayıcıda `https://siteniz.com/api/csrf-token` adresini açın. JSON (`{"token":"..."}`) dönüyorsa API çalışıyordur; sonra ödemeye geçmeyi tekrar deneyin.

---

## 3. Sadece statik yükleme (ödeme yok)

Ödeme ve form mail’i kullanmayacaksanız sadece HTML/CSS/JS/images’ı FTP veya Netlify/Vercel ile yükleyebilirsiniz. Bu durumda checkout ödeme almayacak; diğer sayfalar çalışır. Bkz. DEPLOYMENT.md “Seçenek 1”.

---

## 4. Ürün girerken — Eksikler listesi

Ürünleri panelden girerken fark ettiğiniz eksikleri buraya not alın; sonra birlikte tamamlarız.

| # | Sayfa / Yer | Eksik / Düzeltme | Durum |
|---|-------------|------------------|--------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

Örnek: “Ürün listesinde stok bilgisi yok”, “Kategori alanı yok”, “Ürün görseli zorunlu olsun” vb.

---

## 5. Yayına aldıktan sonra kontrol

- [ ] Ana sayfa, ürünler, sepet, checkout (test ödemesi) açılıyor mu?
- [ ] Admin panele giriş yapılabiliyor mu? Şifre değiştirildi mi?
- [ ] Ayarlar → PayTR bilgileri kaydediliyor mu?
- [ ] Acil destek formu (mail ayarlıysa) çalışıyor mu?
- [ ] Mobilde menü ve sayfalar düzgün görünüyor mu?

Bu rehberi web'e attıktan sonra ürün girmeye başlayabilirsiniz; eksikleri gördükçe listeye yazıp devam edelim.
