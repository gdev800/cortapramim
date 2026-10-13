import { r1, fundoPecas, portasPecas } from './helpers.js';

export default {
  id: 'guarda', nome: 'Guarda-roupa', desc: 'Portas, divisórias e prateleiras',
  campos: [
    { k: 'L', t: 'dim', l: 'Largura', d: 1800 }, { k: 'A', t: 'dim', l: 'Altura', d: 2400 }, { k: 'P', t: 'dim', l: 'Profundidade', d: 550 },
    { k: 'portas', t: 'int', l: 'Portas', d: 3, min: 0, max: 8 }, { k: 'div', t: 'int', l: 'Divisórias verticais', d: 1, min: 0, max: 4 },
    { k: 'prat', t: 'int', l: 'Prateleiras por vão', d: 3, min: 0, max: 10 }, { k: 'rec', t: 'dim', l: 'Recuo das prateleiras', d: 20, small: 1 },
  ],
  gerar(v, t) {
    const iw = v.L - 2 * t, vao = (iw - v.div * t) / (v.div + 1), out = [];
    out.push({ mat: 'corpo', q: 2, c: v.A, l: v.P, n: 'Lateral', fc: 1 });
    out.push({ mat: 'corpo', q: 2, c: r1(iw), l: v.P, n: 'Base e topo', fc: 1 });
    if (v.div > 0) out.push({ mat: 'corpo', q: v.div, c: r1(v.A - 2 * t), l: v.P, n: 'Divisória', fc: 1 });
    if (v.prat > 0) out.push({ mat: 'corpo', q: (v.div + 1) * v.prat, c: r1(vao), l: r1(v.P - v.rec), n: 'Prateleira', fc: 1 });
    if (v.portas > 0) out.push(...portasPecas(v.portas, v.A, v.L));
    out.push(...fundoPecas(v.L, v.A));
    return out;
  },
};
