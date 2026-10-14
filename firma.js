// Formulario de firmas: lienzo para firmar a mano alzada (en un diálogo a pantalla completa,
// para que el dedo que hace scroll por el formulario no pinte) y envío a /api/firmas.
(function () {
  var form = document.getElementById('form-firma');
  if (!form) return;

  var es = document.documentElement.lang === 'es';
  var t = es ? {
    firma: 'Falta la firma: pulsa en el recuadro para firmar.',
    dni: 'Escribe un DNI o NIE válido, con su letra (por ejemplo 12345678Z).',
    cp: 'Escribe un código postal español de 5 cifras (por ejemplo 36419).',
    sending: 'Enviando…',
    ok: '¡Gracias! Tu firma se ha registrado.',
    duplicado: 'Ya hay una firma con este DNI/NIE. Cada persona solo puede firmar una vez.',
    error: 'No se pudo enviar la firma. Inténtalo de nuevo más tarde.',
    total: function (n) { return n === 1 ? 'Ya ha firmado 1 persona.' : 'Ya han firmado ' + n.toLocaleString('es') + ' personas.'; }
  } : {
    firma: 'Falta a sinatura: preme no recadro para asinar.',
    dni: 'Escribe un DNI ou NIE válido, coa súa letra (por exemplo 12345678Z).',
    cp: 'Escribe un código postal español de 5 cifras (por exemplo 36419).',
    sending: 'Enviando…',
    ok: 'Grazas! A túa sinatura quedou rexistrada.',
    duplicado: 'Xa hai unha sinatura con este DNI/NIE. Cada persoa só pode asinar unha vez.',
    error: 'Non se puido enviar a sinatura. Téntao de novo máis tarde.',
    total: function (n) { return n === 1 ? 'Xa asinou 1 persoa.' : 'Xa asinaron ' + n.toLocaleString('gl') + ' persoas.'; }
  };

  var canvas = form.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  var modal = form.querySelector('.firma-modal');
  var abrir = form.querySelector('.firma-abrir');
  var vacia = abrir.querySelector('.firma-vacia');
  var vista = abrir.querySelector('.firma-vista');
  var status = form.querySelector('.form-status');
  var submit = form.querySelector('button[type="submit"]');
  var counter = document.getElementById('firmas-total');
  var firma = null; // PNG (data URL) de la firma aceptada
  var box = null;   // rectángulo con lo dibujado, en px CSS
  var drawing = false;
  var touched = false; // se dibujó o borró desde que se abrió el diálogo

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

  form.cp.addEventListener('input', function () {
    form.cp.setCustomValidity(form.cp.validity.patternMismatch ? t.cp : '');
  });

  // Tamaño real del lienzo según el ancho mostrado y la densidad de píxeles.
  // Solo mide cuando el diálogo está abierto; si cambia el tamaño, el lienzo queda en blanco.
  function resize() {
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (!w || (canvas.width === Math.round(w * ratio) && canvas.height === Math.round(h * ratio))) return;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1d2328';
    box = null;
  }

  function point(e) {
    var r = canvas.getBoundingClientRect();
    var p = { x: e.clientX - r.left, y: e.clientY - r.top };
    box = box ? { x0: Math.min(box.x0, p.x), y0: Math.min(box.y0, p.y), x1: Math.max(box.x1, p.x), y1: Math.max(box.y1, p.y) }
              : { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    return p;
  }

  // PNG recortado a lo dibujado (y como mucho 1000 px de ancho), para que encaje bien en el escrito.
  function exportar() {
    var ratio = canvas.width / canvas.clientWidth;
    var pad = 8;
    var x = Math.max(0, Math.floor((box.x0 - pad) * ratio));
    var y = Math.max(0, Math.floor((box.y0 - pad) * ratio));
    var w = Math.min(canvas.width, Math.ceil((box.x1 + pad) * ratio)) - x;
    var h = Math.min(canvas.height, Math.ceil((box.y1 + pad) * ratio)) - y;
    var scale = Math.min(1, 1000 / w);
    var out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(w * scale));
    out.height = Math.max(1, Math.round(h * scale));
    out.getContext('2d').drawImage(canvas, x, y, w, h, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  }

  function mostrar() {
    vista.hidden = !firma;
    vacia.hidden = !!firma;
    if (firma) vista.src = firma; else vista.removeAttribute('src');
  }

  abrir.addEventListener('click', function () {
    touched = false;
    modal.showModal();
    resize();
  });
  // Al cerrar (botón o tecla Esc) se acepta lo que haya en el lienzo.
  function cerrar() {
    drawing = false;
    if (touched) { firma = box ? exportar() : null; mostrar(); }
    if (firma && status.classList.contains('error')) say('');
    modal.close();
    abrir.focus();
  }
  modal.addEventListener('cancel', function (e) { e.preventDefault(); cerrar(); });
  form.querySelector('.firma-feito').addEventListener('click', cerrar);

  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    touched = true;
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
  });
  ['pointerup', 'pointercancel'].forEach(function (type) {
    canvas.addEventListener(type, function () { drawing = false; });
  });

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    box = null;
    touched = true;
    if (!modal.open) { firma = null; mostrar(); }
  }
  form.querySelectorAll('.firma-borrar').forEach(function (b) { b.addEventListener('click', clear); });

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

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    form.dni.dispatchEvent(new Event('input'));
    form.cp.dispatchEvent(new Event('input'));
    if (!form.checkValidity()) {
      // Mismo encuadre que los enlaces «Firma la petición», no el scroll por defecto del navegador.
      var campo = form.querySelector(':invalid');
      if (campo === form.nombre) irANombre(); else irA(campo, campo);
      form.reportValidity();
      return;
    }
    if (!firma) { say(t.firma, 'error'); abrir.focus(); return; }

    submit.disabled = true;
    say(t.sending);
    fetch('/api/firmas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre.value,
        apellidos: form.apellidos.value,
        dni: dniNormalizado(),
        cp: form.cp.value.trim(),
        firma: firma,
        consentimiento: form.consentimiento.checked,
        lang: es ? 'es' : 'gl',
        web: form.web.value
      })
    }).then(function (r) {
      if (r.status === 409) { say(t.duplicado, 'error'); return; }
      if (!r.ok) throw new Error(r.status);
      form.reset();
      clear();
      say(t.ok, 'ok');
      showTotal();
    }).catch(function () {
      say(t.error, 'error');
    }).then(function () {
      submit.disabled = false;
    });
  });

  // Los enlaces «Firma la petición» (#asina / #firma) llevan directamente al campo Nombre, no al inicio del escrito.
  var ancla = '#' + form.closest('section').id;
  var cabecera = document.querySelector('.site-header');
  var tactil = matchMedia('(pointer: coarse)');
  // Enfoca el campo «desde» dejando visible hasta el campo «hasta».
  function irA(desde, hasta) {
    if (tactil.matches) {
      // En el móvil el teclado tapa la mitad inferior: los campos se centran en la mitad superior, bajo la cabecera fija.
      var arriba = cabecera ? cabecera.getBoundingClientRect().bottom : 0;
      var inicio = desde.closest('label').getBoundingClientRect().top;
      var fin = hasta.getBoundingClientRect().bottom;
      var hueco = innerHeight / 2 - arriba - (fin - inicio);
      window.scrollTo({ top: scrollY + inicio - arriba - Math.max(hueco / 2, 8) });
    } else {
      desde.scrollIntoView({ block: 'center' });
    }
    desde.focus({ preventScroll: true });
  }
  function irANombre() { irA(form.nombre, form.apellidos); }
  document.querySelectorAll('a[href="' + ancla + '"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      history.replaceState(null, '', ancla);
      irANombre();
    });
  });
  // Al llegar desde otra página (/#asina), tras el scroll al ancla que hace el navegador.
  if (location.hash === ancla) window.addEventListener('load', irANombre);

  window.addEventListener('resize', resize);
  resize();
  showTotal();
})();
