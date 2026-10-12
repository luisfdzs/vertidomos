// Formulario de firmas: lienzo para firmar a mano alzada y envío a /api/firmas.
(function () {
  var form = document.getElementById('form-firma');
  if (!form) return;

  var es = document.documentElement.lang === 'es';
  var t = es ? {
    firma: 'Firma en el recuadro antes de enviar.',
    dni: 'Escribe un DNI o NIE válido, con su letra (por ejemplo 12345678Z).',
    sending: 'Enviando…',
    ok: '¡Gracias! Tu firma se ha registrado.',
    duplicado: 'Ya hay una firma con este DNI/NIE. Cada persona solo puede firmar una vez.',
    error: 'No se pudo enviar la firma. Inténtalo de nuevo más tarde.',
    yaFirmaste: 'Ya firmaste esta petición desde este dispositivo. ¡Gracias!',
    otra: 'Firmar por otra persona',
    total: function (n) { return n === 1 ? 'Ya ha firmado 1 persona.' : 'Ya han firmado ' + n.toLocaleString('es') + ' personas.'; }
  } : {
    firma: 'Asina no recadro antes de enviar.',
    dni: 'Escribe un DNI ou NIE válido, coa súa letra (por exemplo 12345678Z).',
    sending: 'Enviando…',
    ok: 'Grazas! A túa sinatura quedou rexistrada.',
    duplicado: 'Xa hai unha sinatura con este DNI/NIE. Cada persoa só pode asinar unha vez.',
    error: 'Non se puido enviar a sinatura. Téntao de novo máis tarde.',
    yaFirmaste: 'Xa asinaches esta petición desde este dispositivo. Grazas!',
    otra: 'Asinar por outra persoa',
    total: function (n) { return n === 1 ? 'Xa asinou 1 persoa.' : 'Xa asinaron ' + n.toLocaleString('gl') + ' persoas.'; }
  };

  var KEY = 'vertidomos-firmado';
  var canvas = form.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  var status = form.querySelector('.form-status');
  var submit = form.querySelector('button[type="submit"]');
  var counter = document.getElementById('firmas-total');
  var drawn = false;
  var drawing = false;

  // DNI (8 cifras + letra) o NIE (X/Y/Z + 7 cifras + letra), con la letra de control comprobada.
  function dniValido(v) {
    var m = /^([XYZ]\d{7}|\d{8})([A-Z])$/.exec(v);
    if (!m) return false;
    var num = Number(m[1].replace(/^[XYZ]/, function (c) { return 'XYZ'.indexOf(c); }));
    return 'TRWAGMYFPDXBNJZSQVHLCKE'.charAt(num % 23) === m[2];
  }
  function dniNormalizado() { return form.dni.value.toUpperCase().replace(/[\s.-]/g, ''); }
  form.dni.addEventListener('input', function () {
    var v = dniNormalizado();
    form.dni.setCustomValidity(v && !dniValido(v) ? t.dni : '');
  });

  // Tamaño real del lienzo según el ancho mostrado y la densidad de píxeles.
  function resize() {
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (!w || canvas.width === Math.round(w * ratio)) return;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1d2328';
    drawn = false;
  }

  function point(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    var p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.01, p.y);
    ctx.stroke();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drawing) return;
    var p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    drawn = true;
  });
  ['pointerup', 'pointercancel'].forEach(function (type) {
    canvas.addEventListener(type, function () { drawing = false; });
  });

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawn = false;
  }
  form.querySelector('.firma-borrar').addEventListener('click', clear);

  function say(msg, kind) {
    status.textContent = msg;
    status.className = 'form-status' + (kind ? ' ' + kind : '');
  }

  function showTotal() {
    if (!counter) return;
    fetch('/api/firmas').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (d && d.total > 0) { counter.textContent = t.total(d.total); counter.hidden = false; }
    }).catch(function () {});
  }

  // Aviso si ya se firmó desde este navegador; se puede seguir firmando por otra persona.
  var notice = document.createElement('div');
  notice.className = 'ya-firmado';
  notice.hidden = true;
  notice.innerHTML = '<p></p><button type="button" class="firma-otra"></button>';
  notice.querySelector('p').textContent = t.yaFirmaste;
  notice.querySelector('button').textContent = t.otra;
  notice.querySelector('button').addEventListener('click', function () {
    notice.hidden = true;
    form.hidden = false;
    say('');
    resize();
    form.nombre.focus();
  });
  form.parentNode.insertBefore(notice, form);

  function yaFirmado() {
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }
  function marcarFirmado() {
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
  }
  function mostrarAviso() {
    form.hidden = true;
    notice.hidden = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    form.dni.dispatchEvent(new Event('input'));
    if (!form.reportValidity()) return;
    if (!drawn) { say(t.firma, 'error'); canvas.focus(); return; }

    submit.disabled = true;
    say(t.sending);
    fetch('/api/firmas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre.value,
        apellidos: form.apellidos.value,
        dni: dniNormalizado(),
        firma: canvas.toDataURL('image/png'),
        consentimiento: form.consentimiento.checked,
        lang: es ? 'es' : 'gl',
        web: form.web.value
      })
    }).then(function (r) {
      if (r.status === 409) { say(t.duplicado, 'error'); return; }
      if (!r.ok) throw new Error(r.status);
      form.reset();
      clear();
      marcarFirmado();
      notice.querySelector('p').textContent = t.ok;
      mostrarAviso();
      showTotal();
    }).catch(function () {
      say(t.error, 'error');
    }).then(function () {
      submit.disabled = false;
    });
  });

  window.addEventListener('resize', resize);
  if (yaFirmado()) mostrarAviso();
  resize();
  showTotal();
})();
