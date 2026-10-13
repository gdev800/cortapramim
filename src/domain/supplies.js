// Estoque de fita de borda e ferragens, e o que falta comprar para um plano.
import { fitaMetros } from '../core/index.js';
import { norm, pIn } from './units.js';
import { newSid } from './scraps.js';

export const PERDA_FITA = 1.1; // 10% de perda
export const MAX_INSUMO = 1000000;

const valida = (q) => q > 0 && isFinite(q) && q <= MAX_INSUMO;

/** Cadastra (ou soma a um item existente). @returns {{erro?:string, somou?:boolean}} */
export function adicionarInsumo(state, { tipo, nome, q }) {
  const n = String(nome).trim(), qtd = pIn(q);
  if (!n || !valida(qtd)) return { erro: 'Informe o nome e uma quantidade maior que zero.' };
  const ex = state.insumos.find((x) => x.tipo === tipo && norm(x.nome) === norm(n));
  if (ex) ex.q = Math.round((ex.q + qtd) * 100) / 100;
  else state.insumos.push({ id: newSid(), tipo, nome: n, q: qtd });
  return { somou: !!ex };
}

export function definirQuantidade(state, id, valor) {
  const s = state.insumos.find((x) => x.id === id); if (!s) return;
  const v = pIn(valor);
  s.q = v >= 0 && isFinite(v) && v <= MAX_INSUMO ? v : 0;
}

export function removerInsumo(state, id) { state.insumos = state.insumos.filter((x) => x.id !== id); }

/** Itens que o plano consome, comparados ao estoque (pelo nome igual). */
export function necessidades(state, res) {
  const fm = new Map();
  res.groups.forEach((g) => {
    const m = fitaMetros(g); if (m <= 0) return;
    const nome = (g.fitaNome || '').trim() || 'Fita de borda';
    fm.set(nome, (fm.get(nome) || 0) + m * PERDA_FITA);
  });
  const fita = Array.from(fm.entries()).map(([nome, precisa]) => {
    const st = state.insumos.find((x) => x.tipo === 'fita' && norm(x.nome) === norm(nome));
    return { nome, precisa, tenho: st ? st.q : 0, achou: !!st, id: st ? st.id : null, un: 'm' };
  });
  const ferr = [];
  state.ferr.forEach((f) => {
    const q = parseInt(f.q, 10); if (!f.n.trim() || !(q > 0)) return;
    const st = state.insumos.find((x) => x.tipo === 'ferr' && norm(x.nome) === norm(f.n));
    ferr.push({ nome: f.n.trim(), precisa: q, tenho: st ? st.q : 0, achou: !!st, id: st ? st.id : null, un: 'un' });
  });
  return fita.concat(ferr);
}

/** Desconta do estoque o que o plano gastou. @returns quantos itens mudaram. */
export function baixarInsumos(state) {
  let n = 0;
  necessidades(state, state.res).forEach((x) => {
    if (!x.id) return;
    const s = state.insumos.find((y) => y.id === x.id);
    if (s) { s.q = Math.max(0, Math.round((s.q - x.precisa) * 100) / 100); n++; }
  });
  return n;
}

/** Aceita só insumos bem formados vindos de um backup. */
export function insumoValido(s) {
  return !!(s && s.id && s.nome && (s.tipo === 'fita' || s.tipo === 'ferr') && isFinite(Number(s.q)) && Number(s.q) >= 0);
}
