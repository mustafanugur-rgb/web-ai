# PayTR Entegrasyonu Kurulum Rehberi

## 1. PayTR Mağaza Bilgileri

PayTR panelinden (https://www.paytr.com) **BİLGİ** sayfasından alın:
- `merchant_id` (Mağaza No)
- `merchant_key` (Mağaza Parolası)
- `merchant_salt` (Mağaza Gizli Anahtarı)

## 2. Ortam Değişkenleri

`.env` dosyası oluşturun veya sunucuda ayarlayın:

```
PAYTR_MERCHANT_ID=123456
PAYTR_MERCHANT_KEY=xxxxxxxxxxxxxx
PAYTR_MERCHANT_SALT=xxxxxxxxxxxxxx
PAYTR_TEST_MODE=1
BASE_URL=https://yourdomain.com
```

- **PAYTR_TEST_MODE=1**: Test modu (canlı ödeme almaz)
- **PAYTR_TEST_MODE=0**: Canlı mod
- **BASE_URL**: Sitenizin tam adresi (başarı/hata yönlendirmeleri için)

## 3. PayTR Panel Ayarları

PayTR mağaza panelinde:

1. **Bildirim URL**: `https://yourdomain.com/api/paytr/callback`
2. **Bildirim metod**: POST

## 4. Sunucuyu Çalıştırma

```bash
cd pos-website
npm install
npm start
```

Varsayılan port: 3001. Değiştirmek için:
```
PORT=8080 npm start
```

## 5. Ödeme Akışı

1. Kullanıcı checkout sayfasında iletişim bilgilerini girer
2. "Ödemeye Geç" tıklanır → API'den PayTR token alınır
3. PayTR iframe açılır, kullanıcı kart bilgilerini girer
4. Ödeme sonrası:
   - Başarılı → `/odeme-basarili.html`
   - Başarısız → `/odeme-basarisiz.html`
5. PayTR ayrıca `/api/paytr/callback` adresine POST ile sonucu bildirir (sipariş onay/iptal burada yapılmalı)

## 6. Localhost Test

Localhost'ta test için:
- `BASE_URL=http://localhost:3001` kullanın
- PayTR bildirim URL'si localhost kabul etmeyebilir; canlı test için ngrok kullanın
