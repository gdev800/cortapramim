// Chapas repetidas: quando dá, o mesmo desenho de corte vale para várias chapas (como a Leo faz: "4 × 2750 x 1850").
// Na serra o operador repete a mesma sequência, o que é mais rápido e erra menos.
// Analogia: linha de produção (um molde, várias peças iguais) em vez de várias peças artesanais.
// Só aceita se o plano não gastar mais chapas do que gastava.
import { montarChapa, otimizarChapa } from './sheet.js';
import { encherSobra } from './scrap.js';
import { mulberry32 } from './rng.js';

// Medida da peça como chave. Se a peça pode girar, 500x145 e 145x500 são a mesma peça.
let girar = false;
const chave = (p) => {
  const a = Math.round(p.c * 10), b = Math.round(p.l * 10);
  return (girar || p.livre) && a < b ? b + 'x' + a + 'g' : a + 'x' + b + ((girar || p.livre) ? 'g' : '');
};

/** Quantas vezes o desenho da chapa `s` cabe nas peças do `pool` (Map chave -> lista de peças). */
function vezes(s, pool) {
  const cnt = new Map();
  s.spec.items.forEach((it) => { const k = chave(it.p); cnt.set(k, (cnt.get(k) || 0) + 1); });
  let r = Infinity;
  cnt.forEach((n, k) => { r = Math.min(r, Math.floor(((pool.get(k) || []).length) / n)); });
  return r === Infinity ? 0 : r;
}

/** Copia o desenho da chapa `s` usando peças do pool (mesma medida, outra identificação). */
function copiar(s, pool) {
  const items = s.spec.items.map((it) => {
    const p = pool.get(chave(it.p)).shift();
    const deitada = Math.abs(p.c - it.p.c) > 1e-6; // veio com a medida trocada: gira para ocupar o mesmo lugar
    return { p, flip: deitada ? !it.flip : !!it.flip };
  });
  const nova = montarChapa({ expr: s.spec.expr.slice(), items }, s.cfg);
  ['mat', 'esp', 'cfg'].forEach((k) => { nova[k] = s[k]; });
  nova.sobra = null; nova.repetido = true;
  return nova;
}

/**
 * @param {object[]} sheets chapas de um material, já otimizadas
 * @param {(pecas:object[], ms:number) => Promise<object[]>} planejarResto otimiza as peças que sobraram (chapas novas)
 * @param {number} prazoMs tempo total para tentar
 * @param {boolean} podeGirar chapa sem veio: a mesma peça deitada ou em pé conta como igual
 * @returns {Promise<object[]|null>} lista nova (sobras do estoque primeiro, depois os desenhos repetidos, depois o resto) ou null
 */
export async function repetirDesenhos(sheets, planejarResto, prazoMs, agora, podeGirar) {
  girar = !!podeGirar;
  const fixas = sheets.filter((s) => s.sobra), novas = sheets.filter((s) => !s.sobra);
  if (novas.length < 3 || novas.some((s) => !s.spec)) return null;
  const fim = agora() + prazoMs, limite = novas.length;
  let resto = novas, repetidas = [], mudou = false;
  const rnd = mulberry32(12345);
  for (let volta = 0; volta < 6 && resto.length >= 2 && agora() < fim; volta++) {
    const pool = () => {
      const m = new Map();
      resto.forEach((s) => s.spec.items.forEach((it) => { const k = chave(it.p); if (!m.has(k)) m.set(k, []); m.get(k).push(it.p); }));
      return m;
    };
    const base = pool(), cfg = resto[0].cfg, A = cfg.SW * cfg.SH;
    const cands = [];
    // 1) chapas do plano atual cujo desenho já se repete nas peças
    resto.forEach((s) => { const v = vezes(s, base); if (v >= 2) cands.push({ s, r: v, util: s.area / A }); });
    // 2) desenhos novos feitos para repetir k vezes: enche uma chapa só com 1/k de cada medida
    for (let k = 2; k <= Math.min(6, resto.length); k++) {
      const parte = [];
      base.forEach((l) => { for (let i = 0; i < Math.floor(l.length / k); i++) parte.push(l[i]); });
      if (!parte.length) continue;
      const pick = encherSobra(parte, cfg, rnd);
      if (!pick || pick.chosen.length < 2) continue;
      const s = await otimizarChapa(pick.spec, cfg, 250, rnd, async () => {});
      if (!s.ok) continue;
      s.cfg = cfg; s.mat = resto[0].mat; s.esp = resto[0].esp; s.sobra = null;
      cands.push({ s, r: vezes(s, base), util: s.area / A });
    }
    // desenho fraco (abaixo de 80%) não vale repetir
    // nota: aproveitamento + 2 pontos por repetição (4 chapas iguais a 89% valem mais que 2 a 90%)
    const nota = (c) => c.util + 0.02 * c.r;
    const boas = cands.filter((c) => c.r >= 2 && c.util >= 0.8).sort((a, b) => nota(b) - nota(a));
    let aceitou = false;
    for (let t = 0; t < Math.min(3, boas.length) && !aceitou && agora() < fim; t++) {
      const { s: alvo, r } = boas[t], p = pool(), copias = [];
      for (let i = 0; i < r; i++) copias.push(copiar(alvo, p));
      if (copias.some((c) => !c.ok)) continue;
      const sobra = []; p.forEach((l) => sobra.push(...l));
      const novoResto = sobra.length ? await planejarResto(sobra, Math.max(600, (fim - agora()) * 0.6)) : [];
      if (!novoResto || repetidas.length + copias.length + novoResto.length > limite) continue; // gastaria mais chapa
      repetidas = repetidas.concat(copias); resto = novoResto; mudou = true; aceitou = true;
    }
    if (!aceitou) break;
  }
  if (!mudou) return null;
  return fixas.concat(repetidas, resto);
}

/** Assinatura do desenho de uma chapa: duas chapas com a mesma assinatura se cortam do mesmo jeito. */
export function assinaturaDesenho(s) {
  if (!s.spec) return null;
  const c = s.cfg || {};
  return [c.SW, c.SH, c.K, s.sobra ? 'sobra' + (s.sobra.id || '') : 'nova', s.spec.expr.join(','),
    s.spec.items.map((it) => Math.round(it.p.c * 10) + 'x' + Math.round(it.p.l * 10) + (it.flip ? 'r' : '')).join(',')].join('|');
}
