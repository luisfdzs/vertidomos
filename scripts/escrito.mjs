// Genera el escrito para el Registro del Concello de Mos con las firmas guardadas en MongoDB.
// Uso: npm run escrito [-- base]     → material/escrito-<base>.html (escrito + relación de firmantes)
//      npm run firmantes [-- base]   → material/firmantes-<base>.html (solo la relación)
// Base por defecto: vertidomos (producción). Todo queda en material/ (gitignored) y nunca se publica:
// la lista con DNI y firmas solo se consulta desde aquí, no desde la web. Abrir en el navegador e
// imprimir / guardar como PDF.
// Con --pdf (npm run escrito:pdf / firmantes:pdf) genera directamente el .pdf con Chrome o Edge en
// modo headless, sin dejar el .html.
import { MongoClient } from 'mongodb';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const soloLista = args.includes('--lista');
const pdf = args.includes('--pdf');
const db = args.find((a) => !a.startsWith('--')) || 'vertidomos';
const client = new MongoClient(process.env.MONGODB_URI);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fecha = (d) => d.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' });

try {
  const firmas = await client.db(db).collection('firmas').find().sort({ fecha: 1 }).toArray();

  const filas = firmas.map((f, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(f.nombre)} ${esc(f.apellidos)}</td>
        <td>${esc(f.dni ?? '')}</td>
        <td>${esc(f.cp ?? '')}</td>
        <td>${fecha(f.fecha)}</td>
        <td class="firma">${f.firma?.startsWith('data:image/png;base64,') ? `<img src="${f.firma}" alt="Firma">` : ''}</td>
      </tr>`).join('');

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${soloLista ? 'Relación de firmantes' : 'Escrito al Concello de Mos'} · ${firmas.length} firmas</title>
<style>
  @page { size: A4; margin: 18mm 15mm; }
  body { font: 11pt/1.5 Georgia, "Times New Roman", serif; color: #000; max-width: 180mm; margin: 0 auto; padding: 10mm 0; }
  h1 { font-size: 12pt; margin: 0 0 1em; }
  p { margin: 0 0 .8em; text-align: justify; }
  .escrito { page-break-after: always; }
  h2 { font-size: 11pt; margin: 0 0 .6em; }
  table { width: 100%; border-collapse: collapse; font: 9.5pt/1.3 Arial, sans-serif; }
  th, td { border: 1px solid #000; padding: 3px 5px; text-align: left; vertical-align: middle; }
  th { background: #eee; }
  tr { page-break-inside: avoid; }
  td.firma { width: 55mm; height: 18mm; padding: 1px; }
  td.firma img { display: block; max-width: 100%; max-height: 18mm; margin: 0 auto; }
  thead { display: table-header-group; }
</style>
</head>
<body>${soloLista ? '' : `
  <section class="escrito">
    <h1>A LA ALCALDÍA-PRESIDENCIA DEL CONCELLO DE MOS</h1>
    <p>Los abajo firmantes, en calidad de vecinos de Mos, comparecen y</p>
    <p><strong>EXPONEN:</strong></p>
    <p>Que en la finca de un particular en la parroquia de Louredo, se viene produciendo desde hace años un vertido de aguas residuales de presunto origen en las casas de la urbanización San Antoiño, del Campo de Fútbol Municipal y la Aldea Alfacuca, de titularidad municipal.</p>
    <p>Que la ejecución del saneamiento municipal en dicho ámbito responde a un claro interés general y medioambiental, resultando imprescindible para salvaguardar la salud pública, la calidad de vida de los vecinos y la protección del entorno natural.</p>
    <p>Por todo lo expuesto,</p>
    <p><strong>SOLICITAN:</strong></p>
    <p>Que se tenga por presentado este escrito y se proceda a la ejecución del “Proyecto de Nova Rede de Fecais en San Antoiño”, autorizado por la Confederación Hidrográfica Miño-Sil el 23/05/2023, integrando las instalaciones de los terrenos de titularidad municipal; Campo de Fútbol de San Antoiño y Aldea Alfacuca, para atajar los vertidos existentes por razones de interés general y medioambiental.</p>
    <p>A efectos documentales y de validez de las firmas recogidas, la fecha de este escrito será la que conste en el sello del Registro General de Entrada del Concello de Mos en el momento de su presentación formal.</p>
  </section>`}
  <section>
    <h2>Relación de firmantes (${firmas.length})</h2>
    <table>
      <thead><tr><th>N.º</th><th>Nombre y apellidos</th><th>DNI/NIE</th><th>C.P.</th><th>Fecha</th><th>Firma</th></tr></thead>
      <tbody>${filas}
      </tbody>
    </table>
  </section>
</body>
</html>
`;

  mkdirSync('material', { recursive: true });
  const base = `material/${soloLista ? 'firmantes' : 'escrito'}-${db}`;
  writeFileSync(`${base}.html`, html);
  let out = `${base}.html`;
  if (pdf) {
    out = `${base}.pdf`;
    imprimirPdf(`${base}.html`, out);
    rmSync(`${base}.html`);
  }
  const sinDni = firmas.filter((f) => !f.dni).length;
  console.log(`${out}: ${firmas.length} firmas${sinDni ? ` (${sinDni} sin DNI, anteriores a ese campo)` : ''}`);
} finally {
  await client.close();
}

function imprimirPdf(html, pdf) {
  const navegadores = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  const nav = navegadores.find((p) => p && existsSync(p));
  if (!nav) throw new Error('No se encontró Chrome ni Edge; indica la ruta con CHROME_PATH.');
  execFileSync(nav, [
    '--headless', '--disable-gpu', '--no-pdf-header-footer',
    `--print-to-pdf=${resolve(pdf)}`, pathToFileURL(resolve(html)).href,
  ], { stdio: 'ignore' });
  if (!existsSync(pdf)) throw new Error(`No se generó ${pdf}`);
}
