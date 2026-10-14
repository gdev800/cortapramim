// Gráfico de barras em SVG próprio (sem biblioteca). Só monta o texto do SVG: sem DOM, testável em Node.
import { esc } from '../../../core/index.js';
import { toStr } from '../../../domain/units.js';

export const METRICAS = {
  chapas: { rotulo: 'Chapas novas', fmt: (v) => toStr(v) },
  pecas: { rotulo: 'Peças cortadas', fmt: (v) => toStr(v) },
  economia: { rotulo: 'Economia com sobras (R$)', fmt: (v) => toStr(Math.round(v)) },
};

/**
 * @param {object[]} serie serieMensal(...)
 * @param {string} metrica chave de METRICAS
 * @param {{ano:number,mes:number}} sel mês destacado
 */
export function graficoBarras(serie, metrica, sel) {
  const M = METRICAS[metrica] || METRICAS.chapas, k = METRICAS[metrica] ? metrica : 'chapas';
  const W = 600, H = 220, top = 22, base = H - 28, n = serie.length || 1, passo = W / n, bw = Math.min(56, passo * 0.6);
  const max = Math.max(0, ...serie.map((s) => Number(s[k]) || 0));
  const barras = serie.map((s, i) => {
    const v = Number(s[k]) || 0, h = max > 0 ? (v / max) * (base - top) : 0, x = i * passo + (passo - bw) / 2;
    const atual = sel && s.ano === sel.ano && s.mes === sel.mes;
    return '<g class="rel-b' + (atual ? ' on' : '') + '" data-ano="' + s.ano + '" data-mes="' + s.mes + '">' +
      '<title>' + esc(s.rotulo + ': ' + M.fmt(v)) + '</title>' +
      '<rect x="' + x.toFixed(1) + '" y="' + (base - h).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(h, v > 0 ? 1 : 0).toFixed(1) + '" rx="4"></rect>' +
      '<text class="rel-v" x="' + (x + bw / 2).toFixed(1) + '" y="' + (base - h - 6).toFixed(1) + '" text-anchor="middle">' + esc(M.fmt(v)) + '</text>' +
      '<text class="rel-x" x="' + (x + bw / 2).toFixed(1) + '" y="' + (base + 18) + '" text-anchor="middle">' + esc(s.rotulo) + '</text></g>';
  }).join('');
  return '<svg class="rel-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(M.rotulo + ' por mês') + '">' +
    '<line class="rel-eixo" x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '"></line>' + barras + '</svg>';
}
