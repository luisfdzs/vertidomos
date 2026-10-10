# VertidoMos

| Rama   | Entorno                                         |
|--------|-------------------------------------------------|
| `dev`  | Solo desarrollo local (sin despliegues en Vercel) |
| `test` | https://test.vertidomos.com                     |
| `prod` | https://vertidomos.com                          |

Flujo: `dev` → `test` → `prod`.

## Estructura

HTML estático sin build. Gallego en la raíz (`/`), castellano en `/es/`, mismos slugs en gallego. Cada página lleva canonical, hreflang (gl, es, x-default → gl), Open Graph y JSON-LD. `vercel.json` activa `cleanUrls` (`/o-problema` sirve `o-problema.html`).

Al añadir o renombrar una página: actualizar la cabecera de navegación de todas las páginas, `sitemap.xml` y el enlace de idioma de la página gemela.
