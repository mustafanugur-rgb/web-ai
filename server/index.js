/**
 * Dinamik POS - E-ticaret API (PayTR ödeme)
 * Cafe/restoran yazılım ve ekipman satışı; PayTR iFrame token ve bildirim endpoint'leri
 */

const express = require('express');
const crypto = require('crypto');
const https = require('https');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3001;

const PAYTR_CONFIG_PATH = path.join(__dirname, 'data', 'paytr-config.json');
const SEO_CONFIG_PATH = path.join(__dirname, 'data', 'seo-config.json');
const LEADS_PATH = path.join(__dirname, 'data', 'leads.json');
const ACIL_DESTEK_LOG_PATH = path.join(__dirname, 'data', 'acil-destek-requests.json');
const SALES_AGENT_ROOT = path.join(__dirname, '..', 'sales-agent-api');

let salesAgentChild = null;

/** .venv varsa uvicorn’u Node ile birlikte başlat (ayrı terminal gerekmez). START_SALES_AGENT=0 ile kapatın. */
function startBundledSalesAgent() {
  if (process.env.START_SALES_AGENT === '0') {
    console.log('Satış asistanı: START_SALES_AGENT=0 — otomatik başlatma kapalı.');
    return;
  }
  const isWin = process.platform === 'win32';
  const venvPy = isWin
    ? path.join(SALES_AGENT_ROOT, '.venv', 'Scripts', 'python.exe')
    : path.join(SALES_AGENT_ROOT, '.venv', 'bin', 'python');
  if (!fs.existsSync(venvPy)) {
    console.log(
      'Satış asistanı: sales-agent-api/.venv yok — kurulum: sales-agent-api\\setup-venv.bat veya: py -3 -m venv .venv && pip install -r requirements.txt'
    );
    return;
  }
  const args = ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'];
  try {
    salesAgentChild = spawn(venvPy, args, {
      cwd: SALES_AGENT_ROOT,
      stdio: 'inherit',
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });
    salesAgentChild.on('error', function (err) {
      console.error('Satış asistanı başlatılamadı:', err.message);
    });
    salesAgentChild.on('exit', function (code, signal) {
      if (code && code !== 0 && signal !== 'SIGTERM') {
        console.warn('Satış asistanı süreci çıktı, kod:', code);
      }
      salesAgentChild = null;
    });
    console.log('Satış asistanı API başlatıldı (http://127.0.0.1:8000) — sales-agent-api');
  } catch (e) {
    console.error('Satış asistanı spawn:', e);
  }
}

function stopBundledSalesAgent() {
  if (salesAgentChild && !salesAgentChild.killed) {
    try {
      salesAgentChild.kill(process.platform === 'win32' ? undefined : 'SIGTERM');
    } catch (e) {}
  }
}

process.on('SIGINT', function () {
  stopBundledSalesAgent();
  process.exit(0);
});
process.on('SIGTERM', stopBundledSalesAgent);

/** PayTR bilgileri: önce admin panelinden kaydedilen dosya, yoksa .env */
function getPaytrConfig() {
  try {
    if (fs.existsSync(PAYTR_CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(PAYTR_CONFIG_PATH, 'utf8'));
      const id = (data.merchant_id || '').trim();
      const key = (data.merchant_key || '').trim();
      const salt = (data.merchant_salt || '').trim();
      if (id && key && salt) return { merchant_id: id, merchant_key: key, merchant_salt: salt };
    }
  } catch (e) {}
  return {
    merchant_id: process.env.PAYTR_MERCHANT_ID || 'XXXXXX',
    merchant_key: process.env.PAYTR_MERCHANT_KEY || 'YYYYYYYYYYYYYY',
    merchant_salt: process.env.PAYTR_MERCHANT_SALT || 'ZZZZZZZZZZZZZZ'
  };
}

function getPaytrToken(params, merchantKey, merchantSalt) {
  const key = merchantKey || process.env.PAYTR_MERCHANT_KEY;
  const salt = merchantSalt || process.env.PAYTR_MERCHANT_SALT;
  const hashStr =
    params.merchant_id +
    params.user_ip +
    params.merchant_oid +
    params.email +
    params.payment_amount +
    params.user_basket +
    params.no_installment +
    params.max_installment +
    params.currency +
    params.test_mode;
  return crypto.createHmac('sha256', key).update(hashStr + salt).digest('base64');
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/** Genel güvenlik başlıkları (statik + API) */
app.use(function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

/** CSRF: signed token (body veya X-CSRF-TOKEN header), /api/paytr/callback hariç POST/PUT/DELETE/PATCH için zorunlu */
const CSRF_SECRET = process.env.CSRF_SECRET || 'dinamik-pos-csrf-secret-change-in-production';
const CSRF_MAX_AGE_MS = 60 * 60 * 1000; // 1 saat

function createCsrfToken() {
  const payload = { iat: Date.now(), rnd: crypto.randomBytes(16).toString('hex') };
  const payloadStr = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', CSRF_SECRET).update(payloadStr).digest('hex');
  return Buffer.from(payloadStr).toString('base64url') + '.' + signature;
}

function verifyCsrfToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payloadStr = JSON.stringify({ iat: payload.iat, rnd: payload.rnd });
    const expected = crypto.createHmac('sha256', CSRF_SECRET).update(payloadStr).digest('hex');
    if (expected !== parts[1]) return false;
    if (Date.now() - payload.iat > CSRF_MAX_AGE_MS) return false;
    return true;
  } catch (e) {
    return false;
  }
}

app.get('/api/csrf-token', (req, res) => {
  res.json({ token: createCsrfToken() });
});

/** AI satış asistanı — CSRF'den ÖNCE (widget JSON'da csrf_token göndermez) */
const SALES_AGENT_URL = (process.env.SALES_AGENT_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

async function proxyToSalesAgent(req, res, agentPath) {
  const url = SALES_AGENT_URL + agentPath;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(req.body && typeof req.body === 'object' ? req.body : {})
    });
    const text = await r.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      return res.status(502).json({ detail: 'Satış asistanı geçersiz yanıt döndü.' });
    }
    res.status(r.status).json(data);
  } catch (err) {
    console.error('SALES_AGENT proxy', agentPath, err.message);
    res.status(503).json({
      detail:
        'Satış asistanına bağlanılamadı. Birkaç saniye bekleyip yenileyin; olmazsa sales-agent-api/setup-venv.bat çalıştırın ve OPENAI_API_KEY ekleyin (.env).'
    });
  }
}

app.post('/api/dinamik-sales/chat', (req, res) => {
  proxyToSalesAgent(req, res, '/chat');
});
app.post('/api/dinamik-sales/lead', (req, res) => {
  proxyToSalesAgent(req, res, '/lead');
});

function csrfGuard(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const pathLower = ((req.originalUrl || req.path || '').split('?')[0] || '').toLowerCase();
  if (pathLower === '/api/paytr/callback') return next(); // PayTR sunucudan POST eder
  const token = req.body?.csrf_token || req.headers['x-csrf-token'];
  if (!verifyCsrfToken(token)) {
    return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş güvenlik jetonu. Sayfayı yenileyip tekrar deneyin.' });
  }
  next();
}

app.use('/api', csrfGuard);

// SEO sitemaps/robots dinamik olarak servis et (hostingde XML konusunda engel/bug varsa statik dosya yerine Node'dan dönsün)
app.get('/sitemap.xml', (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'sitemap.xml');
    if (!fs.existsSync(filePath)) return res.status(404).send('sitemap.xml not found');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.sendFile(filePath);
  } catch (err) {
    console.error('sitemap.xml serve error:', err);
    return res.status(500).send('Internal Server Error');
  }
});

app.get('/sitemap-seo.xml', (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'sitemap-seo.xml');
    if (!fs.existsSync(filePath)) return res.status(404).send('sitemap-seo.xml not found');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.sendFile(filePath);
  } catch (err) {
    console.error('sitemap-seo.xml serve error:', err);
    return res.status(500).send('Internal Server Error');
  }
});

// Google duz metin sitemap (satir basina bir URL)
app.get('/sitemap-urls.txt', (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'sitemap-urls.txt');
    if (!fs.existsSync(filePath)) return res.status(404).send('sitemap-urls.txt not found');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.sendFile(filePath);
  } catch (err) {
    console.error('sitemap-urls.txt serve error:', err);
    return res.status(500).send('Internal Server Error');
  }
});

app.get('/robots.txt', (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'robots.txt');
    if (!fs.existsSync(filePath)) return res.status(404).send('robots.txt not found');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.sendFile(filePath);
  } catch (err) {
    console.error('robots.txt serve error:', err);
    return res.status(500).send('Internal Server Error');
  }
});

/** Çözüm ortağı / referans logosu yükle — resim sitede saklanır (URL yerine) */
const ORTAKLAR_UPLOAD_DIR = path.join(__dirname, '..', 'images', 'ortaklar');
if (!fs.existsSync(ORTAKLAR_UPLOAD_DIR)) {
  try { fs.mkdirSync(ORTAKLAR_UPLOAD_DIR, { recursive: true }); } catch (e) {}
}
const ortaklarStorage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, ORTAKLAR_UPLOAD_DIR); },
  filename: function (req, file, cb) {
    const ext = (path.extname(file.originalname) || '').toLowerCase().replace(/[^a-z0-9.]/g, '') || '.png';
    const safe = /^\.(png|jpg|jpeg|gif|webp|svg)$/.test(ext) ? ext : '.png';
    cb(null, 'ortak-' + Date.now() + safe);
  }
});
const uploadOrtak = multer({ storage: ortaklarStorage, limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB

app.post('/api/upload/partner-logo', uploadOrtak.single('logo'), function (req, res) {
  if (!req.file || !req.file.filename) {
    return res.status(400).json({ error: 'Logo dosyası seçin.' });
  }
  const url = 'images/ortaklar/' + req.file.filename;
  res.json({ url: url });
});

/** Ürün görseli yükle — tek ölçü (600×600), sitede saklanır (referanslar gibi) */
const URUNLER_UPLOAD_DIR = path.join(__dirname, '..', 'images', 'urunler');
const PRODUCT_IMAGE_SIZE = 600;
if (!fs.existsSync(URUNLER_UPLOAD_DIR)) {
  try { fs.mkdirSync(URUNLER_UPLOAD_DIR, { recursive: true }); } catch (e) {}
}
const urunlerStorage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, URUNLER_UPLOAD_DIR); },
  filename: function (req, file, cb) {
    const ext = (path.extname(file.originalname) || '').toLowerCase().replace(/[^a-z0-9.]/g, '') || '.jpg';
    const safe = /^\.(png|jpg|jpeg|gif|webp)$/.test(ext) ? ext : '.jpg';
    cb(null, 'urun-' + Date.now() + safe);
  }
});
const uploadUrun = multer({ storage: urunlerStorage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

app.post('/api/upload/product-image', uploadUrun.single('image'), function (req, res) {
  if (!req.file || !req.file.path) {
    return res.status(400).json({ error: 'Görsel dosyası seçin.' });
  }
  const srcPath = req.file.path;
  sharp(srcPath)
    .resize(PRODUCT_IMAGE_SIZE, PRODUCT_IMAGE_SIZE, { fit: 'cover', position: 'center' })
    .toFile(srcPath + '.tmp', function (err) {
      if (err) {
        try { fs.unlinkSync(srcPath); } catch (e) {}
        return res.status(500).json({ error: 'Görsel işlenemedi.' });
      }
      try {
        fs.renameSync(srcPath + '.tmp', srcPath);
      } catch (e) {
        try { fs.unlinkSync(srcPath); } catch (e2) {}
        return res.status(500).json({ error: 'Kayıt yapılamadı.' });
      }
      const url = 'images/urunler/' + req.file.filename;
      res.json({ url: url });
    });
});

/** Site logosu / site görseli yükle — sitede saklanır (images/logo.png vb.) */
const IMAGES_DIR = path.join(__dirname, '..', 'images');
const uploadSite = multer({ dest: path.join(IMAGES_DIR, '_tmp'), limits: { fileSize: 2 * 1024 * 1024 } });
if (!fs.existsSync(path.join(IMAGES_DIR, '_tmp'))) {
  try { fs.mkdirSync(path.join(IMAGES_DIR, '_tmp'), { recursive: true }); } catch (e) {}
}

app.post('/api/upload/site-image', uploadSite.single('file'), function (req, res) {
  if (!req.file || !req.file.path) {
    return res.status(400).json({ error: 'Dosya seçin.' });
  }
  const type = (req.body && req.body.type) || (req.query && req.query.type) || 'logo';
  const ext = (path.extname(req.file.originalname) || '').toLowerCase() || '.png';
  const safeExt = /^\.(png|jpg|jpeg|gif|webp|svg)$/.test(ext) ? ext : '.png';
  const destName = type === 'logo' ? 'logo.png' : 'site-' + type + safeExt;
  const destPath = path.join(IMAGES_DIR, destName);
  function cleanup() { try { fs.unlinkSync(req.file.path); } catch (e) {} }

  if (type === 'logo') {
    sharp(req.file.path)
      .png()
      .toFile(destPath, function (err) {
        cleanup();
        if (err) return res.status(500).json({ error: 'Logo kaydedilemedi.' });
        res.json({ url: 'images/logo.png' });
      });
  } else {
    try {
      fs.renameSync(req.file.path, destPath);
    } catch (e) {
      cleanup();
      return res.status(500).json({ error: 'Kayıt yapılamadı.' });
    }
    res.json({ url: 'images/' + destName });
  }
});

/** Admin panelinden PayTR bilgilerini kaydet (dosyaya yazar) */
app.post('/api/settings/paytr', (req, res) => {
  try {
    const { merchant_id, merchant_key, merchant_salt } = req.body || {};
    const dir = path.dirname(PAYTR_CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PAYTR_CONFIG_PATH, JSON.stringify({
      merchant_id: (merchant_id || '').trim(),
      merchant_key: (merchant_key || '').trim(),
      merchant_salt: (merchant_salt || '').trim()
    }, null, 2));
    res.json({ ok: true, message: 'PayTR ayarları sunucuya kaydedildi.' });
  } catch (err) {
    console.error('PayTR config save error:', err);
    res.status(500).json({ error: 'Kayıt yapılamadı.' });
  }
});

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function upsertTag(content, regex, replacement, anchorRegex) {
  if (regex.test(content)) {
    return content.replace(regex, replacement);
  }
  if (anchorRegex && anchorRegex.test(content)) {
    return content.replace(anchorRegex, function (m) { return replacement + '\n  ' + m; });
  }
  return content;
}

function escapeHtmlAttr(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function applySeoConfigToHtml(seo) {
  const rootDir = path.join(__dirname, '..');
  const targets = [
    { file: 'index.html', title: seo.seo_home_title, desc: seo.seo_home_description },
    { file: 'urunler.html', title: seo.seo_products_title, desc: seo.seo_products_description },
    { file: 'restoran-pos-sistemi.html' },
    { file: 'cafe-pos-sistemi.html' },
    { file: 'yazarkasa-cozumleri.html' },
    { file: 'barkod-okuyucu-cozumleri.html' },
    { file: 'sambapos-destek-kurulum.html' },
    { file: 'adisyon-yonetimi.html' },
    { file: 'stok-ve-raporlama.html' },
    { file: 'online-siparis-entegrasyonu.html' },
    { file: 'checkout.html' },
    { file: 'sepet.html' },
    { file: 'urun-detay.html' },
    { file: 'giris.html' },
    { file: 'kayit.html' },
    { file: 'hesabim.html' },
    { file: 'kampanyalar.html' },
    { file: 'odeme-basarili.html' },
    { file: 'odeme-basarisiz.html' },
    { file: 'landing-premium.html' },
    { file: 'ortaklar.html' },
    { file: '404.html' }
  ];

  const ogSiteName = escapeHtmlAttr((seo.seo_site_name || '').trim());
  const ogImage = escapeHtmlAttr((seo.seo_og_image || '').trim());
  const globalDesc = (seo.seo_global_description || '').trim();
  let updated = 0;

  targets.forEach(function (t) {
    const filePath = path.join(rootDir, t.file);
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    const before = content;

    const title = escapeHtmlAttr((t.title || '').trim());
    const desc = escapeHtmlAttr((t.desc || globalDesc || '').trim());

    if (title) {
      content = content.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + title + '</title>');
      content = upsertTag(
        content,
        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
        '<meta property="og:title" content="' + title + '">',
        /<meta\s+property="og:type"[^>]*>/i
      );
      content = upsertTag(
        content,
        /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
        '<meta name="twitter:title" content="' + title + '">',
        /<meta\s+name="twitter:card"[^>]*>/i
      );
    }

    if (desc) {
      content = upsertTag(
        content,
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
        '<meta name="description" content="' + desc + '">',
        /<meta\s+name="viewport"[^>]*>/i
      );
      content = upsertTag(
        content,
        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
        '<meta property="og:description" content="' + desc + '">',
        /<meta\s+property="og:title"[^>]*>/i
      );
      content = upsertTag(
        content,
        /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
        '<meta name="twitter:description" content="' + desc + '">',
        /<meta\s+name="twitter:title"[^>]*>/i
      );
    }

    if (ogSiteName) {
      content = upsertTag(
        content,
        /<meta\s+property="og:site_name"\s+content="[^"]*"\s*\/?>/i,
        '<meta property="og:site_name" content="' + ogSiteName + '">',
        /<meta\s+property="og:url"[^>]*>/i
      );
    }

    if (ogImage) {
      content = upsertTag(
        content,
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
        '<meta property="og:image" content="' + ogImage + '">',
        /<meta\s+property="og:url"[^>]*>/i
      );
      content = upsertTag(
        content,
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
        '<meta name="twitter:image" content="' + ogImage + '">',
        /<meta\s+name="twitter:description"[^>]*>/i
      );
    }

    if (content !== before) {
      fs.writeFileSync(filePath, content);
      updated++;
    }
  });

  return updated;
}

app.post('/api/settings/seo', (req, res) => {
  try {
    const body = req.body || {};
    const seo = {
      seo_site_name: (body.seo_site_name || '').trim(),
      seo_global_description: (body.seo_global_description || '').trim(),
      seo_og_image: (body.seo_og_image || '').trim(),
      seo_home_title: (body.seo_home_title || '').trim(),
      seo_home_description: (body.seo_home_description || '').trim(),
      seo_products_title: (body.seo_products_title || '').trim(),
      seo_products_description: (body.seo_products_description || '').trim()
    };
    const dir = path.dirname(SEO_CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SEO_CONFIG_PATH, JSON.stringify(seo, null, 2));
    const updatedFiles = applySeoConfigToHtml(seo);
    res.json({ ok: true, updated_files: updatedFiles });
  } catch (err) {
    console.error('SEO config save error:', err);
    res.status(500).json({ error: 'SEO ayarlari kaydedilemedi.' });
  }
});

// PayTR token endpoint - checkout sayfasından çağrılır
app.post('/api/paytr/token', async (req, res) => {
  const paytr = getPaytrConfig();
  const MERCHANT_ID = paytr.merchant_id;
  const MERCHANT_KEY = paytr.merchant_key;
  const MERCHANT_SALT = paytr.merchant_salt;

  try {
    if (!MERCHANT_ID || MERCHANT_ID === 'XXXXXX' || !MERCHANT_KEY || MERCHANT_KEY === 'YYYYYYYYYYYYYY' || !MERCHANT_SALT || MERCHANT_SALT === 'ZZZZZZZZZZZZZZ') {
      return res.status(503).json({
        error: 'PayTR henüz yapılandırılmadı. Yönetim paneli → Ayarlar → PayTR bölümünden Merchant ID, Key ve Salt kaydedin.'
      });
    }

    const { name, email, phone, business, plan, amount, cart } = req.body;

    if (!email || !name || !phone) {
      return res.status(400).json({ error: 'Eksik alan: name, email, phone gerekli' });
    }

    let basket;
    let totalAmount;

    if (cart && Array.isArray(cart) && cart.length > 0) {
      // E-ticaret sepeti: [{ name, price, qty }]
      const subtotal = cart.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.qty, 10) || 1), 0);
      const kdv = subtotal * 0.18;
      totalAmount = subtotal + kdv;
      basket = cart.map((item) => [
        item.name || 'Ürün',
        parseFloat(item.price || 0).toFixed(2),
        parseInt(item.qty || 1, 10)
      ]);
      basket.push(['KDV (%18)', kdv.toFixed(2), 1]);
    } else if (plan && amount) {
      // Abonelik planı
      basket = [[(plan || 'Plan') + ' - Aylık Abonelik', parseFloat(amount).toFixed(2), 1]];
      totalAmount = parseFloat(amount);
    } else {
      return res.status(400).json({ error: 'plan+amount veya cart gerekli' });
    }

    const merchant_oid = 'DP' + Date.now() + Math.random().toString(36).slice(2, 8);
    const payment_amount = Math.round(totalAmount * 100); // Kuruş
    const user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || '127.0.0.1';

    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const merchant_ok_url = baseUrl + '/odeme-basarili.html?oid=' + merchant_oid;
    const merchant_fail_url = baseUrl + '/odeme-basarisiz.html?oid=' + merchant_oid;

    const user_basket = Buffer.from(JSON.stringify(basket)).toString('base64');

    const postData = {
      merchant_id: MERCHANT_ID,
      merchant_key: MERCHANT_KEY,
      merchant_salt: MERCHANT_SALT,
      user_ip: user_ip,
      merchant_oid: merchant_oid,
      email: email,
      payment_amount: payment_amount.toString(),
      user_basket: user_basket,
      no_installment: '0',
      max_installment: '0',
      currency: 'TL',
      test_mode: process.env.PAYTR_TEST_MODE || '1',
      user_name: name,
      user_address: business || 'Restoran/Kafe',
      user_phone: (phone || '').replace(/\D/g, '').slice(0, 20),
      merchant_ok_url,
      merchant_fail_url,
      timeout_limit: '30',
      debug_on: '1',
      lang: 'tr',
    };

    postData.paytr_token = getPaytrToken(postData, MERCHANT_KEY, MERCHANT_SALT);

    const formBody = Object.entries(postData)
      .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
      .join('&');

    const result = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'www.paytr.com',
          path: '/odeme/api/get-token',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(formBody),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error('PayTR yanıtı parse edilemedi'));
            }
          });
        }
      );
      req.on('error', reject);
      req.write(formBody);
      req.end();
    });

    if (result.status === 'success') {
      res.json({ token: result.token, merchant_oid });
    } else {
      res.status(400).json({ error: result.reason || 'PayTR token alınamadı' });
    }
  } catch (err) {
    console.error('PayTR token error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// PayTR bildirim URL - ödeme sonucu buraya POST edilir
app.post('/api/paytr/callback', (req, res) => {
  const paytr = getPaytrConfig();
  const {
    merchant_oid,
    status,
    total_amount,
    hash,
  } = req.body;

  const hashStr = merchant_oid + paytr.merchant_salt + status + total_amount;
  const token = crypto.createHmac('sha256', paytr.merchant_key).update(hashStr).digest('base64');

  if (token !== hash) {
    return res.status(400).send('OK');
  }

  if (status === 'success') {
    // Sipariş onayla - veritabanına kaydet
    console.log('Ödeme başarılı:', merchant_oid, total_amount);
  } else {
    // Sipariş iptal
    console.log('Ödeme başarısız:', merchant_oid);
  }

  res.send('OK');
});

/** SambaPOS Acil Destek: form gönderilince bu adrese mail (ACIL_DESTEK_EMAIL veya varsayılan) */
const ACIL_DESTEK_EMAIL = (process.env.ACIL_DESTEK_EMAIL || 'mustafa@dinamikpos.com').trim();

function getMailTransporter() {
  const host = process.env.MAIL_HOST || process.env.SMTP_HOST;
  const port = parseInt(process.env.MAIL_PORT || process.env.SMTP_PORT || '587', 10);
  const user = process.env.MAIL_USER || process.env.SMTP_USER;
  const pass = process.env.MAIL_PASS || process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || user || 'noreply@dinamikpos.com';
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

/** SMTP yok veya mail hata verince talep burada saklanır (sunucu/data/) */
function appendAcilDestekRequest(entry) {
  const dir = path.dirname(ACIL_DESTEK_LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  let list = [];
  try {
    if (fs.existsSync(ACIL_DESTEK_LOG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(ACIL_DESTEK_LOG_PATH, 'utf8'));
      list = Array.isArray(raw) ? raw : [];
    }
  } catch (e) {
    list = [];
  }
  list.push({
    id: 'ad-' + Date.now(),
    created_at: new Date().toISOString(),
    name: entry.name,
    phone: entry.phone,
    email: entry.email,
    problem: entry.problem
  });
  fs.writeFileSync(ACIL_DESTEK_LOG_PATH, JSON.stringify(list, null, 2));
}

app.post('/api/acil-destek', async (req, res) => {
  try {
    const { problem, name, phone, email } = req.body || {};
    if (!problem || typeof problem !== 'string' || problem.trim().length < 10) {
      return res.status(400).json({ error: 'Sorun alanı en az 10 karakter olmalı.' });
    }
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Ad soyad gerekli.' });
    }
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Telefon gerekli.' });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Geçerli e-posta gerekli.' });
    }

    const trimmed = {
      name: (name || '').trim(),
      phone: (phone || '').trim(),
      email: (email || '').trim(),
      problem: (problem || '').trim()
    };

    const transporter = getMailTransporter();
    if (!transporter) {
      appendAcilDestekRequest(trimmed);
      console.warn(
        'Acil destek: SMTP yapılandırılmadı; talep dosyaya yazıldı: data/acil-destek-requests.json (.env içinde MAIL_HOST, MAIL_USER, MAIL_PASS)'
      );
      return res.json({ ok: true, emailed: false, saved: true });
    }

    const from = process.env.MAIL_FROM || process.env.MAIL_USER || 'noreply@dinamikpos.com';
    const text = [
      'SambaPOS Acil Destek talebi',
      '--------------------------------',
      'Ad Soyad: ' + trimmed.name,
      'Telefon: ' + trimmed.phone,
      'E-posta: ' + trimmed.email,
      'Tarih: ' + new Date().toLocaleString('tr-TR'),
      '',
      'Sorun:',
      trimmed.problem
    ].join('\n');

    try {
      await transporter.sendMail({
        from,
        to: ACIL_DESTEK_EMAIL,
        subject: 'SambaPOS Acil Destek - ' + trimmed.name.slice(0, 50),
        text,
        replyTo: trimmed.email
      });
      res.json({ ok: true, emailed: true });
    } catch (mailErr) {
      console.error('Acil destek mail hatası:', mailErr);
      appendAcilDestekRequest(trimmed);
      res.json({ ok: true, emailed: false, saved: true, mailError: true });
    }
  } catch (err) {
    console.error('Acil destek işlem hatası:', err);
    res.status(500).json({ error: 'İşlem başarısız. Lütfen tekrar deneyin veya WhatsApp ile iletin.' });
  }
});

/** Ana sayfa teklif formu — isteğe bağlı e-posta (MAIL_* yapılandırılmışsa) */
const DEMO_TEKLIF_TO = process.env.DEMO_TEKLIF_EMAIL || ACIL_DESTEK_EMAIL;

app.post('/api/demo-teklif', async (req, res) => {
  try {
    const { name, phone, email, business, message } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Ad soyad gerekli.' });
    }
    if (!phone || typeof phone !== 'string' || phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ error: 'Geçerli telefon gerekli.' });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Geçerli e-posta gerekli.' });
    }

    const transporter = getMailTransporter();
    if (!transporter) {
      return res.json({ ok: true, emailed: false, message: 'Kayıt alındı; e-posta sunucusu yapılandırılmadı.' });
    }

    const from = process.env.MAIL_FROM || process.env.MAIL_USER || 'noreply@dinamikpos.com';
    const text = [
      'Yeni teklif / bilgi talebi (ana sayfa)',
      '--------------------------------',
      'Ad: ' + name.trim(),
      'Telefon: ' + phone.trim(),
      'E-posta: ' + email.trim(),
      'İşletme: ' + (business || '').trim(),
      'Tarih: ' + new Date().toLocaleString('tr-TR'),
      '',
      'Mesaj:',
      (message || '').trim().slice(0, 4000)
    ].join('\n');

    await transporter.sendMail({
      from,
      to: DEMO_TEKLIF_TO,
      subject: 'Teklif talebi — ' + name.trim().slice(0, 60),
      text,
      replyTo: email.trim()
    });

    res.json({ ok: true, emailed: true });
  } catch (err) {
    console.error('Demo teklif mail hatası:', err);
    res.status(500).json({ error: 'E-posta gönderilemedi.' });
  }
});

function readLeads() {
  try {
    if (!fs.existsSync(LEADS_PATH)) return [];
    const raw = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function writeLeads(leads) {
  const dir = path.dirname(LEADS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LEADS_PATH, JSON.stringify(leads, null, 2));
}

app.get('/api/leads', (req, res) => {
  const leads = readLeads().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ leads: leads });
});

app.post('/api/leads', (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').replace(/\D/g, '');
    const business_name = String(body.business_name || '').trim();
    const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
    const recommended_package = String(body.recommended_package || '').trim();

    if (!name || name.length < 2) {
      return res.status(400).json({ error: 'Ad en az 2 karakter olmalı.' });
    }
    if (!phone || phone.length < 10) {
      return res.status(400).json({ error: 'Geçerli telefon gerekli.' });
    }
    if (!business_name || business_name.length < 2) {
      return res.status(400).json({ error: 'İşletme adı gerekli.' });
    }
    if (!recommended_package) {
      return res.status(400).json({ error: 'Paket önerisi bulunamadı.' });
    }

    const leads = readLeads();
    const lead = {
      id: 'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name: name.slice(0, 120),
      phone: phone.slice(0, 20),
      business_name: business_name.slice(0, 200),
      recommended_package: recommended_package.slice(0, 60),
      answers: {
        business_type: String(answers.business_type || '').slice(0, 120),
        table_count: String(answers.table_count || '').slice(0, 80),
        delivery_status: String(answers.delivery_status || '').slice(0, 80),
        branch_count: String(answers.branch_count || '').slice(0, 80),
        biggest_problem: String(answers.biggest_problem || '').slice(0, 240)
      },
      source: 'ai-sales-assistant',
      created_at: new Date().toISOString()
    };

    leads.push(lead);
    writeLeads(leads);
    res.json({ ok: true, lead: lead });
  } catch (err) {
    console.error('Lead save error:', err);
    res.status(500).json({ error: 'Lead kaydı yapılamadı.' });
  }
});

// Kısa panel URL'leri (admin.html — /admin tek başına 404 olmasın)
const siteRoot = path.join(__dirname, '..');
app.get(/^\/admin\/?$/i, (req, res) => {
  res.sendFile(path.join(siteRoot, 'admin.html'));
});
app.get(/^\/admin-login\/?$/i, (req, res) => {
  res.sendFile(path.join(siteRoot, 'admin-login.html'));
});

// Statik dosyalar (API route'larından sonra)
app.use(express.static(siteRoot));

// 404 - Var olmayan sayfalar (path.join ile güvenli)
app.use(function (req, res) {
  res.status(404).sendFile(path.join(__dirname, '..', '404.html'), function (err) {
    if (err) res.status(404).send('Sayfa bulunamadı.');
  });
});

app.listen(PORT, () => {
  console.log(`Dinamik POS API http://localhost:${PORT}`);
  startBundledSalesAgent();
  const paytr = getPaytrConfig();
  if (!paytr.merchant_id || paytr.merchant_id === 'XXXXXX') {
    console.log('PayTR: Yönetim paneli → Ayarlar sayfasından PayTR bilgilerini kaydedin (veya .env ile ayarlayın).');
  }
  if (!getMailTransporter()) {
    console.log(
      'Acil destek: SMTP yok — talepler ' +
        path.relative(process.cwd(), ACIL_DESTEK_LOG_PATH) +
        ' dosyasına yazılır. E-posta için .env: MAIL_HOST, MAIL_USER, MAIL_PASS. Alıcı: ' +
        ACIL_DESTEK_EMAIL
    );
  }
});
