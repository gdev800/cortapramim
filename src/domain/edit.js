// Edição manual do plano calculado: girar, trocar e mover peças, desfazer e conferir.
// Cada ação passa pela mesma verificação do cálculo; se falhar, nada muda. Mexe só em state.res (e no histórico).
import { girarPeca, trocarPecas, moverPeca, montarChapa } from '../core/index.js';

export const MAX_HIST = 15;

const falha = (msg) => ({ ok: false, msg });

function guarda(state) {
  if (!state.res) return 'Calcule o plano primeiro.';
  if (state.estAtual) return 'O estoque de sobras já foi atualizado com este plano. Volte a editar e calcule de novo.';
  return '';
}
function acha(res, id) {
  for (const g of res.groups) for (const s of g.sheets) if (s.pecas.some((q) => q.id === id)) return { g, s };
  return null;
}
function achaChapa(res, n) {
  for (const g of res.groups) for (const s of g.sheets) if (s.n === n) return { g, s };
  return null;
}
function empilha(state) {
  state.hist = state.hist || [];
  state.hist.push(JSON.stringify(state.res));
  if (state.hist.length > MAX_HIST) state.hist.shift();
}
function concluir(state) {
  let n = 0;
  state.res.groups.forEach((g) => {
    g.sheets.forEach((s) => { s.n = ++n; });
    g.nNovas = g.sheets.filter((s) => !s.sobra).length; g.nSobras = g.sheets.length - g.nNovas;
  });
  state.res.nChapas = n;
  state.approved = false;
}
const troca = (g, velha, nova) => { g.sheets[g.sheets.indexOf(velha)] = nova; };

/** Gira a peça 90°. Só vale se a peça pode girar e ainda cabe. */
export function girar(state, id) {
  const e = guarda(state); if (e) return falha(e);
  const a = acha(state.res, id); if (!a) return falha('Peça não encontrada.');
  const r = girarPeca(a.s, id); if (r.erro) return falha(r.erro);
  empilha(state); troca(a.g, a.s, r.sheet); concluir(state);
  return { ok: true, msg: 'Peça #' + id + ' girada.' };
}

/** Troca duas peças de lugar (mesmo material). */
export function trocar(state, idA, idB) {
  const e = guarda(state); if (e) return falha(e);
  const a = acha(state.res, idA), b = acha(state.res, idB);
  if (!a || !b) return falha('Peça não encontrada.');
  if (a.g !== b.g) return falha('Só dá para trocar peças do mesmo material.');
  const r = trocarPecas(a.s, idA, b.s, idB); if (r.erro) return falha(r.erro);
  empilha(state);
  troca(a.g, a.s, r.a); if (b.s !== a.s) troca(b.g, b.s, r.b);
  concluir(state);
  return { ok: true, msg: 'Peças #' + idA + ' e #' + idB + ' trocadas.' };
}

/** Move a peça para outra chapa do mesmo material (nº da chapa de destino). A chapa que esvaziar some. */
export function mover(state, id, nDestino) {
  const e = guarda(state); if (e) return falha(e);
  const a = acha(state.res, id), d = achaChapa(state.res, nDestino);
  if (!a) return falha('Peça não encontrada.');
  if (!d) return falha('Chapa de destino não encontrada.');
  if (a.g !== d.g) return falha('Só dá para mover para uma chapa do mesmo material.');
  const r = moverPeca(a.s, id, d.s); if (r.erro) return falha(r.erro);
  empilha(state);
  troca(d.g, d.s, r.to);
  if (r.from) troca(a.g, a.s, r.from); else a.g.sheets.splice(a.g.sheets.indexOf(a.s), 1);
  concluir(state);
  return { ok: true, msg: 'Peça #' + id + ' movida para a chapa ' + (achaChapa(state.res, nDestino) ? nDestino : '?') + (r.from ? '.' : '. A chapa de origem ficou vazia e foi removida.') };
}

/** Volta uma edição. */
export function desfazer(state) {
  if (!state.hist || !state.hist.length) return falha('Nada para desfazer.');
  state.res = JSON.parse(state.hist.pop());
  state.approved = false;
  return { ok: true, msg: 'Última edição desfeita.' };
}

/** Remonta cada chapa a partir da árvore guardada e confere tudo de novo (limites, sobreposição, fases, peças). */
export function conferir(state) {
  if (!state.res) return falha('Calcule o plano primeiro.');
  const ruins = []; let semArvore = false;
  state.res.groups.forEach((g) => {
    let total = 0;
    g.sheets.forEach((s) => {
      total += s.pecas.length;
      if (!s.spec) { semArvore = true; if (!s.ok) ruins.push(s.n); return; }
      if (!montarChapa(s.spec, s.cfg).ok) ruins.push(s.n);
    });
    if (total !== g.nPecas) ruins.push(g.mat + ': ' + total + ' de ' + g.nPecas + ' peças');
  });
  if (ruins.length) return falha('Problema no plano: ' + ruins.join(', ') + '.');
  return { ok: true, msg: 'Plano conferido: limites, sobreposição e peças OK.' + (semArvore ? ' (Plano antigo: sem edição manual.)' : '') };
}
