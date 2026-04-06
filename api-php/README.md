# Dinamik POS – PHP API

Bu klasör, Node.js sunucusu olmayan hostinglerde (örn. Güzel Hosting) ödeme ve yükleme özelliklerinin çalışması için kullanılır. **Node sürümü (server/) olduğu gibi kalır;** canlıda PHP kullanmak istediğinizde sadece bu klasörü yüklersiniz.

## Kurulum

1. **Sunucuda** site dosyalarınızı (HTML, css, js, images) her zamanki gibi `public_html` (veya ana web klasörü) içine yükleyin.
2. **Bu klasörün içeriğini** `public_html/api/` olarak yükleyin.  
   Yani: `api-php` içindeki tüm dosya ve klasörler (`config.php`, `csrf-token.php`, `paytr/`, `settings/`, `upload/`, `.htaccess`, vb.) `public_html/api/` içinde olsun.
3. **PayTR config** için `public_html/data/` klasörü yazılabilir olmalı. İlk kez Ayarlar sayfasından PayTR bilgilerini kaydettiğinizde `data/paytr-config.json` oluşturulur. Gerekirse FTP ile `data` klasörünü oluşturup yazma izni (chmod 755 veya 775) verin.
4. **BASE_URL**: PayTR yönlendirmeleri için. Sunucuda `BASE_URL` ortam değişkeni tanımlı değilse, PHP otomatik olarak `https://siteniz.com` benzeri adresi kullanır. Gerekirse hosting panelinden veya `config.php` / `.user.ini` ile ayarlayın.

## Gerekli PHP ayarları

- **PHP 7.4+** (tercihen 8.x)
- **GD** (ürün görseli 600×600 resize için)
- **curl** (PayTR token isteği için)
- **json**, **mbstring** (standart)

## Satış sohbeti (AI olmadan)

Paylaşımlı hostingte Python/Node yoksa tarayıcı `Unexpected token '<'` hatası vermesin diye şu uçlar eklenmiştir:

- `POST /api/dinamik-sales/chat` — JSON yanıt (`reply`, `show_contact_form`); WhatsApp yönlendirmesi + iletişim formu önerisi.
- `POST /api/dinamik-sales/lead` — iletişim satırlarını `data/sales-chat-leads.json` dosyasına ekler.

Tam AI yanıtı için yerelde `npm start` + `sales-agent-api` veya `config.js` içinde `DINAMIKPOS_SALES_AGENT_API` ile harici API kullanın.

## URL’ler (Node ile aynı)

- `GET /api/csrf-token` – CSRF jetonu
- `POST /api/paytr/token` – Ödeme iframe token
- `POST /api/paytr/callback` – PayTR bildirim (CSRF yok)
- `POST /api/settings/paytr` – PayTR ayarlarını kaydet
- `POST /api/upload/partner-logo` – Çözüm ortağı/referans logosu
- `POST /api/upload/product-image` – Ürün görseli (600×600)
- `POST /api/upload/site-image` – Site logosu / kapak görseli
- `POST /api/acil-destek` – Acil destek formu (mail)

Frontend (checkout, ayarlar, ortaklar, ürünler) aynı kalır; istekler `/api/...` adresine gider. Sunucuda bu klasör `public_html/api/` içinde olduğu sürece PHP ile cevap verir.

## Node ile fark

- Yerelde `npm start` ile **Node** kullanmaya devam edebilirsiniz.
- Canlıda sadece **PHP** kullanacaksanız bu klasörü `public_html/api/` yapın; Node dosyalarını sunucuya atmanız gerekmez.
