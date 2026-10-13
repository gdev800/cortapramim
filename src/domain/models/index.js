// Modelos de móveis. Para criar um novo: copie um arquivo desta pasta, mude os campos e a função gerar(), e inclua aqui na lista.
// Cada modelo: { id, nome, desc, campos: [...], gerar(valores, espessura) -> peças }.
// Campos: t = 'dim' (medida em mm), 'int' (número inteiro) ou 'bool'. opt = vazio permitido.
import { pIn, fmtFor } from '../units.js';
import { newBlock, newRow, linhasVazias } from '../state.js';
import { norm } from '../units.js';
import guarda from './guarda-roupa.js';
import balcao from './balcao.js';
import aereo from './aereo.js';
import estante from './estante.js';
import gaveteiro from './gaveteiro.js';

export const MODELOS = [guarda, balcao, aereo, estante, gaveteiro];

export const modeloPorId = (id) => MODELOS.find((m) => m.id === id) || null;

/** Estado inicial de um modelo aberto, herdando materiais do anterior (se havia). */
export function abrirModelo(m, anterior) {
  const v = {}; m.campos.forEach((c) => { v[c.k] = c.d; });
  return {
    id: m.id, v,
    esp: anterior ? anterior.esp : '15', corpo: anterior ? anterior.corpo : 'Branco TX Eucatex',
    fundoNome: anterior ? anterior.fundoNome : 'Fundo branco', pref: anterior ? anterior.pref : '', veio: anterior ? anterior.veio : true,
  };
}

/** Gera a lista de peças (já somando iguais). @returns {{erro:string}|{pecas:object[]}} */
export function gerarModelo(model) {
  const m = modeloPorId(model.id); const v = model.v, t = pIn(model.esp);
  if (!(t > 0)) return { erro: 'Informe a espessura do MDF do corpo.' };
  for (const c of m.campos) { if (c.t === 'dim' && !c.opt && !(v[c.k] >= 0)) return { erro: 'Confira as medidas.' }; }
  if (!(v.L > 3 * t) || !(v.A > 3 * t) || !(v.P > 0)) return { erro: 'As medidas ficaram pequenas demais para essa espessura.' };
  const map = new Map();
  m.gerar(v, t).forEach((p) => {
    if (!(p.q > 0) || !(p.c > 0) || !(p.l > 0)) return;
    const key = [p.mat, p.n, p.c, p.l, p.fc || 0, p.fl || 0].join('|');
    if (map.has(key)) map.get(key).q += p.q; else map.set(key, { ...p });
  });
  const pecas = Array.from(map.values());
  if (!pecas.length) return { erro: 'Nenhuma peça gerada. Confira as medidas.' };
  return { pecas };
}

function adicionarEmBloco(state, nome, esp, veio, pecas, pref) {
  if (!pecas.length) return;
  const { fromMm, fac } = fmtFor(state.unit);
  const linhas = pecas.map((p) => ({ q: p.q, c: fromMm(p.c), l: fromMm(p.l), n: (pref ? pref + ' · ' : '') + p.n, fc: p.fc || 0, fl: p.fl || 0, open: !!(p.fc || p.fl) }));
  let b = state.blocks.find((x) => norm(x.nome) === norm(nome) && Math.abs((pIn(x.esp) || 0) - esp) < 0.01 && x.mode === 'form');
  if (!b) b = state.blocks.find((x) => !x.nome.trim() && linhasVazias(x));
  if (!b) { b = newBlock(state, { nome, esp: String(esp), veio }); state.blocks.push(b); b.rows = []; }
  if (linhasVazias(b)) { b.rows = []; b.nome = nome; b.esp = String(esp); b.veio = veio; }
  linhas.forEach((l) => b.rows.push(newRow(state, l)));
}

/** Coloca o modelo na lista de chapas. @returns {{erro?:string, tipos?:number, nome?:string}} */
export function adicionarModelo(state) {
  const model = state.model, r = gerarModelo(model);
  if (r.erro) return r;
  const t = pIn(model.esp), pref = model.pref.trim();
  const corpo = r.pecas.filter((p) => p.mat === 'corpo'), fundo = r.pecas.filter((p) => p.mat === 'fundo');
  adicionarEmBloco(state, model.corpo.trim() || 'Branco TX Eucatex', t, !!model.veio, corpo, pref);
  adicionarEmBloco(state, model.fundoNome.trim() || 'Fundo branco', 6, false, fundo, pref);
  state.res = null;
  return { tipos: corpo.length + fundo.length, nome: modeloPorId(model.id).nome };
}
