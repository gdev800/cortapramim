import { r1, fundoPecas } from './helpers.js';

export default {
  id: 'gaveteiro', nome: 'Gaveteiro', desc: 'Cômoda com gavetas e corrediças',
  campos: [
    { k: 'L', t: 'dim', l: 'Largura', d: 800 }, { k: 'A', t: 'dim', l: 'Altura', d: 900 }, { k: 'P', t: 'dim', l: 'Profundidade', d: 450 },
    { k: 'g', t: 'int', l: 'Gavetas', d: 4, min: 1, max: 8 }, { k: 'corr', t: 'dim', l: 'Corrediça (vazio = automático)', d: 0, opt: 1, small: 1 },
  ],
  gerar(v, t) {
    const iw = v.L - 2 * t, g = v.g, out = [];
    const hf = (v.A - 4 - 3 * (g - 1)) / g;
    const corr = v.corr > 0 ? v.corr : Math.min(600, Math.max(250, Math.floor((v.P - 50) / 50) * 50));
    const cw = iw - 26, hb = Math.max(60, hf - 70);
    out.push({ mat: 'corpo', q: 2, c: v.A, l: v.P, n: 'Lateral', fc: 1 });
    out.push({ mat: 'corpo', q: 2, c: r1(iw), l: v.P, n: 'Base e topo', fc: 1 });
    out.push({ mat: 'corpo', q: g, c: r1(v.L - 4), l: r1(hf), n: 'Frente de gaveta', fc: 2, fl: 2 });
    out.push({ mat: 'corpo', q: 2 * g, c: r1(corr), l: r1(hb), n: 'Lateral de gaveta' });
    out.push({ mat: 'corpo', q: 2 * g, c: r1(cw - 2 * t), l: r1(hb), n: 'Frente e traseira de gaveta' });
    out.push({ mat: 'fundo', q: g, c: r1(corr - 10), l: r1(cw - 10), n: 'Fundo de gaveta' });
    out.push(...fundoPecas(v.L, v.A));
    return out;
  },
};
