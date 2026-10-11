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
- Formulario de firmas: un Google Form incrustado en `index.html` y `es/index.html` (sección `#asina` / `#firma`).

Al añadir o renombrar una página: actualizar el menú de todas las páginas, `sitemap.xml` y el enlace de idioma de la página gemela.
