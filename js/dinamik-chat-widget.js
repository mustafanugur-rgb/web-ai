/**
 * DinamikPOS — tek global satış asistanı widget (/chat, /lead ile uyumlu).
 * window.DinamikPOSChat.open({ seedAssistant: "..." }) — hero / fiyatlandırma CTA.
 */
(function () {
  "use strict";

  var DEFAULT_OPENING =
    "Merhaba 👋 İşletmenize en uygun POS ve yazarkasa çözümünü 1 dakikada belirleyebilirim. Kaç kasa kullanacaksınız ve işletme türünüz nedir?";
  var HERO_SEED =
    "Merhaba 👋 Doğru sistemi hızlıca belirleyelim. Kaç kasa kullanacaksınız?";
  /** Fiyatlandırma CTA — paket karşılaştıran kullanıcılar için */
  var PRICING_SEED =
    "Size en uygun paketi birlikte belirleyelim 👍 Kaç terminal, yazıcı ve yazarkasa ihtiyacınız var?";
  var PRICING_PLACEHOLDER =
    "Kaç terminal, yazıcı veya yazarkasa gerekiyor?";
  /** Teklif bölümü CTA */
  var QUOTE_SEED =
    "Size hızlı teklif çıkarabilmem için birkaç bilgi alayım. İşletme türünüz ve kaç kasa ihtiyacınız var?";
  var QUOTE_PLACEHOLDER =
    "İşletme türünüzü ve ihtiyaçlarınızı yazın…";

  /**
   * Prod: window.DINAMIKPOS_CHAT_API_BASE veya config.js ile aynı mantık → /api/dinamik-sales (Node proxy veya PHP).
   * URL'ler sayfa yüklenirken sabitlenmez; her istekte çözülür (script sırası / cache sorunları önlenir).
   * Canlı domainde asla 127.0.0.1:8000 kullanılmaz (aksi halde ziyaretçinin kendi PC'sine istek gider).
   */
  function getSalesApiBase() {
    if (
      typeof window.DINAMIKPOS_CHAT_API_BASE === "string" &&
      window.DINAMIKPOS_CHAT_API_BASE.trim()
    ) {
      return window.DINAMIKPOS_CHAT_API_BASE.trim().replace(/\/+$/, "");
    }
    if (
      typeof window.DINAMIKPOS_SALES_AGENT_API === "string" &&
      window.DINAMIKPOS_SALES_AGENT_API.trim()
    ) {
      return window.DINAMIKPOS_SALES_AGENT_API.trim().replace(/\/+$/, "");
    }
    var sitePath = "";
    if (typeof window.getDinamikApiBase === "function") {
      sitePath = String(window.getDinamikApiBase() || "").replace(/\/+$/, "");
    }
    var sameOriginProxy = (sitePath ? sitePath : "") + "/api/dinamik-sales";
    var host = window.location.hostname;
    var port = window.location.port;
    if (host === "localhost" || host === "127.0.0.1") {
      if (port === "8000") {
        return window.location.origin.replace(/\/+$/, "");
      }
      return sameOriginProxy;
    }
    return sameOriginProxy;
  }

  function getChatUrl() {
    return getSalesApiBase() + "/chat";
  }

  function getLeadUrl() {
    return getSalesApiBase() + "/lead";
  }

  var STRINGS = {
    tr: {
      title: "Satış Asistanı",
      subtitle: "POS · Yazarkasa · 7/24 Destek",
      chat: "Sohbet",
      openChat: "Satış asistanını aç",
      closeChat: "Kapat",
      thinking: "Yanıt hazırlanıyor…",
      messageLabel: "Mesaj",
      placeholder: "Mesajınızı yazın…",
      send: "Gönder",
      noReply: "(Yanıt yok)",
      networkError:
        "Bağlantı kurulamadı. Siteyi npm start ile açın; satış asistanı API’sini çalıştırın (ör. port 8000).",
      serverError: "Sunucuya ulaşılamadı.",
      leadTitle: "İletişim bilgileriniz (isteğe bağlı)",
      leadNamePh: "Ad Soyad",
      leadPhonePh: "Telefon",
      leadEmailPh: "E-posta",
      leadSave: "Bilgilerimi kaydet",
      leadSaved: "Kaydettik, teşekkürler! Satış ekibimiz size ulaşabilir.",
      leadEmpty: "En az bir alan doldurun (ad, telefon veya e-posta).",
      leadError: "Kaydedilemedi. Tekrar deneyin.",
      leadGateAiOffer:
        "İsterseniz iletişim bilgilerinizi bırakın; uygun gördüğümüzde yetkili temsilci sizi arayabilir.",
      leadGateBtn: "İletişim formunu göster",
      leadHideBtn: "Formu kapat",
      leadGateAfterSave:
        "Kaydınızı aldık. Temsilcimiz en kısa sürede size dönecektir. Gerekirse formu yeniden açabilirsiniz.",
      htmlNotJson:
        "Sunucu JSON yerine HTML sayfası döndü (çoğunlukla /api/ klasörü eksik veya güncel değil). public_html/api/ altına api-php içeriğini ve .htaccess dosyasını yükleyin; dinamik-sales/chat.php yolu çalışmalı.",
      badJsonResponse: "Sunucu yanıtı geçerli JSON değil.",
    },
    en: {
      title: "Sales Assistant",
      subtitle: "POS · Register · 24/7 support",
      chat: "Chat",
      openChat: "Open sales assistant",
      closeChat: "Close",
      thinking: "Preparing reply…",
      messageLabel: "Message",
      placeholder: "Type your message…",
      send: "Send",
      noReply: "(No reply)",
      networkError:
        "Could not connect. Run the site with npm start and start the sales-agent API (e.g. port 8000).",
      serverError: "Could not reach the server.",
      leadTitle: "Your contact details (optional)",
      leadNamePh: "Name",
      leadPhonePh: "Phone",
      leadEmailPh: "Email",
      leadSave: "Save my details",
      leadSaved: "Saved. Thank you — our team can reach out.",
      leadEmpty: "Fill in at least one field (name, phone, or email).",
      leadError: "Could not save. Try again.",
      leadGateAiOffer:
        "You can leave your contact details if you’d like a sales representative to follow up.",
      leadGateBtn: "Show contact form",
      leadHideBtn: "Close form",
      leadGateAfterSave:
        "We’ve saved your details. A team member will reach out soon.",
      htmlNotJson:
        "The server returned a web page instead of JSON (often missing /api/ files or .htaccess). Upload the api-php folder to public_html/api/ and refresh. Contact hosting support if it persists.",
      badJsonResponse: "The server response was not valid JSON.",
    },
  };

  function resolveLocale() {
    var list =
      navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language || "tr"];
    var i;
    for (i = 0; i < list.length; i++) {
      var code = String(list[i] || "")
        .split("-")[0]
        .toLowerCase();
      if (STRINGS[code]) return code;
    }
    return "tr";
  }

  var locale = resolveLocale();
  var L = STRINGS[locale] || STRINGS.tr;
  var defaultPlaceholder = "";

  function txt(key) {
    var v = L[key];
    if (v !== undefined && v !== "") return v;
    return STRINGS.tr[key] || STRINGS.en[key] || key;
  }

  /** Sunucu 404 HTML döndürünce res.json() patlamasın */
  function parseFetchJson(res) {
    return res.text().then(function (text) {
      var t = (text || "").trim();
      if (t.charAt(0) === "<") {
        throw new Error(txt("htmlNotJson"));
      }
      var data;
      try {
        data = t ? JSON.parse(t) : {};
      } catch (e2) {
        throw new Error(txt("badJsonResponse"));
      }
      return { res: res, data: data };
    });
  }

  /** Bazı hostinglerde /chat yolu HTML döner; /chat.php doğrudan dosyayı bulur */
  function postJsonWithPhpFallback(url, body, onNotOk) {
    var opts = {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    };
    function tryOnce(u) {
      return fetch(u, opts).then(parseFetchJson).then(function (r) {
        if (!r.res.ok) {
          return onNotOk(r);
        }
        return r.data;
      });
    }
    return tryOnce(url).catch(function (err) {
      if (url.indexOf(".php") !== -1) throw err;
      var m = String(err && err.message ? err.message : "");
      /* /chat bazen 301 ile .php'ye düşer ve POST → GET olur → PHP "Method not allowed" döner */
      /* Bazı hostinglerde /chat 404 (rewrite yok); doğrudan .php dene */
      var tryPhp =
        m === txt("htmlNotJson") ||
        /method not allowed/i.test(m) ||
        /^405\b/i.test(m) ||
        /^404\b/i.test(m) ||
        /\bnot found\b/i.test(m);
      if (tryPhp) {
        return tryOnce(url + ".php");
      }
      throw err;
    });
  }

  var root = document.getElementById("sales-chat-widget");
  if (!root) return;

  var launcher = document.getElementById("chat-launcher");
  var panel = document.getElementById("chat-panel");
  var closeBtn = document.getElementById("chat-close");
  var messagesEl = document.getElementById("chat-messages");
  var loadingEl = document.getElementById("chat-loading");
  var form = document.getElementById("chat-form");
  var input = document.getElementById("chat-input");
  var sendBtn = document.getElementById("chat-send");
  var leadForm = document.getElementById("lead-form");
  var leadName = document.getElementById("lead-name");
  var leadPhone = document.getElementById("lead-phone");
  var leadEmail = document.getElementById("lead-email");
  var leadSave = document.getElementById("lead-save");
  var leadStripTitle = document.getElementById("lead-strip-title");
  var leadGate = document.getElementById("lead-gate");
  var leadGateHint = document.getElementById("lead-gate-hint");
  var leadGateBtn = document.getElementById("lead-gate-btn");
  var leadHideBtn = document.getElementById("lead-hide-btn");

  var chatHistory = [];
  var leadGateState = "hidden";

  function refreshLeadGateI18n() {
    if (!leadGateHint) return;
    if (leadGateState === "aftersave") {
      leadGateHint.textContent = txt("leadGateAfterSave");
    } else if (leadGateState === "offer") {
      leadGateHint.textContent = txt("leadGateAiOffer");
    }
  }

  function applyLeadFormVisibility(showContactForm) {
    if (showContactForm) {
      leadGateState = "offer";
    } else {
      leadGateState = "hidden";
      if (leadForm) leadForm.hidden = true;
    }
    if (leadGate) leadGate.hidden = !showContactForm;
    if (leadGateBtn) leadGateBtn.disabled = !showContactForm;
    refreshLeadGateI18n();
  }

  function applyI18n() {
    var dr = document.documentElement;
    dr.setAttribute("lang", locale === "ar" ? "ar" : locale);

    var titleEl = document.getElementById("chat-header-title");
    var subEl = document.getElementById("chat-header-sub");
    if (titleEl) titleEl.textContent = L.title;
    if (subEl) subEl.textContent = L.subtitle;

    var launchLabel = document.getElementById("chat-launcher-label");
    if (launchLabel) launchLabel.textContent = L.chat;
    if (launcher) launcher.setAttribute("aria-label", L.openChat);
    if (closeBtn) closeBtn.setAttribute("aria-label", L.closeChat);

    var think = document.getElementById("chat-thinking-text");
    if (think) think.textContent = L.thinking;

    var msgLab = document.getElementById("chat-message-label");
    if (msgLab) msgLab.textContent = L.messageLabel;
    if (input) input.placeholder = L.placeholder;
    defaultPlaceholder = L.placeholder;
    if (sendBtn) sendBtn.textContent = L.send;
    if (leadStripTitle) leadStripTitle.textContent = txt("leadTitle");
    if (leadName) leadName.placeholder = txt("leadNamePh");
    if (leadPhone) leadPhone.placeholder = txt("leadPhonePh");
    if (leadEmail) leadEmail.placeholder = txt("leadEmailPh");
    if (leadSave) leadSave.textContent = txt("leadSave");
    if (leadGateBtn) leadGateBtn.textContent = txt("leadGateBtn");
    if (leadHideBtn) leadHideBtn.textContent = txt("leadHideBtn");
    if (root) root.setAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    refreshLeadGateI18n();
  }

  try {
    applyI18n();
  } catch (e) {
    console.error("applyI18n", e);
  }

  if (
    !launcher ||
    !panel ||
    !closeBtn ||
    !messagesEl ||
    !loadingEl ||
    !form ||
    !input ||
    !sendBtn ||
    !leadForm ||
    !leadName ||
    !leadPhone ||
    !leadEmail ||
    !leadSave ||
    !leadGate ||
    !leadGateHint ||
    !leadGateBtn ||
    !leadHideBtn
  ) {
    console.error("DinamikPOS chat: gerekli DOM öğeleri eksik.");
    return;
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function appendBubble(role, text) {
    var div = document.createElement("div");
    div.className = "msg " + role;
    div.innerHTML = escapeHtml(text);
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendError(text) {
    var div = document.createElement("div");
    div.className = "msg error";
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setLoading(on) {
    loadingEl.classList.toggle("active", on);
    loadingEl.setAttribute("aria-hidden", on ? "false" : "true");
    input.disabled = on;
    sendBtn.disabled = on;
    if (on) messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /**
   * Panel aç: seedAssistant varsa o metin (asistan); yoksa ve mesaj yoksa varsayılan karşılama.
   */
  function openPanel(opts) {
    opts = opts || {};
    panel.hidden = false;
    launcher.hidden = true;

    var seed = opts.seedAssistant ? String(opts.seedAssistant).trim() : "";
    var ph =
      opts.placeholderText && String(opts.placeholderText).trim()
        ? String(opts.placeholderText).trim()
        : (defaultPlaceholder || txt("placeholder"));
    input.placeholder = ph;
    if (seed) {
      var last = messagesEl.lastElementChild;
      if (!last || last.textContent.trim() !== seed) {
        appendBubble("ai", seed);
      }
    } else if (messagesEl.children.length === 0) {
      appendBubble("ai", DEFAULT_OPENING);
    }
    input.focus();
  }

  function closePanel() {
    panel.hidden = true;
    launcher.hidden = false;
  }

  launcher.addEventListener("click", function () {
    openPanel({ placeholderText: defaultPlaceholder || txt("placeholder") });
  });
  closeBtn.addEventListener("click", closePanel);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var raw = input.value.trim();
    if (!raw) return;

    appendBubble("user", raw);
    input.value = "";
    input.style.height = "auto";
    setLoading(true);

    postJsonWithPhpFallback(
      getChatUrl(),
      {
        message: raw,
        history: chatHistory,
      },
      function (r) {
        var detail = r.data.detail;
        var msg =
          typeof detail === "string"
            ? detail
            : r.res.status + " " + r.res.statusText;
        throw new Error(msg);
      }
    )
      .then(function (data) {
        var reply = data && data.reply != null ? String(data.reply) : "";
        appendBubble("ai", reply || L.noReply);
        chatHistory.push({ role: "user", content: raw });
        chatHistory.push({ role: "assistant", content: reply || L.noReply });
        while (chatHistory.length > 40) chatHistory.shift();
        var showForm = data && data.show_contact_form === true;
        applyLeadFormVisibility(showForm);
      })
      .catch(function (err) {
        var m = err && err.message ? String(err.message) : "";
        var isNetwork =
          m === "Failed to fetch" ||
          m === "NetworkError when attempting to fetch resource." ||
          (err && err.name === "TypeError");
        if (isNetwork) {
          appendError(L.networkError);
        } else {
          appendError(m || L.serverError);
        }
      })
      .finally(function () {
        setLoading(false);
      });
  });

  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  leadGateBtn.addEventListener("click", function () {
    if (leadGateBtn.disabled) return;
    leadForm.hidden = false;
    leadGate.hidden = true;
  });

  leadHideBtn.addEventListener("click", function () {
    leadForm.hidden = true;
    leadGateState = "offer";
    if (leadGate) leadGate.hidden = false;
    if (leadGateBtn) leadGateBtn.disabled = false;
    refreshLeadGateI18n();
  });

  leadForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = leadName.value.trim();
    var phone = leadPhone.value.trim();
    var email = leadEmail.value.trim();
    if (!name && !phone && !email) {
      appendError(txt("leadEmpty"));
      return;
    }
    leadSave.disabled = true;
    postJsonWithPhpFallback(
      getLeadUrl(),
      {
        name: name || null,
        phone: phone || null,
        email: email || null,
        message: null,
      },
      function (r) {
        var d = r.data.detail;
        throw new Error(
          typeof d === "string" ? d : r.res.status + " " + r.res.statusText
        );
      }
    )
      .then(function () {
        appendBubble("ai", txt("leadSaved"));
        leadForm.reset();
        leadForm.hidden = true;
        leadGateState = "aftersave";
        if (leadGate) leadGate.hidden = false;
        if (leadGateBtn) leadGateBtn.disabled = false;
        refreshLeadGateI18n();
      })
      .catch(function () {
        appendError(txt("leadError"));
      })
      .finally(function () {
        leadSave.disabled = false;
      });
  });

  /** Tek global API — tüm CTA’lar aynı #sales-chat-widget instance */
  window.DinamikPOSChat = {
    open: function (opts) {
      openPanel(opts || {});
    },
    close: closePanel,
    HERO_SEED: HERO_SEED,
    PRICING_SEED: PRICING_SEED,
    QUOTE_SEED: QUOTE_SEED,
  };

  var heroCta = document.getElementById("dinamikpos-hero-cta-chat");
  if (heroCta) {
    heroCta.addEventListener("click", function () {
      openPanel({ seedAssistant: HERO_SEED });
    });
  }

  var pricingCta = document.getElementById("dinamikpos-pricing-cta-chat");
  if (pricingCta) {
    pricingCta.addEventListener("click", function () {
      openPanel({
        seedAssistant: PRICING_SEED,
        placeholderText: PRICING_PLACEHOLDER,
      });
    });
  }

  var quoteCta = document.getElementById("dinamikpos-quote-cta-chat");
  if (quoteCta) {
    quoteCta.addEventListener("click", function () {
      openPanel({
        seedAssistant: QUOTE_SEED,
        placeholderText: QUOTE_PLACEHOLDER,
      });
    });
  }
})();
