/**
 * Yönetim paneli — Çözüm Ortakları ve Referanslar sayfası
 * İki ayrı liste ve iki ayrı form: giren kişi karıştırmasın diye.
 */
(function () {
  'use strict';

  var listCozumEl = document.getElementById('ortaklar-list-cozum');
  var listReferansEl = document.getElementById('ortaklar-list-referans');
  var formCozumEl = document.getElementById('ortak-ekle-form-cozum');
  var formReferansEl = document.getElementById('ortak-ekle-form-referans');

  if (!window.DinamikOrtaklar) return;

  var editingCozumIndex = -1;
  var editingReferansIndex = -1;

  function renderItem(p, i, type) {
    var logo = p.logo ? '<img src="' + (p.logo || '').replace(/"/g, '&quot;') + '" alt="" style="height:36px;max-width:120px;object-fit:contain;">' : '';
    var link = (p.url && p.url !== '#') ? '<a href="' + (p.url || '').replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">' + (p.url || '') + '</a>' : '';
    var nameEsc = (p.name || '').replace(/</g, '&lt;');
    return '<li class="ortaklar-list-item" data-index="' + i + '" data-type="' + type + '">' +
      '<div class="ortaklar-list-preview">' + logo + '</div>' +
      '<div class="ortaklar-list-info"><strong>' + nameEsc + '</strong>' + (link ? ' — ' + link : '') + '</div>' +
      '<div class="ortaklar-list-actions">' +
      '<button type="button" class="btn btn-sm btn-secondary ortaklar-edit" data-index="' + i + '" data-type="' + type + '" aria-label="Düzenle">Düzenle</button> ' +
      '<button type="button" class="btn btn-sm btn-secondary ortaklar-delete" data-index="' + i + '" data-type="' + type + '" aria-label="Sil">Sil</button>' +
      '</div></li>';
  }

  function setCozumFormEditing(index) {
    editingCozumIndex = index;
    var btn = formCozumEl && formCozumEl.querySelector('button[type="submit"]');
    var iptal = document.getElementById('ortak-iptal-cozum');
    if (btn) btn.textContent = 'Güncelle';
    if (iptal) iptal.style.display = 'inline-block';
  }
  function setCozumFormAddMode() {
    editingCozumIndex = -1;
    var btn = formCozumEl && formCozumEl.querySelector('button[type="submit"]');
    var iptal = document.getElementById('ortak-iptal-cozum');
    if (btn) btn.textContent = 'Çözüm ortağı ekle';
    if (iptal) iptal.style.display = 'none';
    if (formCozumEl) formCozumEl.reset();
  }
  function setReferansFormEditing(index) {
    editingReferansIndex = index;
    var btn = formReferansEl && formReferansEl.querySelector('button[type="submit"]');
    var iptal = document.getElementById('ortak-iptal-referans');
    if (btn) btn.textContent = 'Güncelle';
    if (iptal) iptal.style.display = 'inline-block';
  }
  function setReferansFormAddMode() {
    editingReferansIndex = -1;
    var btn = formReferansEl && formReferansEl.querySelector('button[type="submit"]');
    var iptal = document.getElementById('ortak-iptal-referans');
    if (btn) btn.textContent = 'Referans ekle';
    if (iptal) iptal.style.display = 'none';
    if (formReferansEl) formReferansEl.reset();
  }

  function renderListCozum() {
    if (!listCozumEl) return;
    var partners = window.DinamikOrtaklar.getPartnersCozum();
    if (partners.length === 0) {
      listCozumEl.innerHTML = '<li class="stat-meta">Henüz çözüm ortağı eklenmemiş. Aşağıdaki formdan ekleyebilirsiniz.</li>';
      return;
    }
    listCozumEl.innerHTML = partners.map(function (p, i) { return renderItem(p, i, 'cozum'); }).join('');
    listCozumEl.querySelectorAll('.ortaklar-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-index'), 10);
        var p = partners[idx];
        if (!p) return;
        document.getElementById('ortak-name-cozum').value = p.name || '';
        document.getElementById('ortak-logo-cozum').value = p.logo || '';
        document.getElementById('ortak-url-cozum').value = (p.url && p.url !== '#') ? p.url : '';
        setCozumFormEditing(idx);
      });
    });
    listCozumEl.querySelectorAll('.ortaklar-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-index'), 10);
        var list = window.DinamikOrtaklar.getPartnersCozum().slice();
        list.splice(idx, 1);
        if (window.DinamikOrtaklar.savePartnersCozum(list)) {
          if (editingCozumIndex === idx) setCozumFormAddMode();
          else if (editingCozumIndex > idx) editingCozumIndex--;
          renderListCozum();
        }
      });
    });
  }

  function renderListReferans() {
    if (!listReferansEl) return;
    var partners = window.DinamikOrtaklar.getPartnersReferans();
    if (partners.length === 0) {
      listReferansEl.innerHTML = '<li class="stat-meta">Henüz referans eklenmemiş. Aşağıdaki formdan ekleyebilirsiniz.</li>';
      return;
    }
    listReferansEl.innerHTML = partners.map(function (p, i) { return renderItem(p, i, 'referans'); }).join('');
    listReferansEl.querySelectorAll('.ortaklar-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-index'), 10);
        var p = partners[idx];
        if (!p) return;
        document.getElementById('ortak-name-referans').value = p.name || '';
        document.getElementById('ortak-logo-referans').value = p.logo || '';
        document.getElementById('ortak-url-referans').value = (p.url && p.url !== '#') ? p.url : '';
        setReferansFormEditing(idx);
      });
    });
    listReferansEl.querySelectorAll('.ortaklar-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-index'), 10);
        var list = window.DinamikOrtaklar.getPartnersReferans().slice();
        list.splice(idx, 1);
        if (window.DinamikOrtaklar.savePartnersReferans(list)) {
          if (editingReferansIndex === idx) setReferansFormAddMode();
          else if (editingReferansIndex > idx) editingReferansIndex--;
          renderListReferans();
        }
      });
    });
  }

  if (formCozumEl) {
    formCozumEl.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('ortak-name-cozum').value.trim();
      var logo = document.getElementById('ortak-logo-cozum').value.trim();
      var url = document.getElementById('ortak-url-cozum').value.trim() || '#';
      if (!name || !logo) return;
      var list = window.DinamikOrtaklar.getPartnersCozum().slice();
      if (editingCozumIndex >= 0) {
        list[editingCozumIndex] = { name: name, logo: logo, url: url };
        setCozumFormAddMode();
      } else {
        list.push({ name: name, logo: logo, url: url });
        formCozumEl.reset();
      }
      if (window.DinamikOrtaklar.savePartnersCozum(list)) {
        renderListCozum();
      }
    });
  }
  var iptalCozum = document.getElementById('ortak-iptal-cozum');
  if (iptalCozum) iptalCozum.addEventListener('click', function () { setCozumFormAddMode(); });

  if (formReferansEl) {
    formReferansEl.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('ortak-name-referans').value.trim();
      var logo = document.getElementById('ortak-logo-referans').value.trim();
      var url = document.getElementById('ortak-url-referans').value.trim() || '#';
      if (!name || !logo) return;
      var list = window.DinamikOrtaklar.getPartnersReferans().slice();
      if (editingReferansIndex >= 0) {
        list[editingReferansIndex] = { name: name, logo: logo, url: url };
        setReferansFormAddMode();
      } else {
        list.push({ name: name, logo: logo, url: url });
        formReferansEl.reset();
      }
      if (window.DinamikOrtaklar.savePartnersReferans(list)) {
        renderListReferans();
      }
    });
  }
  var iptalReferans = document.getElementById('ortak-iptal-referans');
  if (iptalReferans) iptalReferans.addEventListener('click', function () { setReferansFormAddMode(); });

  /** Logo dosya yükleme: sunucuya gönderir, dönen URL’yi ilgili inputa yazar */
  function setupLogoUpload(fileInputId, urlInputId, statusId) {
    var fileInput = document.getElementById(fileInputId);
    var urlInput = document.getElementById(urlInputId);
    var statusEl = document.getElementById(statusId);
    if (!fileInput || !urlInput) return;
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var apiBase = typeof window.getDinamikApiBase === 'function' ? window.getDinamikApiBase() : (window.API_BASE || '');
      if (statusEl) { statusEl.style.display = ''; statusEl.textContent = 'Yükleniyor…'; }
      fetch(apiBase + '/api/csrf-token')
        .then(function (r) { return r.json(); })
        .then(function (csrfData) {
          var fd = new FormData();
          fd.append('logo', file);
          return fetch(apiBase + '/api/upload/partner-logo', {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': (csrfData && csrfData.token) || '' },
            body: fd
          });
        })
        .then(function (r) {
          if (!r.ok) throw new Error(r.statusText || 'Yükleme hatası');
          return r.json();
        })
        .then(function (data) {
          if (data && data.url) {
            urlInput.value = data.url;
            if (statusEl) { statusEl.textContent = 'Logo yüklendi.'; statusEl.style.display = ''; }
          }
          fileInput.value = '';
        })
        .catch(function () {
          if (statusEl) { statusEl.textContent = 'Yükleme başarısız (sunucu çalışıyor olmalı).'; statusEl.style.display = ''; }
          fileInput.value = '';
        });
    });
  }
  setupLogoUpload('ortak-logo-file-cozum', 'ortak-logo-cozum', 'ortak-logo-upload-status-cozum');
  setupLogoUpload('ortak-logo-file-referans', 'ortak-logo-referans', 'ortak-logo-upload-status-referans');

  renderListCozum();
  renderListReferans();
})();
