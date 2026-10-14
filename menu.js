// Móbil: o botón de tres liñas abre o menú a pantalla completa (estilo en styles.css).
// As ligazóns cópianse do <nav> e do selector de idioma da cabeceira.
(function () {
  var header = document.querySelector('.site-header');
  var toggle = header && header.querySelector('.menu-toggle');
  var nav = header && header.querySelector('.site-nav ul');
  var other = header && header.querySelector('.lang');
  if (!toggle || !nav) return;

  var labelOpen = toggle.getAttribute('aria-label');
  var labelClose = toggle.dataset.labelClose;
  var here = document.documentElement.lang;

  var menu = document.createElement('div');
  menu.className = 'menu-movil';
  menu.id = 'menu-movil';
  menu.inert = true;

  var list = nav.cloneNode(true);
  var panel = document.createElement('nav');
  panel.setAttribute('aria-label', header.querySelector('.site-nav').getAttribute('aria-label'));
  panel.appendChild(list);

  // Idiomas: o actual (sen ligazón activa) e o outro, coa ligazón da cabeceira.
  var langs = document.createElement('div');
  langs.className = 'menu-langs';
  langs.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>';
  [['gl', 'Galego', '/'], ['es', 'Castellano', '/es']].forEach(function (l) {
    var a = document.createElement('a');
    a.textContent = l[1];
    a.lang = l[0];
    a.hreflang = l[0];
    if (l[0] === here) { a.href = location.pathname; a.setAttribute('aria-current', 'true'); }
    else a.href = other ? other.getAttribute('href') : l[2];
    langs.appendChild(a);
  });
  panel.appendChild(langs);
  menu.appendChild(panel);
  header.after(menu);

  function set(open) {
    header.classList.toggle('menu-open', open);
    document.documentElement.classList.toggle('menu-lock', open);
    menu.inert = !open;
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? labelClose : labelOpen);
  }
  toggle.addEventListener('click', function () { set(toggle.getAttribute('aria-expanded') !== 'true'); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('menu-open')) { set(false); toggle.focus(); }
  });
  // Ao pasar a vista de ordenador co menú aberto, péchase.
  matchMedia('(min-width: 40.0625rem)').addEventListener('change', function (m) { if (m.matches) set(false); });
})();
