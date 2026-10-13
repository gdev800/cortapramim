import { r1, fundoPecas, portasPecas } from './helpers.js';

export default {
  id: 'aereo', nome: 'Armário aéreo', desc: 'Para parede, com portas',
  campos: [
    { k: 'L', t: 'dim', l: 'Largura', d: 800 }, { k: 'A', t: 'dim', l: 'Altura', d: 700 }, { k: 'P', t: 'dim', l: 'Profundidade', d: 350 },
    { k: 'portas', t: 'int', l: 'Portas', d: 2, min: 0, max: 6 }, { k: 'prat', t: 'int', l: 'Prateleiras', d: 1, min: 0, max: 6 },
    { k: 'rec', t: 'dim', l: 'Recuo das prateleiras', d: 20, small: 1 },
  ],
  gerar(v, t) {
    const iw = v.L - 2 * t, out = [];
    out.push({ mat: 'corpo', q: 2, c: v.A, l: v.P, n: 'Lateral', fc: 1 });
    out.push({ mat: 'corpo', q: 2, c: r1(iw), l: v.P, n: 'Base e topo', fc: 1 });
    if (v.prat > 0) out.push({ mat: 'corpo', q: v.prat, c: r1(iw), l: r1(v.P - v.rec), n: 'Prateleira', fc: 1 });
    if (v.portas > 0) out.push(...portasPecas(v.portas, v.A, v.L));
    out.push(...fundoPecas(v.L, v.A));
    return out;
  },
};
