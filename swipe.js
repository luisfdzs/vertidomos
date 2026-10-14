// Móbil: deslizar cara aos lados no contido cambia á sección seguinte / anterior do menú.
(function () {
  var main = document.getElementById('contido');
  var nav = document.querySelector('.site-nav ul');
  var links = Array.prototype.slice.call(document.querySelectorAll('.site-nav a'));
  var here = links.findIndex(function (a) { return a.getAttribute('aria-current') === 'page'; });
  if (!main || here < 0) return;

  // Menú con scroll horizontal: deixar visible a sección actual.
  if (nav && nav.scrollWidth > nav.clientWidth) {
    var cur = links[here];
    nav.scrollLeft = cur.offsetLeft - (nav.clientWidth - cur.offsetWidth) / 2;
  }
  // A animación de entrada (styles.css) só se ve unha vez.
  main.addEventListener('animationend', function (e) { if (e.target === main) delete document.documentElement.dataset.swipe; });

  if (!('ontouchstart' in window)) return;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Zonas onde o xesto xa ten outro uso: asinar, formularios, mapa, foto ampliada.
  var skip = 'canvas, input, textarea, select, iframe, dialog, .map';
  var EASE_OUT = 'cubic-bezier(.22, 1, .36, 1)';
  var x0, y0, dx, v, tPrev, xPrev, mode, target, ready; // mode: null (sen decidir), 'x' (deslizar), 'y' (scroll)

  // Etiqueta co nome da sección á que se vai.
  var hint = document.createElement('div');
  hint.className = 'swipe-hint';
  hint.setAttribute('aria-hidden', 'true');
  document.body.appendChild(hint);

  var prefetched = {};
  function prefetch(a) {
    if (prefetched[a.href]) return;
    prefetched[a.href] = true;
    var l = document.createElement('link');
    l.rel = 'prefetch'; l.href = a.href;
    document.head.appendChild(l);
  }

  function threshold() { return Math.min(90, window.innerWidth * 0.25); }

  function settle() {
    main.style.transition = 'transform .4s ' + EASE_OUT + ', opacity .4s ' + EASE_OUT;
    main.style.transform = '';
    main.style.opacity = '';
    hint.className = 'swipe-hint';
    hint.style.transform = '';
    hint.style.opacity = '';
  }

  main.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    mode = 'y';
    if (e.touches.length > 1 || e.target.closest(skip) || document.querySelector('dialog[open]')) return;
    // Os bordos da pantalla son do navegador (xesto de atrás en iOS/Android).
    if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return;
    x0 = xPrev = t.clientX; y0 = t.clientY; tPrev = e.timeStamp; dx = 0; v = 0; mode = null; ready = false;
    main.style.transition = 'none';
  }, { passive: true });

  main.addEventListener('touchmove', function (e) {
    if (mode === 'y' || e.touches.length > 1) return;
    var t = e.touches[0];
    dx = t.clientX - x0;
    var dy = t.clientY - y0;
    if (mode === null) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      mode = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'x' : 'y';
      if (mode === 'y') return;
    }
    if (e.timeStamp > tPrev) {
      v = 0.8 * ((t.clientX - xPrev) / (e.timeStamp - tPrev)) + 0.2 * v; // px/ms, suavizada
      xPrev = t.clientX; tPrev = e.timeStamp;
    }
    var next = dx < 0;
    target = links[here + (next ? 1 : -1)];
    if (!target) {
      // Sen sección nese lado: resistencia elástica.
      if (!still) main.style.transform = 'translateX(' + dx / (1 + Math.abs(dx) / 60) + 'px)';
      hint.style.opacity = '0';
      return;
    }
    prefetch(target);
    var p = Math.min(Math.abs(dx) / threshold(), 1);
    if (!still) {
      main.style.transform = 'translateX(' + dx + 'px)';
      main.style.opacity = 1 - p * 0.35;
    }
    hint.textContent = next ? target.textContent + ' ›' : '‹ ' + target.textContent;
    hint.className = 'swipe-hint ' + (next ? 'right' : 'left') + (p === 1 ? ' ready' : '');
    hint.style.opacity = p;
    hint.style.transform = 'translateY(-50%) translateX(' + (next ? 1 : -1) * (1 - p) * 24 + 'px)';
    ready = p === 1;
  }, { passive: true });

  main.addEventListener('touchend', function () {
    if (mode !== 'x') return;
    mode = 'y';
    // Vale un xesto longo ou un aceno rápido no mesmo sentido.
    var flick = Math.abs(v) > 0.5 && Math.abs(dx) > 30 && (v < 0) === (dx < 0);
    if (!target || !(ready || flick)) return settle();
    var dir = dx < 0 ? 'next' : 'prev';
    try { sessionStorage.setItem('swipe', dir); } catch (err) {}
    if (still) { location.href = target.href; return; }
    main.style.transition = 'transform .22s ' + EASE_OUT + ', opacity .22s ' + EASE_OUT;
    main.style.transform = 'translateX(' + (dir === 'next' ? -45 : 45) + '%)';
    main.style.opacity = '0';
    hint.style.opacity = '0';
    var href = target.href;
    setTimeout(function () { location.href = href; }, 160);
  });

  main.addEventListener('touchcancel', function () { mode = 'y'; settle(); });
  // Ao volver con "atrás", a páxina pode vir da caché co contido desprazado.
  window.addEventListener('pageshow', function () {
    main.style.transition = 'none'; main.style.transform = ''; main.style.opacity = '';
    hint.className = 'swipe-hint'; hint.style.opacity = '';
  });
})();
