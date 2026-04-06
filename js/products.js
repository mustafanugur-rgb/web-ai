/**
 * Ürün kataloğu - POS, yazarkasa, donanım
 * localStorage ile yönetim; admin'den ekleme/düzenleme/silme
 */
var PRODUCTS_DEFAULT = [
  {
    id: 'pos-touch-15',
    name: 'Dinamik POS Touch 15"',
    category: 'pos',
    price: 8990,
    oldPrice: 9990,
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
    desc: '15" dokunmatik ekran, restoran ve kafe için ideal. SambaPOS uyumlu.',
    features: ['15" Full HD', 'Dokunmatik', 'SambaPOS hazır', '2 yıl garanti']
  },
  {
    id: 'pos-touch-10',
    name: 'Dinamik POS Touch 10"',
    category: 'pos',
    price: 5490,
    image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3fef8?w=600&q=80',
    desc: 'Kompakt 10" dokunmatik. Küçük kafeler ve barlar için.',
    features: ['10" dokunmatik', 'Hafif', 'Kolay kurulum']
  },
  {
    id: 'yazarkasa-thermal',
    name: 'Termal Yazarkasa',
    category: 'yazarkasa',
    price: 1890,
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&q=80',
    desc: '58mm termal yazıcılı, hızlı fiş kesimi.',
    features: ['58mm fiş', 'USB bağlantı', 'Sessiz çalışma']
  },
  {
    id: 'yazarkasa-80mm',
    name: 'Yazarkasa 80mm',
    category: 'yazarkasa',
    price: 2490,
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7b4f?w=600&q=80',
    desc: '80mm fiş, fatura ve adisyon için.',
    features: ['80mm fiş', 'Hızlı yazdırma', 'Kesici dahil']
  },
  {
    id: 'barkod-scan',
    name: 'Barkod Okuyucu',
    category: 'donanim',
    price: 490,
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&q=80',
    desc: 'USB barkod okuyucu, stok takibi için.',
    features: ['USB plug&play', '1D/2D barkod', 'Hızlı tarama']
  },
  {
    id: 'para-cekmecesi',
    name: 'Para Çekmecesi',
    category: 'donanim',
    price: 890,
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80',
    desc: 'RJ12 bağlantılı kasa çekmecesi.',
    features: ['RJ12', 'Kilitli', 'Paslanmaz']
  },
  {
    id: 'pos-all-in-one',
    name: 'POS All-in-One Paket',
    category: 'paket',
    price: 12990,
    oldPrice: 14990,
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
    desc: 'Touch ekran + yazarkasa + para çekmecesi. Kurulum dahil.',
    features: ['15" POS', 'Termal yazıcı', 'Para çekmecesi', 'Kurulum']
  }
];

var PRODUCTS = PRODUCTS_DEFAULT; /* fallback - getProducts() kullanın */

function getProducts() {
  try {
    var stored = localStorage.getItem('dinamik_products');
    if (stored) {
      var arr = JSON.parse(stored);
      return Array.isArray(arr) && arr.length > 0 ? arr : PRODUCTS_DEFAULT;
    }
  } catch (e) {}
  return PRODUCTS_DEFAULT;
}

function setProducts(arr) {
  localStorage.setItem('dinamik_products', JSON.stringify(arr));
}

/** Varsayılan kategoriler (slug → görünen ad) */
var DEFAULT_CATEGORY_LABELS = {
  pos: 'POS Sistemi',
  yazarkasa: 'Yazarkasa',
  donanim: 'Donanım',
  paket: 'Paket'
};

var STORAGE_CATEGORY_LABELS = 'dinamik_category_labels';

function getExtraCategoryLabels() {
  try {
    var s = localStorage.getItem(STORAGE_CATEGORY_LABELS);
    return s ? JSON.parse(s) : {};
  } catch (e) {
    return {};
  }
}

function setExtraCategoryLabels(obj) {
  try {
    localStorage.setItem(STORAGE_CATEGORY_LABELS, JSON.stringify(obj));
  } catch (e) {}
}

function registerCategoryLabel(slug, label) {
  var extra = getExtraCategoryLabels();
  var t = (label || '').trim();
  if (!slug || !t) return;
  if (extra[slug] === t) return;
  extra[slug] = t;
  setExtraCategoryLabels(extra);
}

function slugifyCategory(str) {
  var map = { 'ı': 'i', 'i': 'i', 'ş': 's', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ç': 'c' };
  var s = String(str || '').trim().toLocaleLowerCase('tr-TR');
  s = s.split('').map(function (c) {
    return map[c] !== undefined ? map[c] : c;
  }).join('');
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'ozel';
}

function getCategoryLabel(slug) {
  if (!slug) return '';
  if (DEFAULT_CATEGORY_LABELS[slug]) return DEFAULT_CATEGORY_LABELS[slug];
  var extra = getExtraCategoryLabels();
  if (extra[slug]) return extra[slug];
  return String(slug).replace(/-/g, ' ').replace(/\b\w/g, function (l) {
    return l.toUpperCase();
  });
}

/**
 * Panelde yazılan metinden kategori slug + etiket üretir; yeni ise kaydeder.
 */
function resolveCategoryFromInput(raw) {
  raw = (raw || '').trim();
  if (!raw) return { slug: 'pos', label: DEFAULT_CATEGORY_LABELS.pos };
  var lower = raw.toLocaleLowerCase('tr-TR');
  var extra = getExtraCategoryLabels();
  if (DEFAULT_CATEGORY_LABELS[raw]) return { slug: raw, label: DEFAULT_CATEGORY_LABELS[raw] };
  if (DEFAULT_CATEGORY_LABELS[lower]) return { slug: lower, label: DEFAULT_CATEGORY_LABELS[lower] };
  if (extra[raw]) return { slug: raw, label: extra[raw] };
  if (extra[lower]) return { slug: lower, label: extra[lower] };
  var k;
  for (k in DEFAULT_CATEGORY_LABELS) {
    if (DEFAULT_CATEGORY_LABELS[k].toLocaleLowerCase('tr-TR') === lower) return { slug: k, label: DEFAULT_CATEGORY_LABELS[k] };
  }
  for (k in extra) {
    if (extra[k].toLocaleLowerCase('tr-TR') === lower) return { slug: k, label: extra[k] };
  }
  var slug = slugifyCategory(raw);
  if (DEFAULT_CATEGORY_LABELS[slug]) return { slug: slug, label: DEFAULT_CATEGORY_LABELS[slug] };
  if (extra[slug]) return { slug: slug, label: extra[slug] };
  registerCategoryLabel(slug, raw);
  return { slug: slug, label: raw };
}

/** Ürünler sayfası filtreleri: mevcut ürünlerde kullanılan kategoriler (sıralı) */
function getCategoryListForFilters() {
  var products = getProducts();
  var seen = {};
  products.forEach(function (p) {
    if (p && p.category) seen[p.category] = true;
  });
  var order = ['pos', 'yazarkasa', 'donanim', 'paket'];
  var list = [];
  order.forEach(function (s) {
    if (seen[s]) {
      list.push({ slug: s, label: getCategoryLabel(s) });
      delete seen[s];
    }
  });
  Object.keys(seen).sort().forEach(function (s) {
    list.push({ slug: s, label: getCategoryLabel(s) });
  });
  return list;
}
