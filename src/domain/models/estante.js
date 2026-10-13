import { r1, fundoPecas } from './helpers.js';

export default {
  id: 'estante', nome: 'Estante ou nicho', desc: 'Prateleiras abertas',
  campos: [
    { k: 'L', t: 'dim', l: 'Largura', d: 800 }, { k: 'A', t: 'dim', l: 'Altura', d: 1800 }, { k: 'P', t: 'dim', l: 'Profundidade', d: 300 },
    { k: 'prat', t: 'int', l: 'Prateleiras', d: 4, min: 0, max: 15 }, { k: 'fundo', t: 'bool', l: 'Com fundo', d: true },
  ],
  gerar(v, t) {
    const iw = v.L - 2 * t, out = [];
    out.push({ mat: 'corpo', q: 2, c: v.A, l: v.P, n: 'Lateral', fc: 1 });
    out.push({ mat: 'corpo', q: 2, c: r1(iw), l: v.P, n: 'Base e topo', fc: 1 });
    if (v.prat > 0) out.push({ mat: 'corpo', q: v.prat, c: r1(iw), l: v.P, n: 'Prateleira', fc: 1 });
    if (v.fundo) out.push(...fundoPecas(v.L, v.A));
    return out;
  },
};
