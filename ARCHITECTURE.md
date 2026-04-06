# Dinamik POS - Mimari ve Ölçeklenebilirlik Rehberi

## Mevcut Klasör Yapısı

```
pos-website/
├── index.html          # Ana marka & landing sayfası
├── admin.html          # Admin dashboard
├── crm.html            # CRM & müşteri yönetimi
├── css/
│   ├── variables.css   # Design tokens (renkler, tipografi, spacing)
│   ├── base.css        # Reset, typography, utilities
│   ├── components.css  # Reusable: btn, card, input, badge
│   ├── index.css       # İndex sayfasına özel stiller
│   ├── admin.css       # Admin layout & widgets
│   └── crm.css         # CRM sayfasına özel stiller
├── js/
│   ├── calculator.js   # Gelir hesaplayıcı
│   ├── sticky-cta.js   # Mobil yapışkan CTA
│   ├── form-security.js # Form sanitization
│   ├── admin-simulate.js # Admin state simülasyonu
│   └── crm-simulate.js   # CRM state simülasyonu
├── robots.txt
├── sitemap.xml
└── ARCHITECTURE.md
```

## Önerilen Ölçeklenebilir Yapı (Gelecek)

```
pos-website/
├── public/
│   ├── index.html
│   ├── admin.html
│   ├── crm.html
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── components/     # Reusable UI bileşenleri
│   │   ├── Button/
│   │   ├── Card/
│   │   ├── StatCard/
│   │   └── DataTable/
│   ├── sections/      # Sayfa bölümleri
│   │   ├── Hero/
│   │   ├── ProblemSection/
│   │   ├── Calculator/
│   │   └── ...
│   ├── pages/
│   │   ├── Index/
│   │   ├── Admin/
│   │   └── CRM/
│   ├── hooks/         # Custom hooks
│   ├── utils/         # Sanitize, formatCurrency
│   └── api/           # API client
├── styles/
│   ├── variables.css
│   ├── base.css
│   └── components.css
└── package.json
```

## Backend Entegrasyonu İçin Hazırlık

### API Endpoints (Önerilen)

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/auth/login` | POST | Giriş |
| `/api/auth/logout` | POST | Çıkış |
| `/api/demo` | POST | Demo talebi |
| `/api/dashboard/stats` | GET | Dashboard istatistikleri |
| `/api/orders` | GET | Sipariş listesi |
| `/api/customers` | GET | Müşteri listesi |
| `/api/customers/search` | GET | Müşteri arama |
| `/api/campaigns` | GET | Kampanya listesi |

### CSRF Koruması

Form gönderimlerinde `csrf_token` hidden input kullanın. Backend'den token alın:

```javascript
// Örnek: Sayfa yüklendiğinde token al
fetch('/api/csrf-token')
  .then(r => r.json())
  .then(data => {
    document.getElementById('csrf_token').value = data.token;
  });
```

### Ödeme Entegrasyonu (Önerilen)

- **Parasut** veya **iyzico** - Türkiye odaklı
- **Stripe** - Uluslararası
- Abonelik modeli: Aylık planlar için recurring billing

### Abonelik Modeli

- **Starter**: Temel POS + Adisyon
- **Growth**: + CRM + WhatsApp
- **Enterprise**: + Marketplace + Özel entegrasyonlar

## Performans

- [x] Görseller: WebP format (picture/source), lazy loading, width/height, decoding=async
- [x] CSS: Kritik olmayan (sayfa özel) CSS async (media="print" onload)
- [x] JS: Defer non-critical scripts
- [x] Font: `font-display: swap` (Plus Jakarta Sans)

## SEO Checklist

- [x] Meta description
- [x] Open Graph tags
- [x] Schema.org SoftwareApplication
- [x] Semantic HTML (section, article, nav)
- [x] robots.txt
- [x] sitemap.xml
- [x] Canonical URL (production'da BASE_URL ile güncellenir)
