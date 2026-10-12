# VertidoMos

| Rama   | Entorno                                         |
|--------|-------------------------------------------------|
| `dev`  | Solo desarrollo local (sin despliegues en Vercel) |
| `test` | https://test.vertidomos.com                     |
| `prod` | https://vertidomos.com (de momento redirige a `/proximamente`) |

Flujo: `dev` → `test` → `prod`.

## Estructura

HTML estático sin build. Gallego en la raíz (`/`) y castellano en `/es/`. Cada página lleva canonical, hreflang (gl, es, x-default → gl), Open Graph y JSON-LD. `vercel.json` activa `cleanUrls` (`/cronoloxia` sirve `cronoloxia.html`).

| gl | es |
|---|---|
| `/` (inicio y firma) | `/es/` |
| `/cronoloxia` | `/es/cronologia` |
| `/evidencias-e-planos` | `/es/evidencias-y-planos` |
| `/onde-esta` | `/es/donde-esta` |
| `/sentenza-supremo` | `/es/sentencia-supremo` |
| `/contacto` | `/es/contacto` |

- Imágenes en `img/` (WebP sin metadatos; `og-gl.jpg` / `og-es.jpg` para compartir). Documentos descargables en `docs/`.
- Formulario de firmas en `index.html` y `es/index.html` (sección `#asina` / `#firma`): nombre, apellidos, DNI/NIE (letra validada, una sola firma por DNI: índice único) y firma a mano alzada (`firma.js`, canvas → PNG; el navegador recuerda en `localStorage` que ya se firmó, con opción de firmar por otra persona). Lo recibe la función `api/firmas.js`, que guarda en MongoDB (colección `firmas`, una base por entorno: `vertidomos`, `vertidomos_preview`, `vertidomos_development`). Necesita la variable `MONGODB_URI` en Vercel. En local, `npx vercel dev` (con `npx serve` la API no funciona).

Al añadir o renombrar una página: actualizar el menú de todas las páginas, `sitemap.xml` y el enlace de idioma de la página gemela.
