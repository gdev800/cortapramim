// Fases de corte: quantas vezes a direção da serra muda até chegar numa peça.
// Verificador independente do otimizador: reconstrói os retângulos a partir da lista de cortes.
// Ex.: cortar uma chapa em tiras (fase 1) e depois cada tira em peças (fase 2). Um corte de acabamento (aparar) conta como fase a mais.
const TOL = 1e-4;

/**
 * @param {{tipo:'V'|'H', pos:number, ini:number, fim:number}[]} cortes  em ordem de execução
 * @param {{x:number, y:number, w:number, h:number}[]} pecas
 * @param {{SW:number, SH:number, K:number}} cfg
 * @returns {{fases:number, porCorte:number[]}}  fases = maior número de fases entre as peças; porCorte = fase de cada corte
 */
export function fasesDoPlano(cortes, pecas, cfg) {
  const K = cfg.K;
  let rects = [{ x: 0, y: 0, w: cfg.SW, h: cfg.SH, n: 0, ult: '' }];
  const porCorte = [];
  for (let k = 0; k < cortes.length; k++) {
    const c = cortes[k], v = c.tipo === 'V';
    const i = rects.findIndex(function (r) {
      return v
        ? c.pos > r.x + TOL && c.pos < r.x + r.w - TOL && c.ini >= r.y - TOL && c.fim <= r.y + r.h + TOL
        : c.pos > r.y + TOL && c.pos < r.y + r.h - TOL && c.ini >= r.x - TOL && c.fim <= r.x + r.w + TOL;
    });
    if (i < 0) return { fases: Infinity, porCorte: porCorte };
    const r = rects[i], dir = v ? 'V' : 'H', n = r.ult === dir ? r.n : r.n + 1;
    porCorte.push(n);
    const a = v ? { x: r.x, y: r.y, w: c.pos - r.x, h: r.h } : { x: r.x, y: r.y, w: r.w, h: c.pos - r.y };
    const b = v ? { x: c.pos + K, y: r.y, w: r.x + r.w - c.pos - K, h: r.h } : { x: r.x, y: c.pos + K, w: r.w, h: r.y + r.h - c.pos - K };
    a.n = b.n = n; a.ult = b.ult = dir;
    const novos = [a, b].filter(function (q) { return q.w > TOL && q.h > TOL; });
    rects = rects.slice(0, i).concat(novos, rects.slice(i + 1));
  }
  let max = 0;
  for (let k = 0; k < pecas.length; k++) {
    const p = pecas[k];
    const r = rects.find(function (q) { return p.x >= q.x - TOL && p.y >= q.y - TOL && p.x + p.w <= q.x + q.w + TOL && p.y + p.h <= q.y + q.h + TOL; });
    if (!r) return { fases: Infinity, porCorte: porCorte };
    if (r.n > max) max = r.n;
  }
  return { fases: max, porCorte: porCorte };
}
