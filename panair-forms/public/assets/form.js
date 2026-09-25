/* Онлайн формуляри – поведение в браузъра:
   условни полета, избор на формуляри, повтарящи се групи, таблици с количества,
   ориентировъчна сума и валидация с български съобщения.
   Сървърът проверява всичко отново (src/Validator.php, src/Pricing.php). */
(function () {
  'use strict';
  var form = document.querySelector('form.app-form');
  if (!form) return;

  var maxMb = parseFloat(form.getAttribute('data-max-file-mb')) || 10;
  var vatRate = parseFloat(form.getAttribute('data-vat')) || 20;
  var rulesEl = document.getElementById('pricing-rules');
  var parts = rulesEl ? JSON.parse(rulesEl.textContent || '{}') : {};
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var telRe = /^\+?[0-9\s()\-\/.]+$/;

  function $$(sel, root) { return Array.prototype.slice.call((root || form).querySelectorAll(sel)); }
  function isHidden(el) { return !!el.closest('[hidden]'); }
  function chars(s) { return Array.from(s).length; }
  function num(v) { var n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; }
  function money(v) {
    if (v === null) return 'по договаряне';
    var s = v.toFixed(2).split('.');
    return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + s[1] + ' €';
  }
  function qtyText(q) { return String(Math.round(q * 100) / 100).replace('.', ','); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- стойности и условия ---------- */

  // Стойностите на видимите полета с дадено име (скритите се третират като празни — както на сървъра).
  function values(name, scope) {
    var full = scope ? scope + '[' + name + ']' : name;
    var out = [];
    $$('[name]').forEach(function (el) {
      if (el.name !== full && el.name !== full + '[]') return;
      if (isHidden(el) || el.disabled) return;
      if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) out.push(el.value); }
      else if (el.value.trim() !== '') out.push(el.value.trim());
    });
    return out;
  }

  function match(cond, scope) {
    if (!cond) return true;
    if (cond.all) return cond.all.every(function (c) { return match(c, scope); });
    if (cond.any) return cond.any.some(function (c) { return match(c, scope); });
    var vals = values(cond.field, scope);
    if ('equals' in cond) return vals.indexOf(String(cond.equals)) !== -1;
    if (cond['in']) return cond['in'].some(function (x) { return vals.indexOf(String(x)) !== -1; });
    if (cond.not_in) return !cond.not_in.some(function (x) { return vals.indexOf(String(x)) !== -1; });
    var empty = vals.length === 0 || (vals.length === 1 && vals[0] === '0');
    if (cond.filled || cond.checked) return !empty;
    if (cond.empty || cond.unchecked) return empty;
    return true;
  }

  function applyConditions() {
    for (var pass = 0; pass < 2; pass++) {
      $$('.part').forEach(function (part) {
        var body = part.querySelector('.part-body');
        var on;
        if (part.dataset.mode === 'required') on = true;
        else if (part.dataset.mode === 'auto') on = match(JSON.parse(part.dataset.autoIf));
        else { var t = part.querySelector('.part-toggle input'); on = !!(t && t.checked); }
        body.hidden = !on;
        part.classList.toggle('is-on', on);
        var li = document.querySelector('[data-summary-part="' + part.dataset.part + '"]');
        if (li) li.hidden = !on;
      });
      $$('[data-show-if]').forEach(function (el) {
        el.hidden = !match(JSON.parse(el.getAttribute('data-show-if')), el.getAttribute('data-scope') || '');
      });
    }
  }

  /* ---------- повтарящи се групи ---------- */

  function renumber(rep) {
    var rows = $$('.repeater-rows > .repeater-row', rep);
    rows.forEach(function (row, i) {
      var no = row.querySelector('.row-no');
      if (no) no.textContent = i + 1;
      var rm = row.querySelector('[data-remove-row]');
      if (rm) rm.hidden = rows.length <= Math.max(1, parseInt(rep.dataset.min || '0', 10));
    });
    var add = rep.querySelector('[data-add-row]');
    if (add) add.hidden = rows.length >= parseInt(rep.dataset.max || '20', 10);
  }

  function filledRows(rep) {
    return $$('.repeater-rows > .repeater-row', rep).filter(function (row) {
      return $$('input, select, textarea', row).some(function (el) {
        if (el.type === 'checkbox' || el.type === 'radio') return el.checked;
        return el.value.trim() !== '';
      });
    });
  }

  form.addEventListener('click', function (ev) {
    var add = ev.target.closest('[data-add-row]');
    if (add) {
      var rep = add.closest('.repeater');
      var tpl = rep.querySelector('template');
      var next = parseInt(rep.dataset.next || '0', 10);
      $$('.repeater-rows > .repeater-row', rep).forEach(function (row) {
        var m = (row.querySelector('[name]') || {}).name;
        m = m && m.match(/\[(\d+)\]\[[^\]]+\](\[\])?$/);
        if (m) next = Math.max(next, parseInt(m[1], 10) + 1);
      });
      rep.dataset.next = next + 1;
      var wrap = document.createElement('div');
      wrap.innerHTML = tpl.innerHTML.replace(/__INDEX__/g, String(next));
      var row = wrap.firstElementChild;
      rep.querySelector('.repeater-rows').appendChild(row);
      renumber(rep);
      refresh();
      var first = row.querySelector('input, select, textarea');
      if (first) first.focus();
      return;
    }
    var rm = ev.target.closest('[data-remove-row]');
    if (rm) {
      var rep2 = rm.closest('.repeater');
      rm.closest('.repeater-row').remove();
      renumber(rep2);
      refresh();
      var addBtn = rep2.querySelector('[data-add-row]');
      if (addBtn && !addBtn.hidden) addBtn.focus();
    }
  });

  /* ---------- таблици с количества ---------- */

  function updateQtyRow(input) {
    var tr = input.closest('tr');
    var q = num(input.value);
    var price = input.getAttribute('data-price');
    var cell = tr.querySelector('.row-total');
    tr.classList.toggle('is-ordered', q > 0);
    if (cell) cell.textContent = q > 0 ? (price === '' ? 'по договаряне' : money(q * parseFloat(price))) : '';
  }

  /* ---------- ориентировъчна сума ---------- */

  function items(v) { return v.join(' ').split(/[\s,;]+/).filter(Boolean); }

  function ruleLine(r) {
    var label = r.label || '';
    switch (r.type) {
      case 'fixed': return { label: label, qty: 1, unit: r.unit || 'бр.', price: r.amount };
      case 'qty': {
        var q = num(values(r.field)[0] || 0);
        if (q <= 0) return null;
        var price = r.price !== undefined ? r.price : null;
        if (r.price_by) {
          var key = values(r.price_by.field)[0] || '';
          if (!(key in r.price_by.map)) return null;
          price = r.price_by.map[key];
          if (r.price_by.labels && r.price_by.labels[key]) label += ' – ' + r.price_by.labels[key];
        }
        return { label: label, qty: q, unit: r.unit || 'м²', price: price };
      }
      case 'flag': return values(r.field).length ? { label: label, qty: 1, unit: r.unit || 'бр.', price: r.amount } : null;
      case 'chars': {
        var n = 0;
        r.fields.forEach(function (f) { n += chars(values(f).join('')); });
        var units = Math.ceil(Math.max(0, n - (r.free || 0)) / (r.chunk || 1));
        return units > 0 ? { label: label, qty: units, unit: r.unit || '× ' + r.chunk + ' знака', price: r.amount } : null;
      }
      case 'count': {
        var c = Math.max(0, items(values(r.field)).length - (r.free || 0));
        return c > 0 ? { label: label, qty: c, unit: r.unit || 'бр.', price: r.amount } : null;
      }
      case 'rows': {
        var wrap = form.querySelector('[data-field="' + r.field + '"] .repeater');
        var rows = wrap && !isHidden(wrap) ? filledRows(wrap).length : 0;
        return rows > 0 ? { label: label, qty: rows, unit: r.unit || 'бр.', price: r.amount } : null;
      }
    }
    return null;
  }

  function computePrices() {
    var box = form.querySelector('[data-price-lines]');
    if (!box) return;
    var html = '';
    var net = 0;
    $$('.part').forEach(function (partEl) {
      if (partEl.querySelector('.part-body').hidden) return;
      var p = parts[partEl.dataset.part];
      if (!p) return;
      var lines = [];
      (p.rules || []).forEach(function (r) { var l = ruleLine(r); if (l) lines.push(l); });
      $$('.qty-table input', partEl).forEach(function (inp) {
        var q = num(inp.value);
        if (q <= 0 || isHidden(inp)) return;
        var tr = inp.closest('tr');
        var pr = inp.getAttribute('data-price');
        lines.push({ label: tr.querySelector('.c-label label').firstChild.textContent.trim(), qty: q, unit: tr.querySelector('.c-unit').textContent, price: pr === '' ? null : parseFloat(pr) });
      });
      if (!lines.length) return;
      var sub = 0;
      html += '<div class="price-part"><p class="price-part-title">' + (p.code ? 'Ф' + esc(p.code) + ' · ' : '') + esc(p.title) + '</p><ul>';
      lines.forEach(function (l) {
        var t = l.price === null ? null : Math.round(l.qty * l.price * 100) / 100;
        sub += t || 0;
        html += '<li><span>' + esc(l.label) + ' <small>' + esc(qtyText(l.qty) + ' ' + l.unit) + '</small></span><b>' + money(t) + '</b></li>';
      });
      html += '</ul></div>';
      net += sub;
    });
    box.innerHTML = html || '<p class="muted">Попълнете площ или изберете услуги.</p>';
    var vat = Math.round(net * vatRate) / 100;
    form.querySelector('[data-price-net]').textContent = money(net);
    form.querySelector('[data-price-vat]').textContent = money(vat);
    form.querySelector('[data-price-gross]').textContent = money(net + vat);
    var bar = document.querySelector('[data-mobile-total]');
    if (bar) bar.textContent = money(net);
  }

  /* ---------- броячи на знаци ---------- */

  function updateCounter(el) {
    var c = el.parentNode.querySelector('.counter') || el.closest('.field').querySelector('.counter');
    if (!c) {
      c = document.createElement('p');
      c.className = 'counter';
      c.setAttribute('aria-live', 'polite');
      var anchor = el.closest('.input-wrap') || el;
      anchor.insertAdjacentElement('afterend', c);
    }
    var n = chars(el.value.trim());
    var max = el.getAttribute('maxlength');
    c.textContent = n + (max && max < 1000 ? ' / ' + max : '') + ' знака';
  }

  /* ---------- валидация ---------- */

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
    var p = wrap.querySelector(':scope > .error-msg');
    if (p) p.textContent = msg || '';
    wrap.classList.toggle('has-error', !!msg);
  }

  function checkField(wrap) {
    var type = wrap.getAttribute('data-type');
    var required = wrap.hasAttribute('data-required');
    var scope = wrap.getAttribute('data-scope') || '';

    if (type === 'repeater') {
      var rep = wrap.querySelector('.repeater');
      var min = parseInt(rep.dataset.min || '0', 10);
      var n = filledRows(rep).length;
      if (n < min) return min === 1 ? 'Добавете поне един запис.' : 'Добавете поне ' + min + ' записа.';
      return '';
    }
    if (type === 'qty_table') {
      var any = false, bad = '';
      $$('.qty-table input', wrap).forEach(function (inp) {
        var v = inp.value.trim();
        if (v === '') return;
        if (!/^\d+([.,]\d+)?$/.test(v)) { bad = bad || 'Невалидно количество: „' + v + '“.'; return; }
        if (num(v) > 0) any = true;
      });
      if (bad) return bad;
      return required && !any ? 'Посочете количество поне за една услуга.' : '';
    }
    // Празен ред в повтаряща се група не се проверява (сървърът го пропуска).
    var row = wrap.closest('.repeater-row');
    if (row && !filledRows(row.closest('.repeater')).includes(row)) return '';

    var group = wrap.querySelector('.choice-group');
    if (group) {
      return required && !group.querySelector('input:checked') ? 'Изберете опция.' : '';
    }
    var el = wrap.querySelector('input, select, textarea');
    if (!el) return '';
    if (el.type === 'checkbox') return required && !el.checked ? 'Необходимо е потвърждение.' : '';
    if (el.type === 'file') {
      var files = Array.prototype.slice.call(el.files || []);
      if (required && !files.length) return 'Прикачете файл.';
      var maxFiles = parseInt(el.getAttribute('data-max-files') || '1', 10);
      if (files.length > maxFiles) return 'Може да прикачите най-много ' + maxFiles + ' файла.';
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
    var max = el.getAttribute('maxlength');
    if (max && chars(v) > parseInt(max, 10)) return 'Максимум ' + max + ' знака.';
    if (!v) return required ? 'Полето е задължително.' : '';
    var t = el.getAttribute('data-type') || el.type;
    if (t === 'email' && !emailRe.test(v)) return 'Невалиден имейл адрес.';
    if (t === 'tel') {
      var digits = v.replace(/\D/g, '').length;
      if (!telRe.test(v) || digits < 6 || digits > 15) return 'Невалиден телефонен номер.';
    }
    if (t === 'eik' && !eikValid(v)) return 'Невалиден ЕИК/БУЛСТАТ (проверете цифрите).';
    if (t === 'number') {
      if (!/^-?\d+([.,]\d+)?$/.test(v.replace(/\s/g, ''))) return 'Въведете число.';
      var nv = num(v);
      var minV = el.getAttribute('data-min');
      var minBy = el.getAttribute('data-min-by');
      if (minBy) {
        var mb = JSON.parse(minBy);
        var key = values(mb.field, scope)[0] || '';
        if (key in mb.map) minV = String(mb.map[key]);
      }
      var unit = (wrap.querySelector('.unit') || {}).textContent;
      if (minV !== null && minV !== '' && nv < parseFloat(minV)) return 'Минималната стойност е ' + minV + (unit ? ' ' + unit : '') + '.';
      var maxV = el.getAttribute('data-max');
      if (maxV !== null && nv > parseFloat(maxV)) return 'Максималната стойност е ' + maxV + '.';
    }
    if (el.pattern && !new RegExp('^(?:' + el.pattern + ')$', 'u').test(v)) return el.getAttribute('data-pattern-message') || 'Невалиден формат.';
    return '';
  }

  /* ---------- събития ---------- */

  function refresh() { applyConditions(); computePrices(); }

  form.addEventListener('input', function (ev) {
    var el = ev.target;
    if (el.closest('.qty-table')) updateQtyRow(el);
    if (el.hasAttribute('data-counter')) updateCounter(el);
    var wrap = el.closest('[data-field]');
    if (wrap && wrap.classList.contains('has-error')) setError(wrap, checkField(wrap));
    refresh();
  });

  form.addEventListener('change', function (ev) {
    var el = ev.target;
    var partToggle = el.closest('.part-toggle');
    if (el.hasAttribute('data-toggles-part')) {
      var t = document.querySelector('#part-' + el.getAttribute('data-toggles-part') + ' .part-toggle input');
      if (t && t.checked !== el.checked) t.checked = el.checked;
    }
    if (partToggle && el.checked) {
      // При отваряне на формуляр курсорът отива на първото поле.
      setTimeout(function () {
        var first = el.closest('.part').querySelector('.part-body input:not([type=hidden]), .part-body select, .part-body textarea');
        if (first) first.focus({ preventScroll: false });
      }, 0);
    }
    var wrap = el.closest('[data-field]');
    if (wrap && (wrap.classList.contains('has-error') || el.type === 'file')) setError(wrap, checkField(wrap));
    refresh();
  });

  form.addEventListener('focusout', function (ev) {
    var wrap = ev.target.closest('[data-field]');
    if (!wrap || isHidden(wrap)) return;
    var type = wrap.getAttribute('data-type');
    if (type === 'repeater' || type === 'qty_table') return;
    if (ev.relatedTarget && wrap.contains(ev.relatedTarget)) return;
    setError(wrap, checkField(wrap));
  });

  form.addEventListener('submit', function (ev) {
    applyConditions();
    var first = null;
    $$('[data-field]').forEach(function (wrap) {
      if (isHidden(wrap)) { setError(wrap, ''); return; }
      var msg = checkField(wrap);
      setError(wrap, msg);
      if (msg && !first) first = wrap;
    });
    if (first) {
      ev.preventDefault();
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var el = first.querySelector('input:not([type=hidden]), select, textarea, button');
      if (el) el.focus({ preventScroll: true });
      return;
    }
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Изпращане…';
    var note = form.querySelector('.sending-note');
    if (note) note.hidden = false;
  });

  /* ---------- начално състояние ---------- */

  $$('.repeater').forEach(renumber);
  $$('.qty-table input').forEach(updateQtyRow);
  $$('[data-counter]').forEach(updateCounter);
  refresh();

  var errBox = document.getElementById('form-errors');
  if (errBox) {
    var firstErr = form.querySelector('.has-error');
    (firstErr || errBox).scrollIntoView({ block: 'center' });
  }
})();
