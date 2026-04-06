/**
 * AI Satis Asistani - soru akisi, paket onerisi, lead kaydi
 */
(function () {
  'use strict';

  var root = document.getElementById('ai-assistant-widget');
  if (!root) return;

  var state = {
    step: 0,
    answers: {}
  };

  var steps = [
    { key: 'business_type', title: 'Isletme turu nedir?', options: ['Kafe', 'Restoran', 'Fast Food', 'Pastane', 'Diger'] },
    { key: 'table_count', title: 'Masa sayiniz kac?', options: ['0-10', '11-25', '26-50', '50+'] },
    { key: 'delivery_status', title: 'Paket servis durumunuz?', options: ['Yok', 'Var (dusuk)', 'Var (yuksek)'] },
    { key: 'branch_count', title: 'Sube sayiniz?', options: ['1', '2-3', '4+'] },
    { key: 'biggest_problem', title: 'En buyuk operasyon sorununuz?', options: ['Yavas siparis akisi', 'Stok takibi', 'Personel hatalari', 'Raporlama eksigi', 'Musteri kaybi'] }
  ];

  function packageScore() {
    var s = 0;
    var a = state.answers;
    if (a.table_count === '26-50') s += 2;
    if (a.table_count === '50+') s += 3;
    if (a.delivery_status === 'Var (yuksek)') s += 3;
    if (a.delivery_status === 'Var (dusuk)') s += 1;
    if (a.branch_count === '2-3') s += 2;
    if (a.branch_count === '4+') s += 4;
    if (a.biggest_problem === 'Raporlama eksigi' || a.biggest_problem === 'Stok takibi') s += 1;
    return s;
  }

  function recommendedPackage() {
    var score = packageScore();
    if (score >= 6) return 'Zincir';
    if (score >= 3) return 'Profesyonel';
    return 'Baslangic';
  }

  function renderQuestion() {
    var q = steps[state.step];
    root.innerHTML =
      '<h3 class="ai-step-title">' + q.title + '</h3>' +
      '<p class="ai-step-help">Adim ' + (state.step + 1) + ' / ' + steps.length + '</p>' +
      '<div class="ai-options">' +
      q.options.map(function (opt) {
        return '<button type="button" class="ai-option-btn" data-opt="' + opt.replace(/"/g, '&quot;') + '">' + opt + '</button>';
      }).join('') +
      '</div>';
    root.querySelectorAll('.ai-option-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.answers[q.key] = btn.getAttribute('data-opt');
        state.step += 1;
        if (state.step >= steps.length) {
          renderResult();
        } else {
          renderQuestion();
        }
      });
    });
  }

  function renderResult() {
    var pkg = recommendedPackage();
    root.innerHTML =
      '<h3 class="ai-step-title">Size Onerilen Paket: ' + pkg + '</h3>' +
      '<div class="ai-recommend-card">' +
      '<p><strong>' + pkg + '</strong> paketi, operasyon ihtiyaciniza gore en uygun secenek olarak gorunuyor.</p>' +
      '<p>Bilgilerinizi birakin, ekibimiz sizi hizlica arasın.</p>' +
      '</div>' +
      '<form id="ai-lead-form" class="ai-lead-form">' +
      '<div class="form-group"><label for="ai-name">Ad Soyad *</label><input id="ai-name" name="name" class="input" required minlength="2" autocomplete="name"></div>' +
      '<div class="form-group"><label for="ai-phone">Telefon *</label><input id="ai-phone" name="phone" class="input" required autocomplete="tel" placeholder="05XX XXX XX XX"></div>' +
      '<div class="form-group"><label for="ai-business">Isletme Adi *</label><input id="ai-business" name="business_name" class="input" required minlength="2"></div>' +
      '<button type="submit" class="btn btn-primary btn-block">Lead Kaydini Olustur</button>' +
      '</form>';

    var form = document.getElementById('ai-lead-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitLead(pkg, form);
    });
  }

  function submitLead(pkg, form) {
    var name = (form.name.value || '').trim();
    var phone = (form.phone.value || '').replace(/\D/g, '');
    var business = (form.business_name.value || '').trim();
    if (name.length < 2 || phone.length < 10 || business.length < 2) {
      alert('Lutfen tum alanlari dogru doldurun.');
      return;
    }
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Kaydediliyor...';

    var base = typeof window.getDinamikApiBase === 'function' ? window.getDinamikApiBase() : '';
    fetch((base || '') + '/api/csrf-token')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.token) throw new Error('csrf');
        return fetch((base || '') + '/api/leads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': d.token
          },
          body: JSON.stringify({
            name: name,
            phone: phone,
            business_name: business,
            recommended_package: pkg,
            answers: state.answers,
            csrf_token: d.token
          })
        });
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.error) throw new Error((data && data.error) || 'lead');
        root.innerHTML = '<div class="ai-recommend-card"><h3>Harika! Kaydiniz alindi.</h3><p>Ekibimiz en kisa surede sizinle iletisime gececek.</p></div>';
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Lead Kaydini Olustur';
        alert('Kayit sirasinda bir hata olustu. Lutfen tekrar deneyin.');
      });
  }

  renderQuestion();
})();
