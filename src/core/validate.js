// Verifica se as peças cabem na chapa.
import { EPS } from './constants.js';

export function naoCabem(groups) {
  const bad = [];
  groups.forEach(function (g) {
    g.pieces.forEach(function (p) {
      const ok = (p.c <= g.SW + EPS && p.l <= g.SH + EPS) || ((g.rot || p.livre) && p.l <= g.SW + EPS && p.c <= g.SH + EPS);
      if (!ok) bad.push({ p: p, g: g });
    });
  });
  return bad;
}
