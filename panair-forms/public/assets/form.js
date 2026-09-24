/* Клиентска валидация с български съобщения. Сървърът проверява всичко отново. */
(function () {
  'use strict';
  var form = document.querySelector('form.app-form');
  if (!form) return;

  var maxMb = parseFloat(form.getAttribute('data-max-file-mb')) || 10;
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var telRe = /^\+?[0-9\s()\-\/.]+$/;

  function eikValid(v) {
    v = v.replace(/[\s.\-]/g, '').toUpperCase();
    if (v.indexOf('BG') === 0) v = v.slice(2);
    var d, s, i, r;
    function c9(x) {
      d = x.split('').map(Number); s = 0;
      for (i = 0; i < 8; i++) s += d[i] * (i + 1);
      r = s % 11;
      if (r === 10) { s = 0; for (i = 0; i < 8; i++) s += d[i] * (i + 3); r = s % 11; if (r === 10) r = 0; }
      return r === d[8];
    }
    if (/^\d{9}$/.test(v)) return c9(v);
    if (/^\d{13}$/.test(v)) {
      if (!c9(v.slice(0, 9))) return false;
      d = v.split('').map(Number);
      s = d[8] * 2 + d[9] * 7 + d[10] * 3 + d[11] * 5; r = s % 11;
      if (r === 10) { s = d[8] * 4 + d[9] * 9 + d[10] * 5 + d[11] * 7; r = s % 11; if (r === 10) r = 0; }
      return r === d[12];
    }
    if (/^\d{10}$/.test(v)) return true;
    return /^[A-Z]{2}[0-9A-Z]{2,13}$/.test(v);
  }

  function setError(wrap, msg) {
    var p = wrap.querySelector('.error-msg');
    if (p) p.textContent = msg || '';
    wrap.classList.toggle('has-error', !!msg);
    wrap.querySelectorAll('input,select,textarea').forEach(function (el) {
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
    });
  }

  function checkField(wrap) {
    var group = wrap.querySelector('.choice-group');
    if (group) {
      var any = group.querySelector('input:checked');
      return group.hasAttribute('data-required') && !any ? 'Изберете опция.' : '';
    }
    var el = wrap.querySelector('input,select,textarea');
    if (!el) return '';
    if (el.type === 'checkbox') return el.required && !el.checked ? 'Необходимо е потвърждение.' : '';
    if (el.type === 'file') {
      var files = Array.prototype.slice.call(el.files || []);
      if (el.required && !files.length) return 'Прикачете файл.';
      var max = parseInt(el.getAttribute('data-max-files') || '1', 10);
      if (files.length > max) return 'Може да прикачите най-много ' + max + ' файла.';
      var lim = parseFloat(el.getAttribute('data-max-mb')) || maxMb;
      var allowed = (el.getAttribute('accept') || '').toLowerCase().split(',');
      for (var i = 0; i < files.length; i++) {
        if (files[i].size > lim * 1048576) return 'Файлът „' + files[i].name + '“ е по-голям от ' + lim + ' MB.';
        var ext = '.' + files[i].name.split('.').pop().toLowerCase();
        if (allowed[0] && allowed.indexOf(ext) === -1) return 'Файлът „' + files[i].name + '“ е в неразрешен формат.';
      }
      return '';
    }
    var v = (el.value || '').trim();
    if (!v) return el.required ? 'Полето е задължително.' : '';
    var t = el.getAttribute('data-type') || el.type;
    if (t === 'email' && !emailRe.test(v)) return 'Невалиден имейл адрес.';
    if (t === 'tel') {
      var digits = v.replace(/\D/g, '').length;
      if (!telRe.test(v) || digits < 6 || digits > 15) return 'Невалиден телефонен номер.';
    }
    if (t === 'eik' && !eikValid(v)) return 'Невалиден ЕИК/БУЛСТАТ (проверете цифрите).';
    if (t === 'number') {
      var n = parseFloat(v.replace(',', '.'));
      if (isNaN(n)) return 'Въведете число.';
      if (el.min !== '' && n < parseFloat(el.min)) return 'Минималната стойност е ' + el.min + '.';
      if (el.max !== '' && n > parseFloat(el.max)) return 'Максималната стойност е ' + el.max + '.';
    }
    if (el.pattern && !new RegExp('^(?:' + el.pattern + ')$').test(v)) return 'Невалиден формат.';
    return '';
  }

  var fields = form.querySelectorAll('.field[data-field]');
  fields.forEach(function (wrap) {
    var handler = function () { if (wrap.classList.contains('has-error') || this.type === 'file') setError(wrap, checkField(wrap)); };
    wrap.addEventListener('change', handler);
    wrap.addEventListener('focusout', function () { setError(wrap, checkField(wrap)); });
  });

  form.addEventListener('submit', function (ev) {
    var first = null;
    fields.forEach(function (wrap) {
      var msg = checkField(wrap);
      setError(wrap, msg);
      if (msg && !first) first = wrap;
    });
    if (first) {
      ev.preventDefault();
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var el = first.querySelector('input,select,textarea');
      if (el) el.focus({ preventScroll: true });
      return;
    }
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Изпращане…';
    var note = form.querySelector('.sending-note');
    if (note) note.hidden = false;
  });

  var errBox = document.getElementById('form-errors');
  if (errBox) {
    var firstErr = form.querySelector('.has-error');
    (firstErr || errBox).scrollIntoView({ block: 'center' });
  }
})();
