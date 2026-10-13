// Planejamento completo: sobras primeiro, depois chapas novas.
// Projetos com várias chapas novas (cfg.tentativas, padrão ligado): roda algumas tentativas curtas com partições
// diferentes, fica com a que gasta menos chapas, tenta sumir com a última chapa se ela ficou quase vazia
// (cfg.absorver, padrão ligado) e usa o tempo que sobrou para polir as chapas da tentativa escolhida.
import { mulberry32 } from './rng.js';
import { melhorParticao, particoes } from './shelf.js';
import { otimizarChapa } from './sheet.js';
import { encherSobra } from './scrap.js';
import { consolidar } from './consolidate.js';
import { absorverUltima } from './absorb.js';

const agora = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Menor número de chapas novas possível só pela área (sem contar serra): se o plano bate nele, não dá para usar menos. */
export function minimoChapas(g, SW, SH) {
  let area = 0; g.pieces.forEach(function (p) { area += p.c * p.l; });
  let sobras = 0; (g.sobras || []).forEach(function (s) { sobras += s.c * s.l; });
  return Math.max(0, Math.ceil((area - sobras) / (SW * SH) - 1e-9));
}

/** Área das peças (descontadas as sobras do estoque) medida em chapas inteiras, ex.: 2,97. */
export function areaEmChapas(g, SW, SH) {
  let area = 0; g.pieces.forEach(function (p) { area += p.c * p.l; });
  let sobras = 0; (g.sobras || []).forEach(function (s) { sobras += s.c * s.l; });
  return Math.max(0, (area - sobras) / (SW * SH));
}

// Sobras do estoque (fixas) e as partições candidatas das peças que sobraram para chapas novas.
function preparar(g, cfg, ref, rnd, nPart) {
  g.cfg = { K: cfg.K, minRet: cfg.minRet, SW: g.SW - 2 * ref, SH: g.SH - 2 * ref, rot: !!g.rot, ref: ref, fases: cfg.fases || 0, sobraUnica: cfg.sobraUnica !== false };
  let pieces = g.pieces.slice(); const fixas = [];
  (g.sobras || []).slice().sort(function (a, b) { return (b.c * b.l) - (a.c * a.l); }).forEach(function (sb) {
    if (!pieces.length) return;
    const sc = { K: cfg.K, minRet: cfg.minRet, SW: sb.c, SH: sb.l, rot: !!g.rot, ref: 0, fases: cfg.fases || 0, sobraUnica: cfg.sobraUnica !== false };
    const pick = encherSobra(pieces, sc, rnd);
    if (!pick) return;
    const ids = new Set(pick.chosen.map(function (p) { return p.id; }));
    pieces = pieces.filter(function (p) { return !ids.has(p.id); });
    fixas.push({ sp: pick.spec, cfg: sc, sobra: sb });
  });
  let parts = [[]];
  if (pieces.length) {
    if (nPart > 1) parts = particoes(pieces, g.cfg, rnd, nPart);
    else { const sp = melhorParticao(pieces, g.cfg, rnd); parts = sp ? [sp] : []; }
    if (!parts.length) throw new Error('Alguma peça não cabe na chapa.');
  }
  return { g: g, fixas: fixas, parts: parts };
}

const novasDe = (out) => { let n = 0; out.forEach(function (g) { n += g.sheets.filter(function (s) { return !s.sobra; }).length; }); return n; };
// Menos chapas novas; empatando, a sobra mais concentrada (a última chapa com mais espaço livre num lugar só).
function placar(out) {
  let conc = 0;
  out.forEach(function (g) { g.sheets.forEach(function (s) { if (!s.sobra) { const l = 1 - s.util; conc += l * l; } }); });
  return { nov: novasDe(out), conc: conc };
}
const melhor = (a, b) => a.nov < b.nov || (a.nov === b.nov && a.conc > b.conc + 1e-9);

function fechar(out) {
  let n = 0;
  out.forEach(function (g) {
    g.sheets.forEach(function (s) { s.n = ++n; });
    g.nNovas = g.sheets.filter(function (s) { return !s.sobra; }).length;
    g.nSobras = g.sheets.filter(function (s) { return !!s.sobra; }).length;
  });
  return n;
}

export async function planejar(cfg, groups, totalMs, tick) {
  const rnd = mulberry32((Date.now() & 0xffffff) + 17);
  const ref = cfg.refilo || 0;
  const tentativas = cfg.tentativas !== false;
  // absorver faz parte da consolidação: desligar a consolidação desliga também, a não ser que venha explícito
  const absorver = cfg.absorver !== undefined ? cfg.absorver !== false : cfg.consolidar !== false;
  const t0 = agora();
  const preps = groups.map(function (g) { return preparar(g, cfg, ref, rnd, tentativas ? 4 : 1); });

  let nNovas0 = 0, nSheets0 = 0;
  preps.forEach(function (pr) { nNovas0 += pr.parts[0].length; nSheets0 += pr.fixas.length + pr.parts[0].length; });
  // Quantas tentativas cabem no tempo: metade do tempo para elas, ~150 ms por chapa em cada uma.
  const nTent = tentativas && nNovas0 >= 2 ? Math.max(1, Math.min(4, Math.floor(totalMs * 0.5 / (nSheets0 * 150)))) : 1;
  const multi = nTent > 1;
  let virtual = 0; // linha do tempo da barra de progresso (ms)
  const total = totalMs;

  // Uma tentativa: otimiza todas as chapas com a partição `pi` de cada grupo, dentro de `budget` ms, e consolida.
  async function rodada(pi, budget) {
    const rotulo = multi ? 'Tentativa ' + (pi + 1) + ' de ' + nTent + ': chapa ' : null;
    const plans = []; let totalPieces = 0, nTotal = 0;
    preps.forEach(function (pr) {
      const specs = pr.parts[pi % pr.parts.length];
      const list = pr.fixas.concat(specs.map(function (sp) { return { sp: sp, cfg: pr.g.cfg, sobra: null }; }));
      plans.push(list); nTotal += list.length;
      list.forEach(function (e) { if (e.sp.items.length > 1) totalPieces += e.sp.items.length; });
    });
    const out = []; let no = 0;
    const piso = multi ? [60, 150] : [120, 350];
    for (let gi = 0; gi < preps.length; gi++) {
      const g = preps[gi].g, sheets = [];
      for (let si = 0; si < plans[gi].length; si++) {
        const e = plans[gi][si]; no++;
        const n = e.sp.items.length;
        const ms = n <= 1 ? 0 : Math.max(n <= 4 ? piso[0] : piso[1], budget * n / Math.max(1, totalPieces));
        const base = virtual, cur = no;
        const sheet = await otimizarChapa(e.sp, e.cfg, ms, rnd, function (f) { return tick(Math.min(1, (base + f * ms) / total), cur, nTotal, rotulo ? rotulo + cur + ' de ' + nTotal + '…' : undefined); });
        virtual += ms;
        sheet.n = no; sheet.mat = g.nome; sheet.esp = g.esp; sheet.cfg = e.cfg; sheet.sobra = e.sobra;
        sheets.push(sheet);
      }
      out.push({ mat: g.nome, esp: g.esp, veio: !g.rot, nPecas: g.pieces.length, sheets: sheets, cfg: g.cfg, estoque: g.estoque, preco: g.preco, fitaPreco: g.fitaPreco || 0, fitaNome: g.fitaNome || '',
        nNovas: 0, nSobras: 0, minNovas: minimoChapas(g, g.cfg.SW, g.cfg.SH), areaNovas: areaEmChapas(g, g.cfg.SW, g.cfg.SH) });
    }
    // Peças das últimas chapas que cabem em espaço livre das primeiras sobem para elas.
    if (cfg.consolidar !== false) out.forEach(function (g) { g.sheets = consolidar(g.sheets); });
    fechar(out);
    return out;
  }

  let out = null, best = null;
  for (let t = 0; t < nTent; t++) {
    const r = await rodada(t, multi ? total * 0.5 / nTent : total);
    const pl = placar(r);
    if (!best || melhor(pl, best)) { out = r; best = pl; }
    // já está no mínimo possível pela área: outras tentativas não ganham chapa
    if (out.every(function (g) { return g.nNovas <= g.minNovas; })) break;
  }

  const pausa = function () { return tick(Math.min(0.99, virtual / total), 0, 0, 'Tentando eliminar a chapa menos usada…'); };

  // A chapa nova menos usada quase vazia? Tenta passar as peças dela para as outras.
  if (absorver) {
    const prazo = Math.max(1500, Math.min(8000, total * 0.25));
    const fim = agora() + prazo;
    for (const g of out) {
      while (g.sheets.length > 1 && agora() < fim && g.nNovas > g.minNovas) {
        const nova = await absorverUltima(g.sheets, fim - agora(), rnd, agora, pausa);
        if (!nova) break;
        g.sheets = nova; fechar(out);
      }
    }
  }

  // Polimento: o tempo que sobrou vai para as chapas da tentativa escolhida.
  if (multi) {
    const resta = total - (agora() - t0);
    const alvos = []; let nPol = 0;
    out.forEach(function (g) { g.sheets.forEach(function (s, i) { if (s.spec && s.spec.items.length > 1) { alvos.push([g, i]); nPol += s.spec.items.length; } }); });
    if (resta > 300 && alvos.length) {
      for (const [g, i] of alvos) {
        const s = g.sheets[i], ms = resta * s.spec.items.length / nPol, base = virtual;
        const novo = await otimizarChapa(s.spec, s.cfg, ms, rnd, function (f) { return tick(Math.min(1, (base + f * ms) / total), s.n, 0, 'Refinando a chapa ' + s.n + '…'); });
        virtual += ms;
        if (novo.ok) { ['n', 'mat', 'esp', 'cfg', 'sobra'].forEach(function (k) { novo[k] = s[k]; }); g.sheets[i] = novo; }
      }
    }
  }

  const nTotal = fechar(out);
  return { groups: out, nChapas: nTotal, tentativas: nTent };
}
