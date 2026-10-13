// Plano inicial por prateleiras e divisão das peças em chapas.
import { EPS, H, V } from './constants.js';

// ---------- plano inicial por prateleiras (garante uma solução que cabe) ----------
export function shelfPack(pieces, mode, variant, rnd, cfg) {
  const SW = cfg.SW, SH = cfg.SH, K = cfg.K, rot = cfg.rot;
  const capA = mode === 'r' ? SW : SH, capB = mode === 'r' ? SH : SW;
  const exato = cfg.fases === 2; // 2 fases: cada fileira só aceita peças da mesma altura (sem aparar peça por peça)
  const arr = [];
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i]; const rt = rot || !!p.livre;
    let a = mode === 'r' ? p.c : p.l, b = mode === 'r' ? p.l : p.c, flip = false;
    if (rt && a < b && b <= capA + EPS && a <= capB + EPS) { const t = a; a = b; b = t; flip = true; }
    if (a > capA + EPS || b > capB + EPS) {
      if (rt && b <= capA + EPS && a <= capB + EPS) { const t = a; a = b; b = t; flip = !flip; } else return null;
    }
    arr.push({ p: p, a: a, b: b, flip: flip });
  }
  if (variant === 0) arr.sort(function (x, y) { return (y.b - x.b) || (y.a - x.a); });
  else if (variant === 1) arr.sort(function (x, y) { return (y.a * y.b) - (x.a * x.b); });
  else { arr.forEach(function (it) { it.k = it.b * (0.7 + 0.6 * rnd()); }); arr.sort(function (x, y) { return y.k - x.k; }); }
  const sheets = [];
  arr.forEach(function (it) {
    let placed = false;
    for (let si = 0; si < sheets.length && !placed; si++) {
      const sh = sheets[si];
      for (let fi = 0; fi < sh.shelves.length; fi++) {
        const sf = sh.shelves[fi];
        if (sf.usedA + K + it.a <= capA + EPS && (exato ? Math.abs(it.b - sf.b) <= EPS : it.b <= sf.b + EPS)) { sf.list.push(it); sf.usedA += K + it.a; placed = true; break; }
      }
      if (!placed && sh.usedB + K + it.b <= capB + EPS) { sh.shelves.push({ b: it.b, usedA: it.a, list: [it] }); sh.usedB += K + it.b; placed = true; }
    }
    if (!placed) sheets.push({ shelves: [{ b: it.b, usedA: it.a, list: [it] }], usedB: it.b });
  });
  return sheets;
}

export function initSheet(sh, mode) {
  const items = [], groups = [];
  sh.shelves.forEach(function (sf) { const idxs = []; sf.list.forEach(function (it) { idxs.push(items.length); items.push({ p: it.p, flip: it.flip }); }); groups.push(idxs); });
  const inner = mode === 'r' ? V : H, outer = mode === 'r' ? H : V;
  const expr = [];
  groups.forEach(function (idxs, si) {
    idxs.forEach(function (ix, k) { expr.push(ix); if (k > 0) expr.push(inner); });
    if (si > 0) expr.push(outer);
  });
  return { items: items, expr: expr };
}

// Menos chapas primeiro. Empatando, enche as primeiras chapas e deixa a última com mais sobra (retalho maior).
export function melhorParticao(pieces, cfg, rnd) {
  let best = null; const A = cfg.SW * cfg.SH;
  const tries = pieces.length > 120 ? 80 : 300;
  for (let t = 0; t < tries; t++) {
    ['r', 'c'].forEach(function (mode) {
      const sheets = shelfPack(pieces, mode, t, rnd, cfg);
      if (!sheets) return;
      let conc = 0; const specs = [];
      sheets.forEach(function (sh) {
        const sp = initSheet(sh, mode); let ar = 0;
        sp.items.forEach(function (it) { ar += it.p.c * it.p.l; });
        const free = (A - ar) / A; conc += free * free;
        specs.push(sp);
      });
      if (!best || sheets.length < best.specs.length || (sheets.length === best.specs.length && conc > best.conc)) best = { specs: specs, conc: conc };
    });
  }
  return best ? best.specs : null;
}
