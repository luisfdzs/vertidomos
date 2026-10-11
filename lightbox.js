(function () {
  var dlg = document.getElementById('lightbox');
  if (!dlg || !dlg.showModal) return;
  var img = dlg.querySelector('img');
  document.querySelectorAll('[data-full]').forEach(function (b) {
    b.addEventListener('click', function () {
      img.src = b.dataset.full;
      img.alt = b.querySelector('img').alt;
      dlg.showModal();
    });
  });
  dlg.querySelector('.close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
})();
