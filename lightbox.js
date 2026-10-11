(function () {
  var dlg = document.getElementById('lightbox');
  if (!dlg || !dlg.showModal) return;
  var img = dlg.querySelector('img');
  var items = Array.prototype.slice.call(document.querySelectorAll('[data-full]'));
  var es = document.documentElement.lang === 'es';
  var current = 0;
  var count = null;

  function mkNav(cls, label, text) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'nav ' + cls;
    b.setAttribute('aria-label', label);
    b.textContent = text;
    dlg.appendChild(b);
    return b;
  }

  function show(i) {
    current = (i + items.length) % items.length;
    img.src = items[current].dataset.full;
    img.alt = items[current].querySelector('img').alt;
    img.style.animation = 'none'; img.offsetWidth; img.style.animation = '';
    if (count) count.textContent = (current + 1) + ' / ' + items.length;
  }

  items.forEach(function (b, i) {
    b.addEventListener('click', function () { show(i); dlg.showModal(); });
  });

  if (items.length > 1) {
    count = document.createElement('div');
    count.className = 'count';
    dlg.appendChild(count);
    mkNav('prev', es ? 'Anterior' : 'Anterior', '‹').addEventListener('click', function () { show(current - 1); });
    mkNav('next', es ? 'Siguiente' : 'Seguinte', '›').addEventListener('click', function () { show(current + 1); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
    var x0 = null;
    dlg.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    });
  }

  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
})();
