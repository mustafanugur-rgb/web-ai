"""
Rule-based extraction from lead ``message`` for sales-friendly Telegram formatting.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any


def _dash(value: Any) -> str:
    if value is None:
        return "-"
    s = str(value).strip()
    return s if s else "-"


def _norm(text: str) -> str:
    return (text or "").lower()


def _digits_only(value: str | None) -> str:
    return "".join(c for c in (value or "") if c.isdigit())


def _normalize_tr_mobile_digits(d: str) -> str:
    """Strip country/leading 0; keep up to 10-digit national mobile."""
    x = _digits_only(d)
    if not x:
        return ""
    if x.startswith("90") and len(x) >= 12:
        x = x[2:]
    if x.startswith("0") and len(x) == 11:
        x = x[1:]
    if len(x) > 10:
        x = x[-10:]
    return x


def _phones_match(stored: str, from_message: str) -> bool:
    """Same TR GSM as in ``detect_lead_info`` / ``leads_storage`` style numbers."""
    a = _normalize_tr_mobile_digits(stored)
    b = _normalize_tr_mobile_digits(from_message)
    return bool(a) and len(a) >= 9 and a == b


def infer_name_from_message(message: str | None, phone_field: str | None) -> str:
    """
    If ``name`` was not stored but ``message`` is like «Ad Soyad 05xx...»,
    return the name part when digits match ``phone_field``.
    """
    raw = (message or "").strip()
    if len(raw) < 3:
        return "-"
    m = re.match(
        r"^([\w\sçğıöşüÇĞİÖŞÜ'.-]+?)\s+(\+?\d[\d\s\-]{8,})\s*$",
        raw,
        re.UNICODE,
    )
    if not m:
        return "-"
    name_part = m.group(1).strip()
    msg_phone = m.group(2)
    if len(name_part) < 2:
        return "-"
    if not _phones_match(phone_field or "", msg_phone):
        return "-"
    return name_part


def _message_is_only_phone_line(message: str | None, phone_field: str | None) -> bool:
    raw = (message or "").strip()
    if not raw or infer_name_from_message(raw, phone_field) != "-":
        return False
    d_msg = _digits_only(raw)
    d_phone = _digits_only(phone_field or "")
    if len(d_msg) < 9 or not d_phone:
        return False
    return _phones_match(d_phone, d_msg) and len(raw.replace(" ", "")) <= 18


def _norm_business(text: str) -> str:
    """Lowercase, NFKC, collapse whitespace — stable substring search."""
    t = unicodedata.normalize("NFKC", (text or "").lower())
    return re.sub(r"\s+", " ", t).strip()


# Exact / strong phrases (Turkish + ASCII fallbacks). Prefer longer matches via sort.
_BUSINESS_PHRASES_RAW: list[tuple[str, str]] = [
    # Multi-word & explicit iş türü
    ("sandviç dükkanı", "Sandviç dükkanı"),
    ("sandvic dukkani", "Sandviç dükkanı"),
    ("sandwich dukkani", "Sandviç dükkanı"),
    ("kahve dükkanı", "Kahve dükkanı"),
    ("kahve dukkani", "Kahve dükkanı"),
    ("balık restoran", "Balık restoranı"),
    ("balik restoran", "Balık restoranı"),
    ("fast food", "Fast food"),
    ("fastfood", "Fast food"),
    ("çiğ köfte", "Çiğ köfte"),
    ("cig kofte", "Çiğ köfte"),
    # -ci / meslek formu (önce tam kelime)
    ("makarnacı", "Makarnacı"),
    ("makarnaci", "Makarnacı"),
    ("dönerci", "Dönerci"),
    ("donerci", "Dönerci"),
    ("kahveci", "Kahveci"),
    ("burgerci", "Burgerci"),
    ("kebapçı", "Kebapçı"),
    ("kebapci", "Kebapçı"),
    ("köfteci", "Köfteci"),
    ("kofteci", "Köfteci"),
    ("pideci", "Pideci"),
    ("lahmacun", "Lahmacun / pide"),
    ("ocakbaşı", "Ocakbaşı"),
    ("ocakbasi", "Ocakbaşı"),
    ("şarküteri", "Şarküteri"),
    ("sarkuteri", "Şarküteri"),
    ("mağazaları", "Perakende mağaza"),
    ("magazalari", "Perakende mağaza"),
    ("çikolata mağazası", "Çikolata mağazası"),
    ("cikolata magazasi", "Çikolata mağazası"),
    ("çikolata mağazaları", "Çikolata mağazası"),
    ("cikolata magazalari", "Çikolata mağazası"),
]

_BUSINESS_PHRASES: list[tuple[str, str]] = sorted(
    _BUSINESS_PHRASES_RAW,
    key=lambda item: len(item[0]),
    reverse=True,
)

# Broader category when no exact phrase matched (kök / genel segment)
_BUSINESS_BROAD: list[tuple[str, str]] = [
    ("makarna", "Makarnacı"),
    ("döner", "Dönerci"),
    ("doner", "Dönerci"),
    ("burger", "Burger"),
    ("pizza", "Pizza"),
    ("kahve", "Kahveci"),
    ("kafe", "Kafe"),
    ("cafe", "Kafe"),
    ("pastane", "Pastane"),
    ("fırın", "Fırın"),
    ("firin", "Fırın"),
    ("restoran", "Restoran"),
    ("lokanta", "Lokanta"),
    ("büfe", "Büfe"),
    ("bufe", "Büfe"),
    ("bar", "Bar"),
    ("pub", "Pub"),
    ("otel", "Otel"),
    ("pansiyon", "Pansiyon"),
    ("balık", "Balık restoranı"),
    ("balik", "Balık restoranı"),
    ("market", "Market"),
    ("bakkal", "Bakkal"),
    ("manav", "Manav"),
    ("kumpir", "Kumpir / kiosk"),
    ("kiosk", "Kiosk"),
    ("çikolata", "Çikolata / perakende"),
    ("cikolata", "Çikolata / perakende"),
    ("mağaza", "Perakende mağaza"),
    ("magaza", "Perakende mağaza"),
    ("perakende", "Perakende"),
]


def extract_business_type(message: str) -> str:
    n = _norm_business(message)
    if not n:
        return "-"
    for needle, label in _BUSINESS_PHRASES:
        if needle in n:
            return label
    for needle, label in _BUSINESS_BROAD:
        if needle in n:
            return label
    return "-"


def _display_isletme_for_telegram(isletme: str, raw_message: str) -> str:
    """
    Telegram için işletme satırı: çıkarım sonucu yoksa doğal dilde yeni/mevcut ayrımı.
    ``extract_business_type`` değiştirilmez; yalnızca gösterim.
    """
    if isletme != "-":
        return isletme
    n = _norm_business(raw_message)
    if not n:
        return "Mevcut işletme"
    if re.search(
        r"açacağım|açacağız|açıyorum|açıyoruz|kuracağım|kuruyoruz|yeni\s+işletme|yeni\s+iş\b",
        n,
    ):
        return "Yeni açılan işletme"
    return "Mevcut işletme"


def _format_sube_lines(sube: str, branch_plan: str) -> str:
    """📍 Şube bloğu — kısa, doğal dil."""
    lines: list[str] = []
    if sube != "-":
        if sube.startswith("Belirtilmedi"):
            lines.append("Şube sayısı net değil (detay görüşmede)")
        else:
            lines.append(f"{sube} şube")
    if branch_plan != "-":
        lines.append(branch_plan)
    if not lines:
        return "Belirtilmedi"
    return "\n".join(lines)


def _kurulum_bullets(
    ihtiyac: str,
    counts: dict[str, int],
    per_branch: bool,
) -> list[str]:
    """İhtiyaç + donanım adetleri; tekrar etmeyen madde listesi."""
    lines: list[str] = []
    if per_branch:
        lines.append("• Şube başı kurulum")
    for label, qty in sorted(counts.items(), key=lambda x: x[0]):
        lines.append(f"• {qty} adet {label}")

    need_parts = [p.strip() for p in (ihtiyac or "").split(",") if p.strip() and p.strip() != "-"]

    def _covered_by_counts(fragment: str) -> bool:
        fl = unicodedata.normalize("NFKC", fragment.lower())
        for lab in counts:
            ll = lab.lower()
            if ll in fl or fl in ll:
                return True
        return False

    for part in need_parts:
        if _covered_by_counts(part):
            continue
        lines.append(f"• {part}")

    if not lines:
        lines.append("• Detay için kısa arama")
    return lines


def _format_kurulum_block(
    ihtiyac: str,
    counts: dict[str, int],
    per_branch: bool,
) -> str:
    return "\n".join(_kurulum_bullets(ihtiyac, counts, per_branch))


_GREETINGS_NAME = frozenset(
    {"merhaba", "selam", "hey", "günaydın", "gunaydin", "iyi", "slm", "sa"}
)

# İş / yatırım cümlesi — kişi adı sanılmasın (yalın «istiyorum» çok geniş; ayrı ele alınır)
_BUSINESS_UTTERANCE = re.compile(
    r"açacağım|açacağız|açıyorum|açıyoruz|mağaza|magaza|şube|şubede|terminal|"
    r"anakasa|yazarkasa|işletme|kiosk|restoran|perakende|yatırım|yatirim|"
    r"olacak|kuracağım|kuruyor",
    re.IGNORECASE | re.UNICODE,
)

# Talep cümlesi — ad alanına düşmesin
_REQUEST_LIKE = re.compile(
    r"\b(istiyorum|istiyoruz|rica\s+ediyorum|teklif|fiyat|ücret|ucret|bilgi)\b",
    re.IGNORECASE | re.UNICODE,
)


def _is_business_like_line(s: str) -> bool:
    return bool(_BUSINESS_UTTERANCE.search(s))


def _is_request_like_line(s: str) -> bool:
    t = unicodedata.normalize("NFKC", s or "")
    return bool(_REQUEST_LIKE.search(t))


def _extract_name_from_contact_tail(line: str) -> str | None:
    """
    «email@x.com mustafa 0530...» veya sondaki «isim telefon» satırından ad.
    """
    line = line.strip()
    if not line:
        return None
    m = re.search(
        r"\S+@\S+\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,32})\s+[\d\s\-+]{10,}",
        line,
    )
    if m:
        return m.group(1).strip()
    m2 = re.search(
        r"^([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,32})\s+[\d\s\-+]{10,}\s*$",
        line,
    )
    if m2:
        return m2.group(1).strip()
    return None


def _is_plausible_person_name_line(line: str) -> bool:
    s = line.strip()
    if len(s) < 2 or len(s) > 44:
        return False
    if _is_request_like_line(s):
        return False
    if _is_business_like_line(s):
        return False
    if len(s.split()) > 4:
        return False
    if "@" in s:
        return False
    if _digits_only(s) and len(_digits_only(s)) >= 8:
        return False
    low = s.lower()
    if low in _GREETINGS_NAME:
        return False
    return bool(re.match(r"^[\w\sçğıöşüÇĞİÖŞÜ'.-]+$", s, re.UNICODE))


def pick_display_name(lead: dict[str, Any], raw_str: str, phone_str: str) -> str:
    """Tek satır kişi adı; iş cümlesi veya mağaza planı ad gibi gösterilmez."""
    lines = [ln.strip() for ln in raw_str.strip().splitlines() if ln.strip()]

    for line in reversed(lines[-8:]):
        n = _extract_name_from_contact_tail(line)
        if n and not _is_business_like_line(n):
            return n[:60]

    inferred = infer_name_from_message(raw_str, phone_str)
    stored = _dash(lead.get("name"))
    name = stored if stored != "-" else inferred
    if name != "-":
        name = " ".join(name.splitlines()[0].split())
        if (
            name.lower() in _GREETINGS_NAME
            or _is_business_like_line(name)
            or _is_request_like_line(name)
        ):
            name = "-"
    if name == "-":
        for line in reversed(lines[-8:]):
            if _is_plausible_person_name_line(line):
                name = line
                break
    if name != "-":
        return name[:60]
    return "-"


def _conversation_detail(raw_str: str, *, max_len: int = 2800) -> str:
    t = (raw_str or "").strip()
    if not t:
        return "-"
    if len(t) > max_len:
        return "…\n" + t[-(max_len - 2) :]
    return t


_GREETING_SNIPPET = frozenset(
    {"selam", "merhaba", "hey", "günaydın", "gunaydin", "iyi", "slm", "sa", "hello", "hi"}
)


def _line_is_phone_or_contact_tail(line: str) -> bool:
    """Telefon / iletişim satırı — snippet’te tekrar etmesin (📞 ile çakışır)."""
    s = line.strip()
    if not s:
        return True
    if _extract_name_from_contact_tail(s):
        return True
    d = _digits_only(s)
    if len(d) >= 10 and len(re.sub(r"\s+", "", s)) <= 22:
        return sum(1 for c in s if c.isdigit()) >= 10
    return False


# Karar öncesi / belirsizlik sinyalleri (yüksek değer lead)
_UNCERTAINTY_PHRASES: tuple[str, ...] = (
    "yanlış mı düşünüyorum",
    "yanlis mi dusunuyorum",
    "emin değilim",
    "emin degilim",
    "doğru mu",
    "dogru mu",
    "nasıl olmalı",
    "nasil olmali",
)


def has_decision_risk_signal(message: str) -> bool:
    """Tereddit, doğrulama ihtiyacı veya uzman görüşü arayan ifadeler."""
    n = _norm_business(message)
    if not n:
        return False
    for phrase in _UNCERTAINTY_PHRASES:
        if phrase in n:
            return True
    return bool(re.search(r"\bsizce\b", n))


def critical_expression_snippet(transcript: str, *, max_len: int = 200) -> str:
    """Belirsizlik içeren satır(lar); yoksa genel snippet."""
    raw = (transcript or "").strip()
    if not raw:
        return "-"
    hits: list[str] = []
    for ln in raw.splitlines():
        s = ln.strip()
        if not s:
            continue
        t = _norm_business(s)
        if any(p in t for p in _UNCERTAINTY_PHRASES) or re.search(r"\bsizce\b", t):
            hits.append(s)
    if not hits:
        return conversation_snippet_for_telegram(raw, max_len=max_len)
    tail = hits[-2:]
    text = " · ".join(tail)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > max_len:
        text = text[: max_len - 1] + "…"
    return text


def conversation_snippet_for_telegram(transcript: str, *, max_len: int = 200) -> str:
    """
    Son 1–2 anlamlı kullanıcı satırı; kısa, tekrarsız, satış için tarama.
    Tam konuşma değildir.
    """
    raw = (transcript or "").strip()
    if not raw:
        return "-"
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    if not lines:
        return "-"

    deduped: list[str] = []
    for ln in lines:
        if deduped and deduped[-1] == ln:
            continue
        deduped.append(ln)

    tail = deduped[-2:]
    if len(tail) == 2:
        a, b = tail[0].lower(), tail[1].lower()
        if a in _GREETING_SNIPPET and b not in _GREETING_SNIPPET:
            tail = [tail[1]]
        elif a in _GREETING_SNIPPET and b in _GREETING_SNIPPET:
            tail = [tail[1]]

    chosen: list[str] = []
    for ln in tail:
        if not _line_is_phone_or_contact_tail(ln):
            chosen.append(ln)

    if not chosen:
        for ln in reversed(deduped):
            if not _line_is_phone_or_contact_tail(ln):
                chosen = [ln]
                break
    if not chosen:
        return "-"

    if len(chosen) >= 2:
        text = f"{chosen[0]} · {chosen[1]}"
    else:
        text = chosen[0]

    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > max_len:
        text = text[: max_len - 1] + "…"
    return text


def extract_needs(message: str) -> str:
    raw = message or ""
    n = _norm(raw)
    compact = re.sub(r"\s+", "", n)
    found: list[str] = []

    m = re.search(r"(\d+)\s*kasa", n)
    if m:
        found.append(f"{m.group(1)} kasa")

    if "yazarkasa" in compact or "yazarkasa" in n:
        found.append("Yazarkasa")
    if "yazıcı" in raw.lower() or "yazici" in n:
        found.append("Yazıcı")
    if "dokunmatik" in n:
        found.append("Dokunmatik ekran")
    if "mutfak" in n and ("ekran" in n or "display" in n):
        found.append("Mutfak ekranı")
    if re.search(r"\bpos\b", n) or "pos cihaz" in n:
        found.append("POS")
    if "terminal" in n:
        found.append("Terminal")
    if "online" in n and "sipariş" in raw.lower():
        found.append("Online sipariş")
    if "online" in n and "siparis" in n:
        found.append("Online sipariş")
    if "entegrasyon" in n:
        found.append("Entegrasyon")
    if "stok" in n:
        found.append("Stok")
    if "rapor" in n:
        found.append("Raporlama")
    if "şube" in raw.lower() or "sube" in n:
        if "çok şubeli" not in " ".join(found).lower():
            found.append("Çok şube")
    if "patron" in n and ("uygulama" in n or "app" in n):
        found.append("Patron / uzaktan kontrol")

    return ", ".join(dict.fromkeys(found)) if found else "-"


def extract_branch_count(message: str) -> str:
    """
    Mesajdan şube adedi (rakam) veya çok şube olduğu halde sayı yoksa kısa not.
    """
    raw = (message or "").strip()
    if not raw:
        return "-"
    n = unicodedata.normalize("NFKC", raw.lower())
    n = re.sub(r"\s+", " ", n)

    for pat in (
        r"şube\s*(?:sayısı|sayisi|sayi)?\s*[:=]?\s*(\d{1,3})\b",
        r"(\d{1,3})\s*(?:adet|tane|[x×])?\s*şube",
        r"(\d{1,3})\s*şubeli",
        r"(\d{1,3})\s*şubemiz",
        r"(\d{1,3})\s*şubem\b",
        r"(\d{1,3})\s*şubesi",
        r"(\d{1,3})\s*şubede\b",
        r"(\d{1,3})\s*şubeye\b",
        r"(\d{1,3})\s*şubeden\b",
    ):
        m = re.search(pat, n, re.UNICODE)
        if m:
            num = int(m.group(1))
            if 1 <= num <= 999:
                return str(num)

    if re.search(r"\b(çok|birden\s+fazla|çoklu)\s+şube", n) or re.search(
        r"\bşubeler(im|imiz|i)?\b", n
    ):
        return "Belirtilmedi (çok şube)"
    if "şube" in n or "sube" in n:
        return "Belirtilmedi"
    return "-"


def extract_branch_plan(message: str) -> str:
    """
    Şube stratejisi: yeni açılış, genişleme, şube başına set vb. (metin, satış için özet).
    """
    n = _norm_business(message)
    if not n:
        return "-"
    if re.search(r"açacağım|açacağız|kuracağım|kuruyoruz|yeni\s+işletme|yeni\s+iş", n):
        if "şube" in n or "sube" in n or "mağaza" in n or "magaza" in n:
            return "Yeni işletme / çok şubeli roll-out planı"
        return "Yeni işletme açılışı"
    if re.search(r"şube\s+ekle|yeni\s+şube|şubelerimiz|şubelerim|çoklu\s+şube", n):
        return "Mevcut operasyona şube ekleme veya genişleme"
    if "her şubede" in n or "her subede" in n or "şube başına" in n or "sube basina" in n:
        return "Şubeler arası standart donanım (şube başına aynı set)"
    if re.search(r"\b(çok|birden\s+fazla|çoklu)\s+şube", n) or "çok şube" in n:
        return "Çok şubeli operasyon"
    if "şube" in n or "sube" in n:
        return "Şube / lokasyon vurgusu (detay mesajda)"
    return "-"


_HWARE_PATTERN = re.compile(
    r"(?P<num>\d{1,3})\s*(?:adet|tane|[x×])?\s*"
    r"(?P<kind>anakasa|ana\s*kasa|terminal|yazarkasa|yazar\s*kasa|yazıcı|yazici|"
    r"para\s*çekmecesi|para\s*cekmece|çekmece|pos\s*cihaz|\bpos\b|"
    r"dokunmatik(?:\s*ekran)?|mutfak\s*ekranı|mutfak\s*ekrani|mutfak\s*ekran|\bekran\b)",
    re.IGNORECASE | re.UNICODE,
)


def _canonical_hw_label(kind: str) -> str:
    k = unicodedata.normalize("NFKC", kind.lower())
    k = re.sub(r"\s+", " ", k.strip())
    if "anakasa" in k or ("ana" in k and "kasa" in k):
        return "Anakasa"
    if "terminal" in k:
        return "Terminal"
    if "yazarkasa" in k or "yazar" in k:
        return "Yazarkasa"
    if "yazı" in k or "yazici" in k:
        return "Yazıcı"
    if "para" in k and "çek" in k:
        return "Para çekmecesi"
    if k == "çekmece" or "cekmece" in k:
        return "Para çekmecesi"
    if "pos" in k:
        return "POS"
    if "mutfak" in k:
        return "Mutfak ekranı"
    if "dokunmatik" in k:
        return "Dokunmatik ekran"
    if "ekran" in k:
        return "Ekran"
    return ""


def _hardware_per_branch_context(n: str) -> bool:
    return bool(
        re.search(
            r"her\s+şubede|her\s+subede|şube\s+başı|sube\s+basi|"
            r"şubede\b|subede\b|her\s+şube|her\s+sube",
            n,
            re.IGNORECASE,
        )
    )


def extract_hardware_counts(message: str) -> tuple[dict[str, int], bool]:
    """
    Adet + donanım türü; ikinci dönüş şube başına bağlamı var mı.
    """
    raw = message or ""
    n = unicodedata.normalize("NFKC", raw.lower())
    n = re.sub(r"\s+", " ", n)
    per_branch = _hardware_per_branch_context(n)
    counts: dict[str, int] = {}
    for m in _HWARE_PATTERN.finditer(n):
        label = _canonical_hw_label(m.group("kind"))
        if not label:
            continue
        num = int(m.group("num"))
        if not 1 <= num <= 999:
            continue
        counts[label] = counts.get(label, 0) + num
    return counts, per_branch


def format_hardware_telegram(counts: dict[str, int], per_branch: bool) -> str:
    if not counts:
        return "-"
    scope = "Şube başına donanım" if per_branch else "Donanım (mesajdan)"
    lines = [f"• {label}: {qty}" for label, qty in sorted(counts.items(), key=lambda x: x[0])]
    return scope + "\n" + "\n".join(lines)


def extract_intent(message: str, *, contact_only: bool = False) -> str:
    """Satış ekibi için kısa, eyleme dönük niyet satırı."""
    if contact_only:
        return "İletişim paylaştı — hızlı teyit + ön görüşme"
    raw = message or ""
    t0 = unicodedata.normalize("NFKC", raw.strip().lower()).replace("i̇", "i")
    n_only = re.sub(r"[^\wçğıöşü]+", "", t0)
    if n_only == "istiyorum":
        return "Kısa talep — teklif veya bilgi için arama (öncelikli ilk dönüş)"

    if has_decision_risk_signal(raw):
        return (
            "Karar öncesi danışmanlık ihtiyacı — müşteri emin değil; "
            "güven veren yönlendirme ve net öneri kritik (öncelikli lead)"
        )

    n = _norm_business(message)

    hw_counts, _ = extract_hardware_counts(raw)
    has_hw = bool(hw_counts)
    multi_branch = ("şube" in n or "sube" in n) or ("çok" in n and "şube" in n)
    opening = bool(
        re.search(
            r"açacağım|açacağız|açıyoruz|kuracağım|kuruyoruz|yeni\s+işletme|yeni\s+iş",
            n,
        )
    )

    if "teklif" in n:
        return "Resmi teklif istiyor — fiyatlandırma ve ürün seti netleştirin"
    if "fiyat" in n or "ücret" in raw.lower() or "ucret" in n:
        return "Bütçe / maliyet soruyor — rakam + paket önerisi hazırlayın"
    if "demo" in n:
        return "Canlı demo talebi — randevu ve sahada gösterim planlayın"
    if "kurulum" in n or "montaj" in n:
        return "Kurulum / saha montajı — teknik keşif ve zaman planı"
    if "görüşme" in raw.lower() or "gorusme" in n:
        return "Görüşme istiyor — üst segment veya karar verici dahil edin"
    if "ara" in n and ("beni" in n or "geri" in n):
        return "Geri arama talebi — aynı gün dönüş önerilir"
    if "sipariş" in raw.lower() or "siparis" in n:
        return "Operasyon / sipariş süreci — mevcut müşteri veya hızlı satış"

    if opening and (multi_branch or has_hw):
        return "Yeni işletme ve donanım planı — teklif + keşif görüşmesi (sıcak lead)"
    if opening:
        return "Yeni işletme açılışı — segment ve ihtiyaç doğrulaması yapın"
    if multi_branch and has_hw:
        return "Çok şubeli donanım ihtiyacı — şube başına set ve toplam ölçekleme"

    if "bilgi" in n or "öğrenmek" in raw.lower() or "ogrenmek" in n:
        return "Ürün bilgisi topluyor — kısa arama ile nitelendirin ve sonraki adımı kapatın"

    if _BUSINESS_UTTERANCE.search(raw) and has_hw:
        return "Donanım ve operasyon detayı verdi — teklif hazırlığına uygun"

    return "Genel talep — ön görüşmede segment, şube ve ürün netleştirin"


def compose_executive_summary(
    *,
    isletme: str,
    display_isletme: str,
    ihtiyac: str,
    intent: str,
    ad: str,
    telefon: str,
    only_phone_line: bool,
    raw_message: str,
    high_value_consultation: bool = False,
) -> str:
    """1–2 cümle satış özeti; kurulum/niyet tekrarı yok (Telegram’da ayrı bloklar)."""
    r = (raw_message or "").strip()
    if only_phone_line and telefon != "-":
        return "Numara bırakılmış; arayıp ihtiyacı netleştirin."
    if isletme == "-" and ihtiyac == "-" and ad != "-" and telefon != "-":
        return f"{ad} ulaşım için numara vermiş. Kısa aramayla segment ve kurulumu sorun."

    who = ad if ad != "-" else "Müşteri"
    s1 = f"{who}, {display_isletme} bağlamında talep bıraktı."
    s2 = intent
    if high_value_consultation:
        s2 = f"{s2} Aynı gün öncelikli dönüş önerilir."
    out = f"{s1} {s2}".strip()
    if len(out) > 360:
        return out[:357] + "…"
    return out


def compose_ai_style_summary(
    isletme: str,
    ihtiyac: str,
    durum: str,
    raw_message: str,
    *,
    ad: str,
    telefon: str,
    only_phone_line: bool,
) -> str:
    """Backward-compatible wrapper; prefer :func:`compose_executive_summary`."""
    disp = _display_isletme_for_telegram(isletme, raw_message)
    return compose_executive_summary(
        isletme=isletme,
        display_isletme=disp,
        ihtiyac=ihtiyac,
        intent=durum,
        ad=ad,
        telefon=telefon,
        only_phone_line=only_phone_line,
        raw_message=raw_message,
        high_value_consultation=False,
    )


def format_telegram_lead_body(lead: dict[str, Any]) -> str:
    """Full Telegram text from persisted lead row."""
    raw_msg = lead.get("message")
    raw_str = raw_msg if isinstance(raw_msg, str) else (str(raw_msg) if raw_msg else "")
    phone_raw = lead.get("phone")
    phone_str = phone_raw if isinstance(phone_raw, str) else (str(phone_raw) if phone_raw else "")

    name = pick_display_name(lead, raw_str, phone_str)
    inferred_for_flag = infer_name_from_message(raw_str, phone_str)

    phone = _dash(lead.get("phone"))
    email = _dash(lead.get("email"))
    tarih = _dash(lead.get("created_at"))

    isletme = extract_business_type(raw_str)
    display_isletme = _display_isletme_for_telegram(isletme, raw_str)
    ihtiyac = extract_needs(raw_str)
    sube = extract_branch_count(raw_str)
    branch_plan = extract_branch_plan(raw_str)
    hw_counts, hw_per = extract_hardware_counts(raw_str)
    kurulum_block = _format_kurulum_block(ihtiyac, hw_counts, hw_per)
    only_phone = _message_is_only_phone_line(raw_str, phone_str)
    contact_only = (
        not only_phone
        and isletme == "-"
        and ihtiyac == "-"
        and inferred_for_flag != "-"
        and len(raw_str) <= 120
    )
    durum = extract_intent(raw_str, contact_only=contact_only)
    critical_buying_signal = has_decision_risk_signal(raw_str)
    ozet = compose_executive_summary(
        isletme=isletme,
        display_isletme=display_isletme,
        ihtiyac=ihtiyac,
        intent=durum,
        ad=name,
        telefon=phone,
        only_phone_line=only_phone,
        raw_message=raw_str,
        high_value_consultation=critical_buying_signal,
    )
    sube_text = _format_sube_lines(sube, branch_plan)
    if critical_buying_signal:
        konusma_baslik = "💬 Kritik ifade"
        konusma_metin = critical_expression_snippet(raw_str, max_len=200)
    else:
        konusma_baslik = "💬 Son konuşma"
        konusma_metin = conversation_snippet_for_telegram(raw_str, max_len=200)

    lines: list[str] = [
        "🚀 Yeni Sıcak Lead",
    ]
    if critical_buying_signal:
        lines.append("🔥 YÜKSEK DEĞERLİ LEAD — öncelikli takip")
    lines.extend(
        [
            "",
            f"👤 {name}",
            f"📞 {phone}",
        ]
    )
    if email != "-":
        lines.append(f"✉️ {email}")
    lines.extend(
        [
            "",
            f"🏪 {display_isletme}",
            f"📍 {sube_text}",
            "",
            "💻 Kurulum",
            kurulum_block,
            "",
            f"🎯 {durum}",
            "",
        ]
    )
    if critical_buying_signal:
        lines.extend(
            [
                "⚠️ Kritik durum",
                "Müşteri emin değil; rehberlik ve net öneri gerekiyor.",
                "",
            ]
        )
    lines.extend(
        [
            f"🧠 {ozet}",
            "",
            konusma_baslik,
            konusma_metin,
            "",
            f"📅 {tarih}",
        ]
    )
    return "\n".join(lines)
