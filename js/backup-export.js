/**
 * Tarayıcıdaki dinamik_* localStorage verilerini JSON olarak indirir (yedek).
 */
(function () {
  'use strict';

  function collectDinamikKeys() {
    var out = {};
    var i;
    var k;
    for (i = 0; i < localStorage.length; i++) {
      k = localStorage.key(i);
      if (k && k.indexOf('dinamik_') === 0) {
        out[k] = localStorage.getItem(k);
      }
    }
    return out;
  }

  function downloadBackup() {
    var payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      keys: collectDinamikKeys()
    };
    var json = JSON.stringify(payload, null, 2);
    var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    var a = document.createElement('a');
    var url = URL.createObjectURL(blob);
    a.href = url;
    a.download = 'dinamik-yedek-' + new Date().toISOString().slice(0, 10) + '.json';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Dosya okunamadı veya geçersiz JSON.');
    }
    if (payload.version !== 1) {
      throw new Error('Bu yedek sürümü desteklenmiyor (version: ' + String(payload.version) + ').');
    }
    var keys = payload.keys;
    if (!keys || typeof keys !== 'object') {
      throw new Error('Yedekte "keys" alanı yok.');
    }
    var count = 0;
    Object.keys(keys).forEach(function (k) {
      if (!k || k.indexOf('dinamik_') !== 0) return;
      var v = keys[k];
      if (v === null || v === undefined) return;
      localStorage.setItem(
        k,
        typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : JSON.stringify(v)
      );
      count++;
    });
    return count;
  }

  function readFileAsJson(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var raw = reader.result;
        if (typeof raw === 'string' && raw.charCodeAt(0) === 0xfeff) {
          raw = raw.slice(1);
        }
        var data = JSON.parse(raw);
        cb(null, data);
      } catch (e) {
        cb(new Error('JSON ayrıştırılamadı.'));
      }
    };
    reader.onerror = function () {
      cb(new Error('Dosya okunamadı.'));
    };
    reader.readAsText(file, 'UTF-8');
  }

  window.DinamikBackupExport = {
    collectKeys: collectDinamikKeys,
    download: downloadBackup,
    importPayload: importPayload
  };

  var btn = document.getElementById('btn-backup-export');
  if (btn) {
    btn.addEventListener('click', function () {
      downloadBackup();
    });
  }

  var btnImport = document.getElementById('btn-backup-import');
  var fileInput = document.getElementById('backup-import-file');
  if (btnImport && fileInput) {
    btnImport.addEventListener('click', function () {
      fileInput.value = '';
      fileInput.click();
    });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      readFileAsJson(f, function (err, data) {
        if (err) {
          alert(err.message);
          return;
        }
        if (
          !confirm(
            'Mevcut bu tarayıcıdaki tüm dinamik_* verileri yedekteki değerlerle değiştirilecek. Devam edilsin mi?'
          )
        ) {
          return;
        }
        try {
          var n = importPayload(data);
          try {
            window.dispatchEvent(new CustomEvent('dinamik:campaigns-updated'));
          } catch (e) {}
          alert('Yedek yüklendi (' + n + ' anahtar). Sayfa yenileniyor.');
          window.location.reload();
        } catch (e2) {
          alert(e2.message || 'Yükleme başarısız.');
        }
      });
    });
  }
})();
