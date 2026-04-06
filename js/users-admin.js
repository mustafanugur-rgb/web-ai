/**
 * Kullanıcı yönetimi - rol ve yetki tanımlama
 * Admin dışında panel kullanıcıları ekleme
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'dinamik_users';
  var ROLE_LABELS = { yonetici: 'Yönetici', kasiyer: 'Kasiyer', garson: 'Garson', musteri: 'Müşteri' };
  var ROLE_PERMS = {
    yonetici: ['dashboard', 'raporlar', 'crm', 'urunler', 'siparisler', 'kampanyalar', 'ayarlar', 'kullanicilar', 'ortaklar'],
    kasiyer: ['dashboard', 'raporlar', 'siparisler', 'urunler'],
    garson: ['dashboard', 'siparisler'],
    musteri: []
  };

  function getUsers() {
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : [];
    } catch (e) {}
    return [];
  }

  function setUsers(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  function generateId() {
    return 'u' + Date.now() + Math.random().toString(36).slice(2, 8);
  }

  function renderUsers() {
    var tbody = document.getElementById('users-tbody');
    var empty = document.getElementById('users-empty');
    if (!tbody) return;

    var users = getUsers();
    if (!users.length) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = users.map(function (u) {
      var roleClass = 'user-role-' + (u.role || 'yonetici');
      var roleLabel = ROLE_LABELS[u.role] || u.role;
      var perms = (u.permissions || []).join(', ') || '—';
      var status = u.active !== false ? 'Aktif' : 'Pasif';
      return '<tr data-id="' + (u.id || '') + '">' +
        '<td>' + (u.name || '').replace(/</g, '&lt;') + '</td>' +
        '<td>' + (u.email || '').replace(/</g, '&lt;') + '</td>' +
        '<td><span class="user-role-badge ' + roleClass + '">' + roleLabel + '</span></td>' +
        '<td>' + perms.replace(/</g, '&lt;') + '</td>' +
        '<td>' + status + '</td>' +
        '<td>' +
          '<button type="button" class="btn btn-secondary btn-sm btn-edit-user" data-id="' + (u.id || '') + '">Düzenle</button> ' +
          '<button type="button" class="btn btn-secondary btn-sm btn-delete-user" data-id="' + (u.id || '') + '">Sil</button>' +
        '</td></tr>';
    }).join('');

    tbody.querySelectorAll('.btn-edit-user').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openModal(btn.getAttribute('data-id'));
      });
    });
    tbody.querySelectorAll('.btn-delete-user').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
          var id = btn.getAttribute('data-id');
          var users = getUsers().filter(function (u) { return u.id !== id; });
          setUsers(users);
          renderUsers();
        }
      });
    });
  }

  function openModal(id) {
    var modal = document.getElementById('user-modal');
    var title = document.getElementById('user-modal-title');
    var form = document.getElementById('user-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('user-id').value = id || '';

    if (id) {
      var users = getUsers();
      var u = users.find(function (x) { return x.id === id; });
      if (u) {
        title.textContent = 'Kullanıcı Düzenle';
        document.getElementById('user-name').value = u.name || '';
        document.getElementById('user-email').value = u.email || '';
        document.getElementById('user-email').readOnly = true;
        document.getElementById('user-role').value = u.role || 'yonetici';
        document.getElementById('user-active').checked = u.active !== false;
        (u.permissions || []).forEach(function (p) {
          var cb = form.querySelector('input[name="perm"][value="' + p + '"]');
          if (cb) cb.checked = true;
        });
      }
    } else {
      title.textContent = 'Yeni Kullanıcı';
      document.getElementById('user-email').readOnly = false;
      var role = document.getElementById('user-role').value;
      setPermsByRole(role);
    }

    modal.classList.add('visible');
  }

  function setPermsByRole(role) {
    var perms = ROLE_PERMS[role] || [];
    document.querySelectorAll('#user-form input[name="perm"]').forEach(function (cb) {
      cb.checked = perms.indexOf(cb.value) !== -1;
    });
  }

  function closeModal() {
    var modal = document.getElementById('user-modal');
    if (modal) modal.classList.remove('visible');
  }

  document.getElementById('btn-add-user')?.addEventListener('click', function () {
    openModal(null);
  });

  document.getElementById('user-modal-close')?.addEventListener('click', closeModal);

  document.getElementById('user-modal')?.addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  document.getElementById('user-role')?.addEventListener('change', function () {
    if (!document.getElementById('user-id').value) {
      setPermsByRole(this.value);
    }
  });

  document.getElementById('user-form')?.addEventListener('submit', function (e) {
    e.preventDefault();

    var id = document.getElementById('user-id').value;
    var name = (document.getElementById('user-name').value || '').trim();
    var email = (document.getElementById('user-email').value || '').trim().toLowerCase();
    var password = document.getElementById('user-password').value;
    var role = document.getElementById('user-role').value;
    var active = document.getElementById('user-active').checked;

    var perms = [];
    document.querySelectorAll('#user-form input[name="perm"]:checked').forEach(function (cb) {
      perms.push(cb.value);
    });

    if (!name || name.length < 2) {
      alert('Ad soyad girin.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Geçerli e-posta girin.');
      return;
    }

    var users = getUsers();
    if (!id) {
      if (users.some(function (u) { return u.email === email; })) {
        alert('Bu e-posta adresi zaten kayıtlı.');
        return;
      }
      if (!password || password.length < 4) {
        alert('Yeni kullanıcı için en az 4 karakter şifre girin.');
        return;
      }
      users.push({
        id: generateId(),
        name: name,
        email: email,
        password: password,
        role: role,
        permissions: perms,
        active: active
      });
    } else {
      var idx = users.findIndex(function (u) { return u.id === id; });
      if (idx >= 0) {
        users[idx].name = name;
        users[idx].role = role;
        users[idx].permissions = perms;
        users[idx].active = active;
        if (password) users[idx].password = password;
      }
    }

    setUsers(users);
    renderUsers();
    closeModal();
  });

  renderUsers();
})();
