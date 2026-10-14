// Firmas de la petición al Concello de Mos.
// GET  /api/firmas → { total }
// GET  /api/firmas?lista&desde=N → { total, firmas: [...] } por páginas, solo fuera de producción
//      (test.vertidomos.com está tras Vercel Authentication; en producción responde 404).
// POST /api/firmas  { nombre, apellidos, dni, cp, firma (PNG data URL), consentimiento, lang, web (honeypot) }
// Una sola firma por DNI/NIE (índice único): si se repite responde 409.
import { MongoClient } from 'mongodb';
import { attachDatabasePool } from '@vercel/functions';

const client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://invalid', { maxPoolSize: 5 });
attachDatabasePool(client);

// Una base de datos por entorno: producción, preview (test) y local.
const env = process.env.VERCEL_ENV;
const dbName = process.env.MONGODB_DB || (env === 'production' ? 'vertidomos' : `vertidomos_${env || 'development'}`);
const firmas = () => client.db(dbName).collection('firmas');
let indexed;
const ensureIndex = () => (indexed ??= firmas().createIndex({ dni: 1 }, { unique: true }).catch((e) => { indexed = null; throw e; }));

// DNI (8 cifras + letra) o NIE (X/Y/Z + 7 cifras + letra), con la letra de control comprobada.
const LETRAS = 'TRWAGMYFPDXBNJZSQVHLCKE';
function dniValido(dni) {
  const m = /^([XYZ]\d{7}|\d{8})([A-Z])$/.exec(dni);
  if (!m) return false;
  const num = Number(m[1].replace(/^[XYZ]/, (c) => 'XYZ'.indexOf(c)));
  return LETRAS[num % 23] === m[2];
}

const PNG = 'data:image/png;base64,';
const MAX_FIRMA = 200_000; // caracteres de la data URL (~150 KB de PNG)

const json = (body, status = 200, headers = {}) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store', ...headers } });

const text = (v, max) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '').slice(0, max + 1);

const PAGINA = 50; // firmas por petición: cada PNG ocupa hasta ~150 KB y la respuesta no puede pasar de 4,5 MB

export async function GET(request) {
  if (!process.env.MONGODB_URI) return json({ error: 'not_configured' }, 503);
  const url = new URL(request.url);
  if (url.searchParams.has('lista')) {
    if (env === 'production') return json({ error: 'not_found' }, 404);
    const desde = Math.max(0, parseInt(url.searchParams.get('desde'), 10) || 0);
    const [total, lista] = await Promise.all([
      firmas().countDocuments(),
      firmas()
        .find({}, { projection: { _id: 0, nombre: 1, apellidos: 1, dni: 1, cp: 1, firma: 1, fecha: 1 } })
        .sort({ fecha: 1, _id: 1 })
        .skip(desde)
        .limit(PAGINA)
        .toArray(),
    ]);
    return json({ total, firmas: lista });
  }
  const total = await firmas().estimatedDocumentCount();
  return json({ total }, 200, { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=300' });
}

export async function POST(request) {
  if (!process.env.MONGODB_URI) return json({ error: 'not_configured' }, 503);

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  // Honeypot: los bots rellenan el campo oculto; respondemos ok sin guardar.
  if (data.web) return json({ ok: true });

  const nombre = text(data.nombre, 80);
  const apellidos = text(data.apellidos, 120);
  const dni = typeof data.dni === 'string' ? data.dni.toUpperCase().replace(/[\s.-]/g, '') : '';
  const cp = typeof data.cp === 'string' ? data.cp.trim() : '';
  const firma = typeof data.firma === 'string' ? data.firma : '';

  if (!nombre || nombre.length > 80) return json({ error: 'nombre' }, 400);
  if (!apellidos || apellidos.length > 120) return json({ error: 'apellidos' }, 400);
  if (!dniValido(dni)) return json({ error: 'dni' }, 400);
  if (!/^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/.test(cp)) return json({ error: 'cp' }, 400);
  if (!firma.startsWith(PNG) || firma.length > MAX_FIRMA) return json({ error: 'firma' }, 400);
  if (data.consentimiento !== true) return json({ error: 'consentimiento' }, 400);

  await ensureIndex();
  try {
    await firmas().insertOne({
      nombre,
      apellidos,
      dni,
      cp,
      firma,
      lang: data.lang === 'es' ? 'es' : 'gl',
      fecha: new Date(),
    });
  } catch (e) {
    if (e.code === 11000) return json({ error: 'duplicado' }, 409);
    throw e;
  }

  return json({ ok: true }, 201);
}
