// Preenchimento de sobras do estoque.
import { initSheet, shelfPack } from './shelf.js';

// Enche uma sobra do estoque com o máximo de peças que cabem nela (maiores primeiro).
export function encherSobra(pieces, sc, rnd) {
  const ord = pieces.slice().sort(function (x, y) { return (y.c * y.l) - (x.c * x.l); });
  let chosen = [], spec = null;
  ord.forEach(function (p) {
    const test = chosen.concat([p]);
    for (let v = 0; v < 2; v++) {
      let ok = null;
      ['r', 'c'].forEach(function (mode) {
        if (ok) return;
        const sheets = shelfPack(test, mode, v, rnd, sc);
        if (sheets && sheets.length === 1) ok = initSheet(sheets[0], mode);
      });
      if (ok) { chosen = test; spec = ok; return; }
    }
  });
  return chosen.length ? { chosen: chosen, spec: spec } : null;
}
