// Histórico de movimentações do estoque: o "extrato" (o estoque é o saldo).
// Funções puras sobre o state. Cada movimento: { id, data, tipo: 'saida'|'entrada'|'ajuste', ... }.
// Só o último movimento guarda como o estoque estava antes dele (para desfazer), assim o histórico fica leve.
import { fitaMetros } from '../core/index.js';
import { necessidades, baixarInsumos } from './supplies.js';
import { pendEstoque, economiaSobras, aplicarPlanoNoEstoque } from './scraps.js';
import { relatorioPlano } from './report.js';
import { custos } from './costs.js';
import { toStr } from './units.js';

export const MAX_HISTORICO = 5000;
let seq = 0;
const novoId = () => 'm' + Date.now().toString(36) + (++seq).toString(36);
const r2 = (v) => Math.round(v * 100) / 100;

/** Foto do estoque antes de mexer (sobras e insumos), para o desfazer. */
export function fotografar(state) {
  return { estoque: JSON.parse(JSON.stringify(state.estoque || [])), insumos: JSON.parse(JSON.stringify(state.insumos || [])) };
}

function lancar(state, mov, antes) {
  state.historico = state.historico || [];
  state.historico.forEach((m) => { delete m.desfazer; });
  mov.id = novoId(); mov.data = mov.data || new Date().toISOString();
  if (antes) mov.desfazer = antes;
  state.historico.push(mov);
  if (state.historico.length > MAX_HISTORICO) state.historico.splice(0, state.historico.length - MAX_HISTORICO);
  return mov;
}

/**
 * Resumo do que um plano consome. Chamar ANTES de aplicar o plano no estoque (precisa saber o que vai sair).
 * @returns {object} dados do movimento de saída (sem id/data)
 */
export function resumoSaida(state, res) {
  const pe = pendEstoque(state);
  const rel = relatorioPlano(res);
  let pecas = 0, fitaM = 0; const chapas = [];
  res.groups.forEach((g) => {
    g.sheets.forEach((s) => { pecas += s.pecas.length; });
    fitaM += fitaMetros(g);
    if (g.nNovas) chapas.push({ nome: g.mat, esp: g.esp, q: g.nNovas });
  });
  const ferragens = necessidades(state, res).filter((x) => x.un === 'un').map((x) => ({ nome: x.nome, q: x.precisa }));
  return {
    tipo: 'saida', projeto: (state.proj && state.proj.nome) || '', pecas, chapas,
    sobrasUsadas: pe.usados.length, sobrasNovas: pe.novos.length, fitaM: r2(fitaM), ferragens,
    areaPecas: r2(rel.tot.pecas), areaChapas: r2(rel.tot.bruta), areaPerda: r2(rel.tot.perda + rel.tot.refilo),
    custo: r2(custos(res, state.ferr || [], state.orc || {}).custo), economia: r2(economiaSobras(res).valor),
  };
}

/** Lança a saída de um plano. `antes` = fotografar(state) tirada antes de aplicar o plano no estoque. */
export function registrarSaida(state, resumo, antes) { return lancar(state, { ...resumo }, antes); }

/**
 * "Atualizar estoque" do plano aprovado: aplica sobras, baixa chapas/fita/ferragens e lança a saída.
 * @returns {{mov:object, nInsumos:number}}
 */
export function saidaDoPlano(state) {
  const resumo = resumoSaida(state, state.res), antes = fotografar(state), marcar = [];
  state.res.groups.forEach((g) => g.sheets.forEach((s) => s.restos.forEach((r) => { if (r.util && !r.guardado) marcar.push(r); })));
  aplicarPlanoNoEstoque(state);
  const nInsumos = baixarInsumos(state);
  const mov = registrarSaida(state, resumo, antes);
  marcar.forEach((r) => { r.guardadoPor = mov.id; });
  return { mov, nInsumos };
}

/** Entrada: algo chegou no estoque (sobra cadastrada, retalho guardado, chapa/fita/ferragem comprada). */
export function registrarEntrada(state, { tipoItem, nome, q, un, obs }, antes) {
  return lancar(state, { tipo: 'entrada', item: { tipo: tipoItem, nome: String(nome || '') }, q: r2(Number(q) || 0), un: un || 'un', obs: obs || '' }, antes);
}

/** Ajuste: quantidade corrigida à mão ou item removido (para = 0). */
export function registrarAjuste(state, { tipoItem, nome, de, para, un, obs }, antes) {
  return lancar(state, { tipo: 'ajuste', item: { tipo: tipoItem, nome: String(nome || '') }, de: r2(Number(de) || 0), para: r2(Number(para) || 0), un: un || 'un', obs: obs || '' }, antes);
}

/** Desfaz só o último movimento: volta sobras e insumos como estavam e tira o lançamento. */
export function desfazerUltimo(state) {
  const h = state.historico || [], m = h[h.length - 1];
  if (!m || !m.desfazer) return { ok: false, msg: 'Não há movimento para desfazer.' };
  state.estoque = m.desfazer.estoque; state.insumos = m.desfazer.insumos;
  h.pop();
  if (m.tipo === 'saida' && state.res && state.estAtual) {
    // o plano aberto volta a poder atualizar o estoque
    state.estAtual = false;
    state.res.groups.forEach((g) => g.sheets.forEach((s) => s.restos.forEach((r) => { if (r.util && r.guardadoPor === m.id) { delete r.guardado; delete r.guardadoPor; } })));
  }
  return { ok: true, msg: 'Último movimento desfeito.', tipo: m.tipo };
}

const dataBr = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR'); };
const pl = (n, um, ois) => toStr(n) + ' ' + (n === 1 ? um : ois);
const NOME_TIPO = { sobra: 'sobra', chapa: 'chapa', fita: 'fita', ferr: 'ferragem' };

/** Texto curto de uma linha para a tela. */
export function textoMovimento(m) {
  if (m.tipo === 'saida') {
    const nCh = (m.chapas || []).reduce((a, c) => a + c.q, 0), partes = [pl(m.pecas, 'peça', 'peças'), pl(nCh, 'chapa', 'chapas')];
    if (m.fitaM > 0) partes.push(toStr(m.fitaM) + ' m de fita');
    if (m.sobrasUsadas) partes.push(pl(m.sobrasUsadas, 'sobra usada', 'sobras usadas'));
    if (m.sobrasNovas) partes.push(pl(m.sobrasNovas, 'sobra nova', 'sobras novas'));
    return { data: dataBr(m.data), titulo: 'Saída' + (m.projeto ? ' · ' + m.projeto : ''), detalhe: partes.join(' · ') };
  }
  const item = (NOME_TIPO[m.item && m.item.tipo] || 'item') + (m.item && m.item.nome ? ' ' + m.item.nome : '');
  if (m.tipo === 'entrada') return { data: dataBr(m.data), titulo: 'Entrada · ' + item, detalhe: '+' + toStr(m.q) + ' ' + m.un + (m.obs ? ' · ' + m.obs : '') };
  return { data: dataBr(m.data), titulo: 'Ajuste · ' + item, detalhe: toStr(m.de) + ' → ' + toStr(m.para) + ' ' + m.un + (m.obs ? ' · ' + m.obs : '') };
}

/** Aceita só movimentos bem formados vindos de um backup. */
export function movimentoValido(m) {
  return !!(m && typeof m.id === 'string' && ['saida', 'entrada', 'ajuste'].includes(m.tipo) && !isNaN(new Date(m.data)));
}

export function historicoParaImportar(d, atuais) {
  const ids = new Set((atuais || []).map((m) => m.id)), out = [];
  (d.historico || []).forEach((m) => { if (movimentoValido(m) && !ids.has(m.id)) { const c = { ...m }; delete c.desfazer; out.push(c); ids.add(m.id); } });
  return out;
}
