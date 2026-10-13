// Absorção da última chapa: quando uma chapa nova sai quase vazia, tenta passar as peças dela para as outras,
// rearrumando a chapa de destino inteira (não só encaixando num buraco). Se todas couberem, a chapa sai do plano.
// Analogia: o último caminhão da mudança saiu com duas caixas; em vez de mandá-lo, reabre os outros e arruma de novo.
import { V } from './constants.js';
import { anneal, makeCtx } from './anneal.js';
import { montarChapa } from './sheet.js';
import { moverPeca } from './edit.js';

const areaChapa = (s) => s.cfg.SW * s.cfg.SH;
const uso = (s) => s.area / areaChapa(s);
const livreMm2 = (s) => areaChapa(s) - s.area;

/** Abaixo deste uso a última chapa é candidata a sumir. */
export const USO_MAX_ABSORVER = 0.4;

function copiarCampos(de, para) {
  ['n', 'mat', 'esp', 'cfg', 'sobra'].forEach(function (k) { para[k] = de[k]; });
  para.manual = false;
  return para;
}

// Põe a peça p na chapa s: primeiro o encaixe rápido (moverPeca, só procura o melhor buraco), depois rearrumando a chapa toda.
async function caber(s, p, ms, rnd, pausa) {
  const sozinha = { n: -1, cfg: s.cfg, spec: { expr: [0], items: [{ p: p, flip: false }] } };
  const rapido = moverPeca(sozinha, p.id, s);
  if (!rapido.erro) return copiarCampos(s, rapido.to);
  const items = s.spec.items.map(function (it) { return { p: it.p, flip: !!it.flip }; }).concat([{ p: p, flip: false }]);
  const ctx = makeCtx(items, s.cfg);
  const start = { expr: s.spec.expr.concat([items.length - 1, V]), fl: ctx.fl.slice() };
  for (let r = 0; r < 2; r++) {
    const b = await anneal(ctx, start, ms / 2, 0.6, 0.02, rnd, pausa);
    if (!b) continue;
    const novo = montarChapa({ expr: b.expr, items: items.map(function (it, i) { return { p: it.p, flip: !!b.fl[i] }; }) }, s.cfg);
    if (novo.ok) return copiarCampos(s, novo);
  }
  return null;
}

/**
 * Tenta tirar do plano a chapa nova menos usada (se estiver abaixo de USO_MAX_ABSORVER).
 * @param {object[]} sheets chapas de um material (já otimizadas)
 * @param {number} prazoMs tempo máximo
 * @param {function} agora relógio em ms; pausa(): devolve a vez para a tela durante a busca
 * @returns {Promise<object[]|null>} lista nova sem aquela chapa, ou null se não deu (o plano fica como estava)
 */
export async function absorverUltima(sheets, prazoMs, rnd, agora, pausa) {
  const fim = agora() + prazoMs;
  const novas = sheets.filter(function (s) { return !s.sobra && s.spec; });
  if (novas.length < 2) return null;
  const alvo = novas.slice().sort(function (a, b) { return uso(a) - uso(b); })[0];
  if (uso(alvo) > USO_MAX_ABSORVER) return null;
  const outras = novas.filter(function (s) { return s !== alvo; });
  let livre = 0; outras.forEach(function (s) { livre += livreMm2(s); });
  if (alvo.area > livre * 0.9) return null;                       // nem pela área caberia: nem tenta
  const pecas = alvo.spec.items.map(function (it) { return it.p; }).sort(function (a, b) { return b.c * b.l - a.c * a.l; });
  const msPeca = Math.max(150, prazoMs / (pecas.length * 2));
  const destino = outras.slice();
  for (let k = 0; k < pecas.length; k++) {
    const p = pecas[k];
    const cand = destino.map(function (s, i) { return i; })
      .filter(function (i) { return livreMm2(destino[i]) > p.c * p.l * 1.02; })
      .sort(function (a, b) { return livreMm2(destino[b]) - livreMm2(destino[a]); }).slice(0, 3);
    let achou = false;
    for (let c = 0; c < cand.length && !achou; c++) {
      if (agora() > fim) return null;
      const novo = await caber(destino[cand[c]], p, msPeca, rnd, pausa);
      if (novo) { destino[cand[c]] = novo; achou = true; }
    }
    if (!achou) return null;                                      // uma peça sem lugar: desiste, plano intacto
  }
  const troca = new Map(outras.map(function (s, i) { return [s, destino[i]]; }));
  return sheets.filter(function (s) { return s !== alvo; }).map(function (s) { return troca.get(s) || s; });
}
