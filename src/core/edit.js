// Edição manual do plano: girar, trocar e mover peças. Toda mudança remonta a chapa e a confere inteira
// (limites, sobreposição e fases); se não passar, a edição é recusada e nada muda.
import { EPS, V, H } from './constants.js';
import { makeCtx, costOf } from './anneal.js';
import { montarChapa } from './sheet.js';

const SEM_ARVORE = 'Este plano foi calculado numa versão antiga e não pode ser editado. Calcule de novo.';

export function podeGirar(cfg, p) { return !!(cfg.rot || p.livre) && Math.abs(p.c - p.l) > EPS; }

function arvore(expr) {
  const st = [];
  expr.forEach(function (t) {
    if (t >= 0) st.push({ i: t });
    else { const r = st.pop(), l = st.pop(); st.push({ t: t, l: l, r: r }); }
  });
  return st[0];
}
function nos(n, out) { out.push(n); if (n.i === undefined) { nos(n.l, out); nos(n.r, out); } return out; }
// Escreve a árvore em notação polonesa; depois do nó `alvo` acrescenta `extra` (nova peça + operador).
function paraExpr(n, out, alvo, extra) {
  if (n.i !== undefined) out.push(n.i); else { paraExpr(n.l, out, alvo, extra); paraExpr(n.r, out, alvo, extra); out.push(n.t); }
  if (n === alvo) { out.push(extra[0]); out.push(extra[1]); }
}
function semFolha(n, idx) {
  if (n.i !== undefined) return n.i === idx ? null : n;
  const l = semFolha(n.l, idx), r = semFolha(n.r, idx);
  if (!l) return r;
  if (!r) return l;
  n.l = l; n.r = r; return n;
}
function reindexa(n, idx) { if (n.i !== undefined) { if (n.i > idx) n.i--; } else { reindexa(n.l, idx); reindexa(n.r, idx); } }

const copia = function (sheet) { return { expr: sheet.spec.expr.slice(), items: sheet.spec.items.map(function (it) { return { p: { ...it.p }, flip: !!it.flip }; }) }; };
function refazer(sheet, spec) {
  const novo = montarChapa(spec, sheet.cfg);
  ['n', 'mat', 'esp', 'cfg', 'sobra'].forEach(function (k) { novo[k] = sheet[k]; });
  novo.manual = true;
  return novo;
}
// Tenta as combinações de giro dos itens `ks` e devolve a primeira chapa válida.
function ajustar(sheet, spec, ks) {
  for (let mask = 0; mask < (1 << ks.length); mask++) {
    let valido = true;
    ks.forEach(function (k, j) {
      const gira = !!(mask & (1 << j));
      if (gira && !podeGirar(sheet.cfg, spec.items[k].p)) valido = false;
      spec.items[k].flip = gira;
    });
    if (!valido) continue;
    const novo = refazer(sheet, spec);
    if (novo.ok) return novo;
  }
  return null;
}

/** @returns {{sheet}|{erro:string}} */
export function girarPeca(sheet, id) {
  if (!sheet.spec) return { erro: SEM_ARVORE };
  const spec = copia(sheet), k = spec.items.findIndex(function (it) { return it.p.id === id; });
  if (k < 0) return { erro: 'Peça não encontrada nessa chapa.' };
  const p = spec.items[k].p;
  if (!podeGirar(sheet.cfg, p)) return { erro: Math.abs(p.c - p.l) <= EPS ? 'A peça é quadrada, girar não muda nada.' : 'Esta peça segue o veio e não pode girar. Marque "pode girar" na linha da peça e calcule de novo.' };
  spec.items[k].flip = !spec.items[k].flip;
  const novo = refazer(sheet, spec);
  return novo.ok ? { sheet: novo } : { erro: 'Girada, a peça não cabe nessa posição da chapa.' };
}

/** Troca duas peças de lugar (na mesma chapa ou entre chapas). @returns {{a, b}|{erro}} chapas novas (iguais se for a mesma chapa) */
export function trocarPecas(sA, idA, sB, idB) {
  if (!sA.spec || !sB.spec) return { erro: SEM_ARVORE };
  if (idA === idB) return { erro: 'Escolha duas peças diferentes.' };
  const mesma = sA.n === sB.n, specA = copia(sA), specB = mesma ? specA : copia(sB);
  const ka = specA.items.findIndex(function (it) { return it.p.id === idA; }), kb = specB.items.findIndex(function (it) { return it.p.id === idB; });
  if (ka < 0 || kb < 0) return { erro: 'Peça não encontrada.' };
  const pa = specA.items[ka].p, pb = specB.items[kb].p;
  specA.items[ka] = { p: pb, flip: false };
  specB.items[kb] = { p: pa, flip: false };
  if (mesma) {
    const novo = ajustar(sA, specA, [ka, kb]);
    return novo ? { a: novo, b: novo } : { erro: 'Trocadas, as peças não cabem nessas posições.' };
  }
  const na = ajustar(sA, specA, [ka]);
  if (!na) return { erro: 'A peça #' + idB + ' não cabe no lugar da #' + idA + ' (chapa ' + sA.n + ').' };
  const nb = ajustar(sB, specB, [kb]);
  if (!nb) return { erro: 'A peça #' + idA + ' não cabe no lugar da #' + idB + ' (chapa ' + sB.n + ').' };
  return { a: na, b: nb };
}

/** Tira a peça de uma chapa e acha o melhor lugar para ela em outra. @returns {{from:object|null, to}|{erro}} from = null se a chapa de origem ficou vazia */
export function moverPeca(sFrom, id, sTo) {
  if (!sFrom.spec || !sTo.spec) return { erro: SEM_ARVORE };
  if (sFrom.n === sTo.n) return { erro: 'A peça já está nessa chapa.' };
  const k = sFrom.spec.items.findIndex(function (it) { return it.p.id === id; });
  if (k < 0) return { erro: 'Peça não encontrada nessa chapa.' };
  const peca = { ...sFrom.spec.items[k].p };

  let novoFrom = null;
  if (sFrom.spec.items.length > 1) {
    const t = arvore(sFrom.spec.expr), raiz = semFolha(t, k);
    reindexa(raiz, k);
    const expr = []; paraExpr(raiz, expr, null, []);
    const items = sFrom.spec.items.filter(function (_, j) { return j !== k; }).map(function (it) { return { p: { ...it.p }, flip: !!it.flip }; });
    novoFrom = refazer(sFrom, { expr: expr, items: items });
    if (!novoFrom.ok) return { erro: 'Sem a peça, a chapa ' + sFrom.n + ' deixa de passar na verificação.' };
  }

  const base = copia(sTo), arv = arvore(base.expr), todos = nos(arv, []), novoIdx = base.items.length;
  let melhor = null;
  [false, true].forEach(function (gira) {
    if (gira && !podeGirar(sTo.cfg, peca)) return;
    const items = base.items.concat([{ p: peca, flip: gira }]);
    const ctx = makeCtx(items, sTo.cfg);
    todos.forEach(function (alvo) {
      [V, H].forEach(function (op) {
        const expr = []; paraExpr(arv, expr, alvo, [novoIdx, op]);
        const custo = costOf(expr, ctx.fl, ctx);
        if (ctx.lastOk && (!melhor || custo < melhor.custo)) melhor = { custo: custo, expr: expr, items: items };
      });
    });
  });
  if (!melhor) return { erro: 'A peça #' + id + ' não cabe na chapa ' + sTo.n + '.' };
  const novoTo = refazer(sTo, { expr: melhor.expr, items: melhor.items });
  if (!novoTo.ok) return { erro: 'A peça #' + id + ' não passou na verificação da chapa ' + sTo.n + '.' };
  return { from: novoFrom, to: novoTo };
}
