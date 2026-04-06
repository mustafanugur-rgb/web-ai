# Satış asistanı API (FastAPI)

Web sitesindeki sohbet widget’ı, Node üzerinden buraya proxy edilir (`/chat`, `/lead`).

## Kurulum (Windows — bir kez)

**Önce Python kurulu olmalı.** [python.org/downloads](https://www.python.org/downloads/) — kurarken **“Add python.exe to PATH”** kutusunu işaretleyin.  
Yüklü mü kontrol: CMD’de `py --version` veya `python --version`.

### Otomatik (önerilen)

`sales-agent-api` klasöründe çift tıklayın veya CMD:

```bat
cd D:\pos-website\sales-agent-api
setup-venv.bat
```

PowerShell:

```powershell
cd D:\pos-website\sales-agent-api
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
.\setup-venv.ps1
```

### Elle

Windows’ta çoğu zaman `python` yerine **`py`** çalışır:

```bat
cd D:\pos-website\sales-agent-api
py -3 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

`.env` dosyasına **`OPENAI_API_KEY`** yazın.

## Çalıştırma

**Önerilen:** `sales-agent-api/.venv` oluşturduktan sonra proje kökünde sadece:

```bat
cd D:\pos-website
npm start
```

Node, satış asistanını (port 8000) otomatik başlatır. Ayrı terminalde `npm run sales-agent` gerekmez.

İsterseniz: `npm run start:all` (site + API ayrı süreçler) veya yalnız API: `npm run sales-agent`.

Otomatik başlatmayı kapatmak: proje kökü `.env` içinde `START_SALES_AGENT=0`.

API: http://127.0.0.1:8000 — dokümantasyon: http://127.0.0.1:8000/docs

## Canlıya alma (AI’yi gerçek siteye bağlama)

Paylaşımlı hosting (sadece PHP) üzerinde Python çalışmaz; **satış asistanı API’sini ayrı bir adreste** çalıştırırsınız (HTTPS zorunlu — site `https://` ise tarayıcı `http://` API’ye izin vermez).

### 1) API’yi yayınlama (örnek: Railway veya Render)

1. `sales-agent-api` klasörünü bu repodan alın (Dockerfile dahil).
2. Platformda yeni servis oluşturun: **Dockerfile ile deploy**.
3. Ortam değişkenleri (minimum):
   - **`OPENAI_API_KEY`** — OpenAI anahtarınız (zorunlu).
   - İsteğe bağlı: `OPENAI_MODEL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (lead bildirimi için).
4. Deploy bitince size bir **HTTPS kök URL** verilir, örn. `https://dinamikpos-agent.up.railway.app`  
   - `GET .../health` → `{"status":"ok"}` dönmeli.

### 2) Web sitesinde adresi tanımlama

Proje kökündeki **`js/config.js`** içinde `DINAMIKPOS_SALES_AGENT_API` mantığına canlı kök URL’yi verin. En pratik yol: tüm sayfalarda `config.js`’ten **hemen önce** (tek satır):

```html
<script>window.DINAMIKPOS_SALES_AGENT_API = 'https://SIZIN-API-ADRESINIZ';</script>
<script src="js/config.js"></script>
```

URL’nin **sonunda `/` olmasın.** Bu ayar ile sohbet widget’ı doğrudan `.../chat` ve `.../lead` uçlarına istek atar (CORS API tarafında `*` ile açık).

### 3) Güvenlik

- **`OPENAI_API_KEY` yalnızca API sunucusunda** (Railway/Render env) durmalı; tarayıcıya ve `public_html` içine koymayın.
- Eski `.env` anahtarlarını **OpenAI panelinden rotate** edin (sızıntı şüphesinde).

### 4) Hâlâ PHP metni görüyorsanız

`DINAMIKPOS_SALES_AGENT_API` boşsa veya yanlışsa istekler yine **`/api/dinamik-sales/chat.php`** yedeğine düşer. Adresi doğrulayıp sayfayı yenileyin; Geliştirici Araçları → Ağ’da isteğin gittiği hostun sizin API’niz olduğunu kontrol edin.
