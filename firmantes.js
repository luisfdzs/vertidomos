// Lista de firmantes (nome, apelidos, DNI/NIE, CP e sinatura) e descarga en PDF.
// Só fóra de produción: a API responde 404 en vertidomos.com e a páxina redirixe á portada (vercel.json).
(function () {
  var es = document.documentElement.lang === 'es';
  var T = es
    ? { cargando: 'Cargando firmas…', error: 'No se pudieron cargar las firmas.', ninguna: 'Todavía no hay firmas.',
        total: function (n) { return n + (n === 1 ? ' firma' : ' firmas'); },
        cols: ['N.º', 'Nombre', 'Apellidos', 'DNI/NIE', 'C.P.', 'Firma'], titulo: 'Relación de firmantes',
        generado: 'Generado el', pagina: 'Página', archivo: 'firmantes', firma: 'Firma de ' }
    : { cargando: 'Cargando sinaturas…', error: 'Non se puideron cargar as sinaturas.', ninguna: 'Aínda non hai sinaturas.',
        total: function (n) { return n + (n === 1 ? ' sinatura' : ' sinaturas'); },
        cols: ['N.º', 'Nome', 'Apelidos', 'DNI/NIE', 'C.P.', 'Sinatura'], titulo: 'Relación de asinantes',
        generado: 'Xerado o', pagina: 'Páxina', archivo: 'asinantes', firma: 'Sinatura de ' };

  var estado = document.getElementById('estado');
  var tbody = document.querySelector('#lista tbody');
  var boton = document.getElementById('pdf');
  var firmas = [];

  function cargar(desde) {
    return fetch('/api/firmas?lista&desde=' + desde, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        firmas = firmas.concat(d.firmas);
        return d.firmas.length && firmas.length < d.total ? cargar(firmas.length) : null;
      });
  }

  function celda(tr, texto) {
    var td = document.createElement('td');
    td.textContent = texto;
    tr.appendChild(td);
    return td;
  }

  function pintar() {
    estado.textContent = firmas.length ? T.total(firmas.length) : T.ninguna;
    firmas.forEach(function (f, i) {
      var tr = document.createElement('tr');
      celda(tr, i + 1);
      celda(tr, f.nombre);
      celda(tr, f.apellidos);
      celda(tr, f.dni || '');
      celda(tr, f.cp || '');
      var td = celda(tr, '');
      td.className = 'firma';
      if (/^data:image\/png;base64,/.test(f.firma || '')) {
        var img = new Image();
        img.src = f.firma;
        img.alt = T.firma + f.nombre + ' ' + f.apellidos;
        td.appendChild(img);
      }
      tbody.appendChild(tr);
    });
    boton.disabled = !firmas.length;
  }

  // Tamaño (px) de cada sinatura, para encaixala no PDF sen deformala.
  function medidas() {
    return Promise.all(firmas.map(function (f) {
      return new Promise(function (ok) {
        if (!/^data:image\/png;base64,/.test(f.firma || '')) return ok(null);
        var img = new Image();
        img.onload = function () { ok({ w: img.naturalWidth, h: img.naturalHeight }); };
        img.onerror = function () { ok(null); };
        img.src = f.firma;
      });
    }));
  }

  function pdf() {
    boton.disabled = true;
    medidas().then(function (tam) {
      var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
      var hoxe = new Date().toLocaleDateString(es ? 'es-ES' : 'gl-ES', { timeZone: 'Europe/Madrid' });
      doc.setFontSize(13);
      doc.text(T.titulo + ' (' + firmas.length + ')', 15, 18);
      doc.setFontSize(9);
      doc.text(T.generado + ' ' + hoxe, 15, 24);
      doc.autoTable({
        startY: 29,
        margin: { left: 15, right: 15, top: 15, bottom: 15 },
        head: [T.cols],
        body: firmas.map(function (f, i) { return [i + 1, f.nombre, f.apellidos, f.dni || '', f.cp || '', '']; }),
        theme: 'grid',
        styles: { fontSize: 9, valign: 'middle', textColor: 0, lineColor: 0, lineWidth: 0.2, minCellHeight: 18 },
        headStyles: { fillColor: 235, textColor: 0, minCellHeight: 0 },
        columnStyles: { 0: { cellWidth: 10 }, 3: { cellWidth: 24 }, 4: { cellWidth: 14 }, 5: { cellWidth: 50 } },
        rowPageBreak: 'avoid',
        didDrawCell: function (d) {
          var t = tam[d.row.index];
          if (d.section !== 'body' || d.column.index !== 5 || !t) return;
          var pad = 1;
          var maxW = d.cell.width - 2 * pad, maxH = d.cell.height - 2 * pad;
          var k = Math.min(maxW / t.w, maxH / t.h);
          var w = t.w * k, h = t.h * k;
          doc.addImage(firmas[d.row.index].firma, 'PNG', d.cell.x + (d.cell.width - w) / 2, d.cell.y + (d.cell.height - h) / 2, w, h);
        },
        didDrawPage: function () {
          doc.setFontSize(8);
          doc.text(T.pagina + ' ' + doc.getNumberOfPages(), 195, 290, { align: 'right' });
        },
      });
      doc.save(T.archivo + '-' + new Date().toISOString().slice(0, 10) + '.pdf');
    }).catch(function (e) {
      console.error(e);
    }).then(function () {
      boton.disabled = false;
    });
  }

  boton.addEventListener('click', pdf);
  estado.textContent = T.cargando;
  cargar(0).then(pintar, function (e) {
    console.error(e);
    estado.textContent = T.error;
  });
})();
