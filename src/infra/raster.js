// Desenho SVG -> imagem PNG (usado nos PDFs e nos downloads).
export function svgToCanvas(r, px) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = px; cv.height = Math.round(px * r.h / r.w);
      const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
      resolve(cv);
    };
    img.onerror = () => reject(new Error('svg'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(r.svg);
  });
}

export const svgToPngBlob = (r, px) => svgToCanvas(r, px).then((cv) => new Promise((resolve, reject) => { cv.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'); }));
