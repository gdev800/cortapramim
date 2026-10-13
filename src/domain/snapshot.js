// Salvar e restaurar o trabalho inteiro. Rascunho, projeto salvo e backup usam o mesmo formato.
import { DEFAULT_AJ, DEFAULT_ORC, DEFAULT_PROP, newBlock } from './state.js';

/** Foto do trabalho atual, pronta para virar JSON. */
export function snapshot(state, comPlano) {
  const o = {
    unit: state.unit, aj: state.aj, blocks: state.blocks, ferr: state.ferr, orc: state.orc,
    nome: state.proj.nome, projId: state.proj.id, prop: state.prop, status: state.status,
  };
  if (comPlano && state.res) o.res = state.res;
  return JSON.parse(JSON.stringify(o));
}

/** Coloca uma foto no estado. Não mexe na tela: quem chama avisa a interface. */
export function restore(state, d) {
  state.unit = d.unit === 'mm' ? 'mm' : 'cm';
  state.aj = { ...DEFAULT_AJ, ...(d.aj || {}) };
  state.blocks = (d.blocks || []).map((b) => newBlock(state, b));
  if (!state.blocks.length) state.blocks = [newBlock(state)];
  state.ferr = (d.ferr || []).map((f) => ({ uid: ++state.uid, n: f.n || '', q: f.q || '', p: f.p || '' }));
  state.orc = { ...DEFAULT_ORC, ...(d.orc || {}) };
  state.proj = { id: d.projId || d.id || null, nome: d.nome || '' };
  state.prop = { ...DEFAULT_PROP, ...(d.prop || {}) };
  state.status = d.status || 'orcado';
  state.res = null; state.approved = false; state.estAtual = false; state.hist = [];
  if (d.res && Array.isArray(d.res.groups) && d.res.groups.length) state.res = d.res;
}

/** Exemplo genérico para o botão "Carregar exemplo". */
export const EXEMPLO = {
  unit: 'cm',
  blocks: [
    { nome: 'Branco TX Eucatex', esp: '15', sw: '275', sh: '185', veio: true, rows: [
      { q: 2, c: '220', l: '55', n: 'Lateral', fc: 1 }, { q: 2, c: '88,6', l: '55', n: 'Base e topo' }, { q: 4, c: '88,6', l: '50', n: 'Prateleira', fc: 1 },
      { q: 2, c: '220', l: '45', n: 'Divisória' }, { q: 2, c: '110', l: '40', n: 'Porta', fc: 2, fl: 2 }, { q: 2, c: '88,6', l: '12', n: 'Travessa', livre: true }] },
    { nome: 'Fundo branco', esp: '6', sw: '275', sh: '185', veio: false, rows: [{ q: 2, c: '220', l: '90', n: 'Fundo' }] },
  ],
  ferr: [{ n: 'Dobradiça 35 mm', q: '8', p: '' }],
};
