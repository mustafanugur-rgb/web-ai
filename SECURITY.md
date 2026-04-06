# Dinamik POS - Güvenlik Rehberi

## Form Koruması

### Input Sanitization (form-security.js)

- `sanitize()`: HTML/script etiketlerini kaldırır
- `sanitizePhone()`: Sadece rakam
- `sanitizeEmail()`: Tehlikeli karakterleri temizler

### Client-Side Validation

- Email format kontrolü
- Telefon minimum 10 karakter
- Ad soyad minimum 2 karakter

### Backend'de Yapılması Gerekenler

1. **CSRF Token**: Her form POST'ta token doğrulaması
2. **Rate Limiting**: Demo formu için dakikada max 3 istek
3. **Input Validation**: Server-side tekrar doğrulama
4. **SQL Injection**: Parametreli sorgular kullanın
5. **XSS**: Output encoding (HTML entity encode)

## Kimlik Doğrulama (Auth)

### Önerilen Yapı

- **JWT** veya **session cookie** (HttpOnly, Secure)
- Admin/CRM sayfaları: Auth middleware ile koruma
- Şifre: bcrypt/argon2 ile hash

### Örnek Auth Middleware (Express)

```javascript
function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.redirect('/login');
  }
  next();
}
```

## HTTPS

- Production'da mutlaka HTTPS
- HSTS header ekleyin
- Mixed content (HTTP kaynak) kullanmayın

## Güvenlik Başlıkları

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' fonts.googleapis.com
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

## Hassas Veriler

- API key'leri backend'de tutun, client'a göndermeyin
- WhatsApp numarası: Environment variable
- Ödeme bilgileri: PCI DSS uyumlu sağlayıcı kullanın
