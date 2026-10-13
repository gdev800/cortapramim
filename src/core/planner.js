// Planejamento completo: sobras primeiro, depois chapas novas.
import { mulberry32 } from './rng.js';
import { melhorParticao } from './shelf.js';
import { otimizarChapa } from './sheet.js';
import { encherSobra } from './scrap.js';

export async function planejar(cfg, groups, totalMs, tick) {
  const rnd = mulberry32((Date.now() & 0xffffff) + 17);
  const ref = cfg.refilo || 0;
  const plans = []; let totalPieces = 0, nTotal = 0;
  groups.forEach(function (g) {
    g.cfg = { K: cfg.K, minRet: cfg.minRet, SW: g.SW - 2 * ref, SH: g.SH - 2 * ref, rot: !!g.rot, ref: ref, fases: cfg.fases || 0 };
    let pieces = g.pieces.slice(); const list = [];
    (g.sobras || []).slice().sort(function (a, b) { return (b.c * b.l) - (a.c * a.l); }).forEach(function (sb) {
      if (!pieces.length) return;
      const sc = { K: cfg.K, minRet: cfg.minRet, SW: sb.c, SH: sb.l, rot: !!g.rot, ref: 0, fases: cfg.fases || 0 };
      const pick = encherSobra(pieces, sc, rnd);
      if (!pick) return;
      const ids = new Set(pick.chosen.map(function (p) { return p.id; }));
      pieces = pieces.filter(function (p) { return !ids.has(p.id); });
      list.push({ sp: pick.spec, cfg: sc, sobra: sb });
    });
    if (pieces.length) {
      const specs = melhorParticao(pieces, g.cfg, rnd);
      if (!specs) throw new Error('Alguma peça não cabe na chapa.');
      specs.forEach(function (sp) { list.push({ sp: sp, cfg: g.cfg, sobra: null }); });
    }
    plans.push(list); nTotal += list.length;
    list.forEach(function (e) { if (e.sp.items.length > 1) totalPieces += e.sp.items.length; });
  });
  const out = []; let no = 0, elapsed = 0;
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi], sheets = [];
    for (let si = 0; si < plans[gi].length; si++) {
      const e = plans[gi][si]; no++;
      const n = e.sp.items.length;
      const ms = n <= 1 ? 0 : Math.max(n <= 4 ? 120 : 350, totalMs * n / Math.max(1, totalPieces));
      const base = elapsed, cur = no;
      const sheet = await otimizarChapa(e.sp, e.cfg, ms, rnd, function (f) { return tick(Math.min(1, (base + f * ms) / totalMs), cur, nTotal); });
      elapsed += ms;
      sheet.n = no; sheet.mat = g.nome; sheet.esp = g.esp; sheet.cfg = e.cfg; sheet.sobra = e.sobra;
      sheets.push(sheet);
    }
    out.push({ mat: g.nome, esp: g.esp, veio: !g.rot, nPecas: g.pieces.length, sheets: sheets, cfg: g.cfg, estoque: g.estoque, preco: g.preco, fitaPreco: g.fitaPreco || 0, fitaNome: g.fitaNome || '',
      nNovas: sheets.filter(function (s) { return !s.sobra; }).length, nSobras: sheets.filter(function (s) { return !!s.sobra; }).length });
  }
  return { groups: out, nChapas: nTotal };
}
