// Estoque de chapas inteiras, fita de borda e ferragens, e o que falta comprar para um plano.
import { fitaMetros } from '../core/index.js';
import { norm, pIn, fac } from './units.js';
import { newSid } from './scraps.js';

export const PERDA_FITA = 1.1; // 10% de perda
export const MAX_INSUMO = 1000000;

const valida = (q) => q > 0 && isFinite(q) && q <= MAX_INSUMO;

const r2 = (v) => Math.round(v * 100) / 100;
/** Medidas da chapa sempre com o lado maior em c (2750 x 1850 e 1850 x 2750 são a mesma chapa). */
const deitada = (c, l) => (c >= l ? { c, l } : { c: l, l: c });
const mesmoTamanho = (a, b) => Math.abs(a.c - b.c) < 0.5 && Math.abs(a.l - b.l) < 0.5;

/** A chapa inteira do estoque que serve para esse material (nome, espessura e tamanho em mm). */
export function chapaDoEstoque(state, { nome, esp, SW, SH }) {
  const t = deitada(SW, SH);
  return (state.insumos || []).find((x) => x.tipo === 'chapa' && norm(x.nome) === norm(nome)
    && Math.abs((x.esp || 0) - (esp || 0)) < 0.01 && mesmoTamanho(x, t)) || null;
}

/** Quantas chapas inteiras do estoque servem para esse material. */
export function chapasEmEstoque(state, grupo) {
  const s = chapaDoEstoque(state, grupo);
  return s ? Math.floor(s.q) : 0;
}

/** Cadastra (ou soma a um item existente). Chapa: esp em mm, c e l na unidade da tela. @returns {{erro?:string, somou?:boolean}} */
export function adicionarInsumo(state, { tipo, nome, q, esp, c, l }) {
  if (tipo === 'chapa') return adicionarChapa(state, { nome, q, esp, c, l });
  const n = String(nome).trim(), qtd = pIn(q);
  if (!n || !valida(qtd)) return { erro: 'Informe o nome e uma quantidade maior que zero.' };
  const ex = state.insumos.find((x) => x.tipo === tipo && norm(x.nome) === norm(n));
  if (ex) ex.q = Math.round((ex.q + qtd) * 100) / 100;
  else state.insumos.push({ id: newSid(), tipo, nome: n, q: qtd });
  return { somou: !!ex };
}

function adicionarChapa(state, { nome, q, esp, c, l }) {
  const n = String(nome || '').trim(), qtd = pIn(q), e = pIn(esp), F = fac(state.unit);
  const cm = pIn(c) * F, lm = pIn(l) * F;
  if (!n || !(e > 0) || !(cm > 0) || !(lm > 0)) return { erro: 'Informe o material, a espessura e as duas medidas da chapa.' };
  if (!valida(qtd) || !Number.isInteger(qtd)) return { erro: 'A quantidade de chapas precisa ser um número inteiro maior que zero.' };
  const t = deitada(r2(cm), r2(lm));
  const ex = chapaDoEstoque(state, { nome: n, esp: e, SW: t.c, SH: t.l });
  if (ex) ex.q += qtd;
  else state.insumos.push({ id: newSid(), tipo: 'chapa', nome: n, esp: e, c: t.c, l: t.l, q: qtd });
  return { somou: !!ex };
}

export function definirQuantidade(state, id, valor) {
  const s = state.insumos.find((x) => x.id === id); if (!s) return;
  const v = pIn(valor);
  s.q = v >= 0 && isFinite(v) && v <= MAX_INSUMO ? (s.tipo === 'chapa' ? Math.floor(v) : v) : 0;
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

/** Desconta do estoque o que o plano gastou (fita, ferragens e chapas novas). @returns quantos itens mudaram. */
export function baixarInsumos(state) {
  let n = 0;
  state.res.groups.forEach((g) => {
    if (!g.nNovas) return;
    const ref = g.cfg.ref || 0;
    const s = chapaDoEstoque(state, { nome: g.mat, esp: g.esp, SW: g.cfg.SW + 2 * ref, SH: g.cfg.SH + 2 * ref });
    if (s) { s.q = Math.max(0, s.q - g.nNovas); n++; }
  });
  necessidades(state, state.res).forEach((x) => {
    if (!x.id) return;
    const s = state.insumos.find((y) => y.id === x.id);
    if (s) { s.q = Math.max(0, Math.round((s.q - x.precisa) * 100) / 100); n++; }
  });
  return n;
}

/** Aceita só insumos bem formados vindos de um backup. */
export function insumoValido(s) {
  if (s && s.tipo === 'chapa') return !!(s.id && s.nome && Number(s.esp) > 0 && Number(s.c) > 0 && Number(s.l) > 0 && Number.isInteger(Number(s.q)) && Number(s.q) >= 0);
  return !!(s && s.id && s.nome && (s.tipo === 'fita' || s.tipo === 'ferr') && isFinite(Number(s.q)) && Number(s.q) >= 0);
}
