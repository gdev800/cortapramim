// PDF de etiquetas para imprimir em A4 e colar nas peças.
import { fmtFor } from '../../domain/units.js';
import { novoPdf, latin1 } from './lib.js';

/** Quantas etiquetas por folha: [colunas, linhas]. */
export const TAMANHOS = { p: [3, 8], m: [2, 6], g: [2, 4] };

/** Todas as peças do plano, em ordem de chapa e número. */
export function itensDeEtiqueta(res) {
  const items = [];
  res.groups.forEach((g) => g.sheets.forEach((sh) => sh.pecas.slice().sort((a, b) => a.id - b.id).forEach((q) => items.push({ q, sh, g }))));
  return items;
}

/**
 * @param {object} state
 * @param {'p'|'m'|'g'} tam
 * @param {boolean} medidas  mostrar as medidas e a fita
 * @param {boolean} mapa     mostrar o mini-mapa da chapa com a peça destacada
 */
export async function gerarPdfEtiquetas(state, tam, medidas, mapa) {
  const doc = novoPdf(), { fu, unit: un } = fmtFor(state.unit);
  const [cols, rows] = TAMANHOS[tam] || TAMANHOS.m;
  const mx = 7, my = 10, cw = (210 - 2 * mx) / cols, ch = (297 - 2 * my) / rows, per = cols * rows;
  const items = itensDeEtiqueta(state.res);
  const fit = (txt, maxW, size, min) => { let s = size; doc.setFontSize(s); while (s > min && doc.getTextWidth(txt) > maxW) { s -= 0.5; doc.setFontSize(s); } return s; };
  const esc1 = ch / 34.6;

  items.forEach((it, i) => {
    if (i > 0 && i % per === 0) doc.addPage();
    const k = i % per, x = mx + (k % cols) * cw, y = my + Math.floor(k / cols) * ch, q = it.q, sh = it.sh;
    doc.setDrawColor(150, 140, 130); doc.setLineWidth(0.25); doc.setLineDashPattern([1.2, 1.2], 0); doc.rect(x + 0.6, y + 0.6, cw - 1.2, ch - 1.2); doc.setLineDashPattern([], 0);
    const pad = 3 * Math.min(1.4, Math.max(1, esc1 * 0.8));
    let mapW = 0;
    if (mapa) {
      const bw = Math.min(cw * 0.34, 30), bh = ch - 2 * pad - 4; const SW = sh.cfg.SW, SH = sh.cfg.SH; const sc = Math.min(bw / SW, bh / SH);
      const mw = SW * sc, mh = SH * sc, mxx = x + cw - pad - mw, myy = y + pad + 1;
      doc.setFillColor(238, 232, 222); doc.setDrawColor(120, 110, 100); doc.setLineWidth(0.2); doc.rect(mxx, myy, mw, mh, 'FD');
      doc.setFillColor(176, 112, 42); doc.rect(mxx + q.x * sc, myy + q.y * sc, Math.max(0.6, q.w * sc), Math.max(0.6, q.h * sc), 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(120, 110, 100); doc.text('chapa ' + sh.n, mxx + mw / 2, myy + mh + 2.8, { align: 'center' });
      mapW = mw + 3;
    }
    const tw = cw - 2 * pad - mapW;
    let yy = y + pad + 4;
    doc.setFont('helvetica', 'bold'); doc.setTextColor(29, 25, 20);
    const t1 = '#' + q.id + (q.nome ? '  ' + latin1(q.nome) : ''); const s1 = fit(t1, tw, 11 * Math.min(1.3, esc1 + 0.2), 6.5); doc.text(t1, x + pad, yy);
    yy += s1 * 0.42 + 2.5;
    if (q.proj) { doc.setFont('helvetica', 'normal'); doc.setTextColor(176, 112, 42); const tp = 'Projeto: ' + latin1(q.proj); fit(tp, tw, 7.5, 5); doc.text(tp, x + pad, yy); yy += 3.6; }
    if (medidas) {
      const t2 = fu(q.c) + ' × ' + fu(q.l) + ' ' + un; const s2 = fit(t2, tw, 17 * Math.min(1.4, esc1 + 0.2), 8); doc.setFont('helvetica', 'bold'); doc.text(t2, x + pad, yy + s2 * 0.2);
      yy += s2 * 0.42 + 3;
      if (q.cf) {
        const tf = 'final com fita ' + fu(q.cf) + ' x ' + fu(q.lf);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 80, 70); fit(tf, tw, 7.5, 5); doc.text(tf, x + pad, yy); yy += 3.6;
      }
    }
    doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 80, 70);
    const t3 = 'Chapa ' + sh.n + ' · ' + latin1(String(it.g.mat)); fit(t3, tw, 7.5, 5.5); doc.text(t3, x + pad, yy); yy += 3.6;
    if (medidas && (q.fc || q.fl)) { const t4 = 'Fita: C x' + (q.fc || 0) + '   L x' + (q.fl || 0); doc.setTextColor(29, 25, 20); doc.setFont('helvetica', 'bold'); fit(t4, tw, 8.5, 6); doc.text(t4, x + pad, yy); yy += 4; }
    if (state.proj.nome) { doc.setFont('helvetica', 'normal'); doc.setTextColor(140, 130, 118); const t5 = latin1(state.proj.nome); fit(t5, tw, 6.5, 5); doc.text(t5, x + pad, y + ch - pad + 0.5); }
  });
  if (!items.length) { doc.setFontSize(12); doc.text('Nenhuma peça no plano.', 14, 20); }
  return doc.output('blob');
}
