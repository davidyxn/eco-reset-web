# ECO RESET — sitio web

Sitio de marca para **Eco Reset**, fertilizante foliar líquido de origen orgánico elaborado a
partir de residuos alimentarios (Guatemala). Incluye una *landing* editorial con objetos 3D y la
experiencia digital **Scan & Care** que abre el código QR de la etiqueta.

Presentación principal: **botella de 1000 ml** con concentrado y atomizador reutilizable.
Contenido tomado del informe *“Informe – Borrador”* y de la lámina de marca incluida en él
(logotipo, paleta y tipografías Montserrat + Poppins).

---

## 1. Cómo verlo

**Opción rápida:** abre `index.html` con doble clic. Funciona sin instalación ni conexión: las
tipografías, Three.js y el generador de QR están incluidos en el proyecto (no hay CDN).

**Opción recomendada** (mejor rendimiento y para que el QR se comporte como en producción):

```bash
python -m http.server 8123
```

y abre <http://localhost:8123>.

> El QR de la etiqueta 3D apunta a `cuidado.html`. Para escanearlo desde un teléfono, publica el
> sitio (Netlify, Vercel, GitHub Pages) o ábrelo desde la IP de tu red local.

---

## 2. Páginas

| Archivo | Contenido |
| --- | --- |
| `index.html` | Landing completa: héroe con botella 3D, manifiesto, producto, Scan & Care, economía circular con papel plantable 3D, precios, promociones, FAQ y CTA. |
| `cuidado.html` | Experiencia **Scan & Care**: guía de 6 síntomas, dosis y pasos de aplicación. Es el destino del QR de la etiqueta. |

---

## 3. Qué incluye

- **Objetos 3D reales (Three.js / WebGL):** botella de 1000 ml construida por completo en código
  (vidrio, líquido, etiqueta con tipografía y QR reales, atomizador, pedestal, hojas y gotas) y
  escena del **papel plantable** con maceta de barro, brote y semillas. Arrastre para girar,
  balanceo suave y respeto por `prefers-reduced-motion`.
- **Liquid glass:** superficies translúcidas con desenfoque, bordes de luz y reflejos; tipografía
  clásica (Fraunces) combinada con la geométrica de la marca (Montserrat/Poppins).
- **Calculadora de mezcla** (15 ml por litro) con control deslizante y rendimiento por botella.
- **Guía Scan & Care** que actualiza una vista de teléfono en vivo (y su versión completa).
- **QR generado en el navegador** (sin servicios externos) que apunta a `cuidado.html`.
- **Pedido funcional:** carrito con cantidades, subtotal en quetzales, persistencia en
  `localStorage`, envío por WhatsApp y copia del resumen al portapapeles.
- **Formulario de boletín** con validación y estado de éxito.
- **FAQ** con acordeón accesible (`<details>`), navegación móvil, menú de pedido con foco y `Esc`.
- **Fallbacks:** si no hay WebGL se muestra una composición estática; si el JavaScript falla, el
  contenido se muestra igualmente (red de seguridad de 4 s y `?nogl`).
- **SEO/social:** metadatos, `og.jpg`, favicon SVG, HTML semántico y contenido indexable.

---

## 4. Presentación, precio y rendimiento

| Concepto | Valor |
| --- | --- |
| Botella completa (1000 ml + atomizador) | **Q50.00** |
| Envase de repuesto (1000 ml, vacío) | **Q15.00** |
| Dilución | **15 ml por litro de agua** |
| Mezcla por botella | **≈ 66 litros** (1000 ÷ 15) |
| Aplicaciones de 1 L | **≈ 66** |

Con la dosis recomendada, una botella de 1000 ml rinde cerca de 66 litros de mezcla. Ese dato se
muestra en la sección de precios y en la ficha del producto.

> **Nota de cálculo:** con Q50 por 1000 ml, el costo del concentrado es **Q0.05 por ml** y
> **Q0.75 por litro de mezcla preparada**. El dato de “Q1.82 por ml” no coincide con estos precios;
> si se refiere a otra presentación o a otro cálculo (por ejemplo, costo por aplicación), conviene
> confirmarlo antes de publicarlo en el sitio.

---

## 5. Dirección de arte

| Token | Valor | Uso |
| --- | --- | --- |
| Verde bosque | `#1B3D2B` | Color principal, secciones oscuras |
| Verde oliva | `#5B8A4B` | Acentos, cursivas, iconografía |
| Verde salvia | `#A7B894` | Fondos suaves y detalles |
| Tierra | `#7A5A3E` | Etiquetas, insignias, detalles cálidos |
| Crema | `#F7F5EC` | Fondo principal |

Tipografías: **Fraunces** (títulos editoriales), **Montserrat** (marca, botones, etiquetas) y
**Poppins** (texto). Autoalojadas en `assets/fonts/` con licencia SIL OFL.

---

## 6. Personalización

La configuración y los productos están en `src/data.js`:

```js
export const CONFIG = {
  whatsapp: '',          // ej. '50251234567' (sin +, sin espacios)
  email: 'hola@ecoreset.gt',
  instagram: '#'
};

export const PRODUCTS = {
  botella: { name: 'Botella 1000 ml', price: 50, ... },
  envase:  { name: 'Envase de repuesto', price: 15, ... }
};
```

- **WhatsApp:** si `CONFIG.whatsapp` está vacío o es el marcador `50200000000`, el botón del pedido
  copia el resumen al portapapeles. Al poner un número real, abre `wa.me` con el pedido escrito y
  actualiza todos los enlaces `data-whatsapp`.
- **Precios y presentaciones:** `PRODUCTS` en `src/data.js` y las tarjetas de `index.html`.
- **Guía de síntomas:** `SYMPTOMS` en `src/data.js`.
- **Colores y radios:** variables CSS al inicio de `assets/css/style.css`.
- **Textos de la etiqueta 3D:** `labelTexture()` en `src/scenes.js` (incluye el QR real y la dosis).
- **Textos de la página:** directamente en `index.html` y `cuidado.html`.

Después de editar `src/` hay que recompilar los dos paquetes:

```bash
pnpm install
pnpm build
```

El resultado se escribe en `assets/js/app.js` (interfaz) y `assets/js/three.bundle.js` (3D). Ambos
van incluidos y compilados en la entrega.

### Estructura

```
index.html              Landing
cuidado.html            Experiencia Scan & Care (destino del QR)
assets/
  css/style.css         Sistema visual completo
  css/fonts.css         @font-face locales
  fonts/*.woff2         Fraunces, Montserrat, Poppins
  img/                  Logotipo, hoja, favicon, grano, og.jpg
  js/app.js             Interfaz (~38 KB) — carga inmediata
  js/three.bundle.js    Three.js + escenas — carga diferida
  vendor/three/         Three.js r169 + RoomEnvironment (para compilar)
  vendor/qrcode/        qrcode-generator (MIT)
src/
  app.js                Entrada
  ui.js                 Interacciones (menú, carrito, QR, FAQ, calculadora…)
  scenes-entry.js       Entrada del paquete 3D
  scenes.js             Botella 3D y papel plantable
  data.js               Productos, guía y configuración
  qr.js                 Generación de QR (SVG y canvas)
```

---

## 7. Rendimiento

El sitio está optimizado para cargar rápido incluso en portátiles modestos:

- **Dos paquetes:** la interfaz pesa ~38 KB y el 3D (~565 KB) se carga **después** del primer
  pintado, como script independiente. El texto y las tipografías ya están en pantalla cuando
  empieza Three.js.
- **Papel plantable bajo demanda:** su escena solo se inicializa cuando la sección está a punto de
  entrar en pantalla; así no se crean dos contextos WebGL al inicio.
- **Render contenido:** 30 FPS, resolución limitada (DPR 1.5 en escritorio y 1.2 en móvil/equipos
  de 4 núcleos o menos) y vidrio sin refracción en esos equipos.
- **Menos desenfoques:** las tarjetas grandes mantienen el vidrio translúcido pero sin
  `backdrop-filter`; en móvil se desactiva en casi toda la interfaz y se oculta el grano.
- **Texturas más livianas:** etiqueta y papel a 3/4 de resolución y menos geometría en hojas,
  gotas y semillas.
- **Escenas pausadas** cuando salen de pantalla o la pestaña no está visible; animaciones y
  desenfoques respetan `prefers-reduced-motion`.

### Parámetros útiles

| Parámetro | Efecto |
| --- | --- |
| `?lite` | Quita desenfoques de fondo (equipos sin GPU o capturas). |
| `?nogl` | No carga el 3D; deja el respaldo estático. |
| `?static` | Muestra todo el contenido sin animaciones de aparición. |

---

## 8. Notas importantes

- **Enlace de Canva:** el enlace compartido abre el editor privado de Canva, por lo que no fue
  posible leer las diapositivas desde aquí. La identidad visual se tomó de la lámina de marca
  incluida en el informe. Si quieres ajustar el sitio a esas diapositivas (mockups, fotos,
  gráficos), compártelas como imágenes o PDF.
- **Marcadores pendientes:** número de WhatsApp, Instagram, correo y dominio son provisionales.
- **Producto:** la composición final, condiciones de uso y beneficios específicos deben verificarse
  con la formulación definitiva. El sitio incluye esa salvedad y Scan & Care se presenta como
  orientación preliminar, no como diagnóstico.
- **Imágenes 3D:** son representaciones del prototipo, no fotografías del producto final.
- **Promociones:** “Kit Nuevo Comienzo”, “Scan & Win” y el 10 % de apertura están sujetos a las
  condiciones que defina la marca antes del lanzamiento.

---

## 9. Créditos

Three.js (MIT) · qrcode-generator de Kazuhiko Arase (MIT) · Fraunces, Montserrat y Poppins
(Google Fonts, SIL OFL) · Dirección y desarrollo para el proyecto Eco Reset, 2026.
