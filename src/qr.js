import qrcode from '../assets/vendor/qrcode/qrcode.js';

function model(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr;
}

/** Devuelve un SVG limpio (una sola ruta) para insertar en el DOM. */
export function qrSvg(text, { color = '#1B3D2B', quiet = 1 } = {}) {
  const qr = model(text);
  const count = qr.getModuleCount();
  const size = count + quiet * 2;
  let path = '';

  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) path += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    }
  }

  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="presentation"><rect width="${size}" height="${size}" fill="#ffffff"/><path d="${path}" fill="${color}"/></svg>`;
}

/** Dibuja el QR en un canvas (para la etiqueta 3D). */
export function drawQrCanvas(ctx, text, x, y, size, color = '#1B3D2B') {
  const qr = model(text);
  const count = qr.getModuleCount();
  const cell = size / (count + 2);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = color;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) ctx.fillRect(x + cell + c * cell, y + cell + r * cell, cell, cell);
    }
  }
  ctx.restore();
}
