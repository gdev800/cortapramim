// Peças que não cabem por causa do veio mas caberiam giradas.
import { parseLista, flagsTxt } from '../core/index.js';
import { fac, pIn, toStr } from './units.js';

/** Das peças que não cabem, as que caberiam se pudessem girar (chapa com veio e peça não livre). */
export function caberiamGiradas(bad) {
  return bad.filter((x) => !x.g.rot && !x.p.livre && x.p.l <= x.g.SW + 1e-6 && x.p.c <= x.g.SH + 1e-6);
}

/** Marca como "livre" (pode girar) as peças com essas medidas, em todas as chapas com veio. */
export function marcarLivre(state, lista) {
  const F = fac(state.unit);
  const bate = (r) => lista.some((x) => Math.abs(r.c - x.p.c) < 0.02 && Math.abs(r.l - x.p.l) < 0.02);
  state.blocks.forEach((b) => {
    if (!b.veio) return;
    if (b.mode === 'paste') {
      const p = parseLista(b.paste); let mud = false;
      p.rows.forEach((r) => { if (bate({ c: r.c * F, l: r.l * F })) { r.livre = true; mud = true; } });
      if (mud) b.paste = p.rows.map((x) => x.qty + ' = ' + toStr(x.c) + ' x ' + toStr(x.l) + (x.nome ? ' = ' + x.nome : '') + flagsTxt(x)).join('\n');
    } else {
      b.rows.forEach((r) => { const c = pIn(r.c) * F, l = pIn(r.l) * F; if (bate({ c, l })) { r.livre = true; r.open = true; } });
    }
  });
}
