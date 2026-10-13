// Avaliação de uma árvore de cortes e busca por têmpera simulada.
import { EPS, H, V } from './constants.js';

// ---------- avaliação de uma expressão polonesa (árvore de cortes) ----------
// Mede também a "sobra útil": retângulos de sobra com os dois lados >= minRet.
const stw = new Float64Array(512), sth = new Float64Array(512);
let evW = 0, evH = 0, evUse = 0, evFases = 0;
// Fases de corte (só quando cfg.fases > 0). Em fases limitadas nenhum nó apara na direção perpendicular à sua divisão:
// a cadeia de cortes na mesma direção é uma "fileira" e cada tira dentro dela apara o seu lado.
// Por nó guardamos o resumo da cadeia: tipo (0 peça, 1 V, 2 H), e as fases extras das tiras da cadeia
//   e0/e1 = tiras na altura máxima (sem aparo / com aparo), b1 = tiras abaixo da máxima (sempre com aparo; -1 se não há).
const skind = new Int8Array(512), se0 = new Int16Array(512), se1 = new Int16Array(512), sb1 = new Int16Array(512);
let gHm = 0, gE0 = 0, gE1 = 0, gB1 = 0;
// Resumo do nó i visto como tira de uma cadeia de direção t (V ou H); hm = tamanho dele ao longo da perpendicular.
function tira(i, t, w, h) {
  gHm = t === V ? h : w;
  const k = skind[i], mesma = (t === V ? 1 : 2);
  if (k === mesma) { gE0 = se0[i]; gE1 = se1[i]; gB1 = sb1[i]; }
  else if (k === 0) { gE0 = 0; gE1 = 1; gB1 = -1; }                       // peça: aparar pede uma fase a mais
  else { const r = 1 + Math.max(se0[i], sb1[i]); gE0 = r; gE1 = r; gB1 = -1; } // cadeia de outra direção: uma fase nova
}
function evalExpr(expr, c0, l0, fl, cfg) {
  let sp = 0, cuts = 0, use = 0; const K = cfg.K, mr = cfg.minRet, ph = cfg.fases > 0, N = expr.length;
  for (let i = 0; i < expr.length; i++) {
    const t = expr[i];
    if (t >= 0) {
      if (fl[t]) { stw[sp] = l0[t]; sth[sp] = c0[t]; } else { stw[sp] = c0[t]; sth[sp] = l0[t]; }
      if (ph) skind[sp] = 0;
      sp++;
    } else {
      sp--; const w2 = stw[sp], h2 = sth[sp];
      sp--; const w1 = stw[sp], h1 = sth[sp];
      cuts++;
      if (ph) {
        tira(sp, t, w1, h1); const hmA = gHm, a0 = gE0, a1 = gE1, ab = gB1;
        tira(sp + 1, t, w2, h2); const hmB = gHm, b0 = gE0, b1 = gE1, bb = gB1;
        const d = hmA - hmB;
        if (Math.abs(d) <= EPS) { se0[sp] = Math.max(a0, b0); se1[sp] = Math.max(a1, b1); sb1[sp] = Math.max(ab, bb); }
        else if (d > 0) { se0[sp] = a0; se1[sp] = a1; sb1[sp] = Math.max(ab, b1, bb); }
        else { se0[sp] = b0; se1[sp] = b1; sb1[sp] = Math.max(bb, a1, ab); }
        skind[sp] = t === V ? 1 : 2;
      }
      if (t === V) {
        stw[sp] = w1 + K + w2;
        if (Math.abs(h1 - h2) > EPS) {
          cuts++;
          let ww, hh;
          if (h1 > h2) { sth[sp] = h1; ww = w2; hh = h1 - h2 - K; } else { sth[sp] = h2; ww = w1; hh = h2 - h1 - K; }
          if (ww >= mr && hh >= mr) use += ww * hh;
        } else sth[sp] = h1;
      } else {
        sth[sp] = h1 + K + h2;
        if (Math.abs(w1 - w2) > EPS) {
          cuts++;
          let ww, hh;
          if (w1 > w2) { stw[sp] = w1; ww = w1 - w2 - K; hh = h2; } else { stw[sp] = w2; ww = w2 - w1 - K; hh = h1; }
          if (ww >= mr && hh >= mr) use += ww * hh;
        } else stw[sp] = w1;
      }
      sp++;
    }
  }
  const w = stw[0], h = sth[0];
  // Com fases limitadas, a faixa perpendicular à raiz vira sobras por tira: não conta como retalho único aqui (estimativa conservadora).
  const rootV = ph && N > 1 && expr[N - 1] === V, rootH = ph && N > 1 && expr[N - 1] === H;
  if (w < cfg.SW - EPS) { cuts++; const ww = cfg.SW - w - K; if (!rootH && ww >= mr && cfg.SH >= mr) use += ww * cfg.SH; }
  if (h < cfg.SH - EPS) { cuts++; const hh = cfg.SH - h - K; if (!rootV && w >= mr && hh >= mr) use += w * hh; }
  if (ph) {
    if (N === 1) evFases = (w < cfg.SW - EPS ? 1 : 0) + (h < cfg.SH - EPS ? 1 : 0);
    else {
      const cheia = skind[0] === 1 ? h >= cfg.SH - EPS : w >= cfg.SW - EPS; // as tiras mais altas já têm o tamanho da chapa
      evFases = 1 + Math.max(cheia ? se0[0] : se1[0], sb1[0]);
    }
  }
  evW = w; evH = h; evUse = use;
  return cuts;
}

export function makeCtx(items, cfg) {
  const n = items.length;
  const c0 = new Float64Array(n), l0 = new Float64Array(n), fl = new Uint8Array(n);
  let area = 0; const rotable = [];
  for (let i = 0; i < n; i++) {
    c0[i] = items[i].p.c; l0[i] = items[i].p.l; fl[i] = items[i].flip ? 1 : 0;
    area += c0[i] * l0[i];
    if ((cfg.rot || items[i].p.livre) && Math.abs(c0[i] - l0[i]) > EPS && l0[i] <= cfg.SW + EPS && c0[i] <= cfg.SH + EPS) rotable.push(i);
  }
  return { n: n, c0: c0, l0: l0, fl: fl, area: area, rotable: rotable, cfg: cfg, lastCuts: 0, lastOk: false, lastUse: 0, lastFases: 0 };
}

// Objetivo: maximizar a sobra útil (retalho grande), manter o desenho compacto e, de leve, usar poucos cortes.
export function costOf(expr, fl, ctx) {
  const cfg = ctx.cfg, A = cfg.SW * cfg.SH;
  const cuts = evalExpr(expr, ctx.c0, ctx.l0, fl, cfg);
  const over = Math.max(0, evW - cfg.SW) + Math.max(0, evH - cfg.SH);
  const compact = Math.max(0, evW * evH - ctx.area) / A;
  const exc = cfg.fases > 0 ? Math.max(0, evFases - cfg.fases) : 0; // fases a mais que o permitido
  ctx.lastCuts = cuts; ctx.lastOk = over <= EPS && exc === 0; ctx.lastUse = evUse; ctx.lastFases = cfg.fases > 0 ? evFases : 0;
  return 10 * (1 - evUse / A) + compact + 0.03 * cuts + (over > EPS ? 2 + over * 0.03 : 0) + 2 * exc;
}

function valida(e) { let c = 0; for (let i = 0; i < e.length; i++) { c += e[i] >= 0 ? 1 : -1; if (c < 1) return false; } return c === 1; }

function neighbor(expr, fl, ctx, rnd) {
  const L = expr.length; const e = expr.slice(); let f = fl; const r = rnd();
  const flipP = ctx.rotable.length ? 0.12 : 0;
  if (r < 0.40) {
    const pos = []; for (let i = 0; i < L; i++) if (e[i] >= 0) pos.push(i);
    let a, b;
    if (rnd() < 0.5) { const k = (rnd() * (pos.length - 1)) | 0; a = pos[k]; b = pos[k + 1]; }
    else { const i = (rnd() * pos.length) | 0; let j = (rnd() * pos.length) | 0; if (j === i) j = (j + 1) % pos.length; a = pos[i]; b = pos[j]; }
    const t = e[a]; e[a] = e[b]; e[b] = t; return { e: e, f: f };
  }
  if (r < 0.58) {
    const ops = []; for (let i = 0; i < L; i++) if (e[i] < 0) ops.push(i);
    const i = ops[(rnd() * ops.length) | 0]; let j = i, k = i;
    while (j > 0 && e[j - 1] < 0) j--;
    while (k < L - 1 && e[k + 1] < 0) k++;
    for (let m = j; m <= k; m++) e[m] = e[m] === V ? H : V;
    return { e: e, f: f };
  }
  if (r < 0.58 + flipP) {
    const i = ctx.rotable[(rnd() * ctx.rotable.length) | 0];
    f = fl.slice(); f[i] ^= 1; return { e: e, f: f };
  }
  for (let tries = 0; tries < 10; tries++) {
    const i = (rnd() * (L - 1)) | 0;
    if ((e[i] >= 0) !== (e[i + 1] >= 0)) {
      const t = e[i]; e[i] = e[i + 1]; e[i + 1] = t;
      if (valida(e)) return { e: e, f: f };
      const t2 = e[i]; e[i] = e[i + 1]; e[i + 1] = t2;
    }
  }
  return { e: e, f: f };
}

export async function anneal(ctx, start, durMs, T0, T1, rnd, tick) {
  let expr = start.expr.slice(), fl = start.fl.slice();
  let cur = costOf(expr, fl, ctx);
  let best = ctx.lastOk ? { cost: cur, cuts: ctx.lastCuts, use: ctx.lastUse, expr: expr.slice(), fl: fl.slice() } : null;
  const t0 = performance.now(); let T = T0;
  for (;;) {
    const sliceEnd = performance.now() + 25;
    while (performance.now() < sliceEnd) {
      for (let k = 0; k < 150; k++) {
        const nb = neighbor(expr, fl, ctx, rnd);
        const c2 = costOf(nb.e, nb.f, ctx);
        const d = c2 - cur;
        if (d <= 0 || rnd() < Math.exp(-d / T)) {
          expr = nb.e; fl = nb.f; cur = c2;
          if (ctx.lastOk && (best === null || c2 < best.cost - 1e-12)) best = { cost: c2, cuts: ctx.lastCuts, use: ctx.lastUse, expr: expr.slice(), fl: fl.slice() };
        }
      }
    }
    const frac = (performance.now() - t0) / durMs;
    if (frac >= 1) break;
    T = T0 * Math.pow(T1 / T0, frac);
    await tick(frac);
  }
  return best;
}
