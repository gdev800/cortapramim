// Otimização de uma chapa: árvore de cortes -> posições, cortes e retalhos.
import { EPS, H, V } from './constants.js';
import { anneal, costOf, makeCtx } from './anneal.js';
import { fasesDoPlano } from './phases.js';

// ---------- reconstrução: árvore -> posições, cortes e retalhos ----------
function parseTree(expr, ctx) {
  const st = [], K = ctx.cfg.K;
  expr.forEach(function (t) {
    if (t >= 0) {
      const f = ctx.fl[t]; st.push({ t: 'L', i: t, w: f ? ctx.l0[t] : ctx.c0[t], h: f ? ctx.c0[t] : ctx.l0[t] });
    } else {
      const r = st.pop(), l = st.pop();
      if (t === V) st.push({ t: 'V', l: l, r: r, w: l.w + K + r.w, h: Math.max(l.h, r.h) });
      else st.push({ t: 'H', l: l, r: r, h: l.h + K + r.h, w: Math.max(l.w, r.w) });
    }
  });
  return st[0];
}
// restrito (fases limitadas): nenhum nó apara na direção perpendicular à sua divisão; a medida passa para as tiras,
// e cada peça (ou cadeia de outra direção) apara o seu lado. Assim a contagem de fases fica igual à do otimizador.
function placeNode(n, x, y, rw, rh, depth, cuts, placed, restos, K, restrito) {
  const raiz = !!restrito && n.t !== 'L';
  if (rw > n.w + EPS && !(raiz && n.t === 'H')) {
    cuts.push({ d: 2 * depth, axis: 0, tipo: 'V', pos: x + n.w, ini: y, fim: y + rh });
    const wr = rw - n.w - K; if (wr > EPS) restos.push({ x: x + n.w + K, y: y, w: wr, h: rh });
  }
  if (rh > n.h + EPS && !(raiz && n.t === 'V')) {
    cuts.push({ d: 2 * depth, axis: 1, tipo: 'H', pos: y + n.h, ini: x, fim: x + n.w });
    const hr = rh - n.h - K; if (hr > EPS) restos.push({ x: x, y: y + n.h + K, w: n.w, h: hr });
  }
  if (n.t === 'L') { placed.push({ x: x, y: y, w: n.w, h: n.h, i: n.i }); return; }
  if (n.t === 'V') {
    const w1 = n.l.w, hh = raiz ? rh : n.h;
    cuts.push({ d: 2 * depth + 1, axis: 0, tipo: 'V', pos: x + w1, ini: y, fim: y + hh });
    placeNode(n.l, x, y, w1, hh, depth + 1, cuts, placed, restos, K, restrito);
    placeNode(n.r, x + w1 + K, y, n.r.w, hh, depth + 1, cuts, placed, restos, K, restrito);
  } else {
    const h1 = n.l.h, ww = raiz ? rw : n.w;
    cuts.push({ d: 2 * depth + 1, axis: 1, tipo: 'H', pos: y + h1, ini: x, fim: x + ww });
    placeNode(n.l, x, y, ww, h1, depth + 1, cuts, placed, restos, K, restrito);
    placeNode(n.r, x, y + h1 + K, ww, n.r.h, depth + 1, cuts, placed, restos, K, restrito);
  }
}
function verificar(placed, n, cfg) {
  const K = cfg.K; let ok = placed.length === n;
  placed.forEach(function (p) { if (p.x < -EPS || p.y < -EPS || p.x + p.w > cfg.SW + 1e-4 || p.y + p.h > cfg.SH + 1e-4) ok = false; });
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
    const a = placed[i], b = placed[j];
    if (a.x < b.x + b.w + K - 1e-4 && b.x < a.x + a.w + K - 1e-4 && a.y < b.y + b.h + K - 1e-4 && b.y < a.y + a.h + K - 1e-4) ok = false;
  }
  return ok;
}

// Monta a chapa (posições, cortes, retalhos e verificação) a partir da árvore de cortes. Sem busca:
// serve para o otimizador e para a edição manual. spec = { expr, items: [{ p, flip }] }.
export function montarChapa(spec, cfg) {
  const ctx = makeCtx(spec.items, cfg);
  const root = parseTree(spec.expr, ctx);
  const cuts = [], placed = [], restos = [];
  const restrito = cfg.fases > 0;
  placeNode(root, 0, 0, cfg.SW, cfg.SH, 0, cuts, placed, restos, cfg.K, restrito);
  cuts.sort(function (a, b) { return (a.d - b.d) || (a.axis - b.axis) || (a.pos - b.pos) || (a.ini - b.ini); });
  // Conferência independente do otimizador: recorta a chapa na ordem dos cortes e conta as mudanças de direção por peça.
  const fs = restrito ? fasesDoPlano(cuts, placed, cfg) : null;
  if (fs) cuts.forEach(function (c, i) { c.fase = fs.porCorte[i]; });
  const pecas = placed.map(function (q) {
    const it = spec.items[q.i];
    return { x: q.x, y: q.y, w: q.w, h: q.h, id: it.p.id, c: it.p.c, l: it.p.l, nome: it.p.nome || '', fc: it.p.fc || 0, fl: it.p.fl || 0, cf: it.p.cf || 0, lf: it.p.lf || 0, proj: it.p.proj || '', girada: !!ctx.fl[q.i] };
  });
  let area = 0; pecas.forEach(function (q) { area += q.w * q.h; });
  restos.forEach(function (r) { r.util = Math.min(r.w, r.h) >= cfg.minRet; });
  restos.sort(function (a, b) { return (b.w * b.h) - (a.w * a.h); });
  const uteis = restos.filter(function (r) { return r.util; });
  let areaUtil = 0; uteis.forEach(function (r) { areaUtil += r.w * r.h; });
  return {
    pecas: pecas, cortes: cuts, nCortes: cuts.length, util: area / (cfg.SW * cfg.SH),
    ok: verificar(placed, ctx.n, cfg) && (!fs || fs.fases <= cfg.fases), fases: fs ? fs.fases : 0,
    area: area, restos: restos, maiorRetalho: uteis.length ? uteis[0] : null, areaRetalhos: areaUtil,
    spec: { expr: spec.expr.slice(), items: spec.items.map(function (it) { return { p: it.p, flip: !!it.flip }; }) },
  };
}

export async function otimizarChapa(sp, cfg, ms, rnd, tick) {
  const ctx = makeCtx(sp.items, cfg);
  let best = { expr: sp.expr.slice(), fl: ctx.fl.slice() };
  best.cost = costOf(best.expr, best.fl, ctx);
  if (ctx.n > 1 && ms > 0) {
    const rounds = 3;
    for (let r = 0; r < rounds; r++) {
      const b = await anneal(ctx, best, ms / rounds, r === 0 ? 0.6 : 0.35, 0.02, rnd, function (f) { return tick((r + f) / rounds); });
      if (b && b.cost < best.cost) best = b;
    }
  }
  return montarChapa({ expr: best.expr, items: sp.items.map(function (it, i) { return { p: it.p, flip: !!best.fl[i] }; }) }, cfg);
}
