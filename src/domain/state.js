// O estado único do app e as fábricas de linhas e chapas.
//
// @typedef {Object} Row     Uma linha de peças ("2 = 220 x 55 = Lateral"). Todos os campos de texto vêm da tela.
// @typedef {Object} Block   Uma chapa (material) com suas peças: nome, espessura, tamanho, veio, preços e linhas.
// @typedef {Object} State   Veja createState() abaixo.
import { fmtFor, SIZES, pIn, fac } from './units.js';

export const DEFAULT_AJ = { K: '3.2', minRet: '200', tempo: '15', num: true, refilo: '0', fitaEsp: '0', fases: '0', repetir: true };
export const DEFAULT_ORC = { mao: '', margem: '' };
export const DEFAULT_PROP = { marcenaria: '', cliente: '', contato: '', servico: '', itens: '', validade: '15', pagamento: '', prazo: '', valor: '', mostrarMat: true };

export function createState() {
  return {
    unit: 'cm',                       // unidade mostrada na tela
    blocks: [],                       // chapas e peças digitadas
    ferr: [],                         // ferragens do projeto
    orc: { ...DEFAULT_ORC },          // mão de obra e margem
    proj: { id: null, nome: '' },     // projeto aberto
    status: 'orcado',                 // andamento do projeto
    insumos: [],                      // estoque de fita e ferragens
    prop: { ...DEFAULT_PROP },        // dados da proposta ao cliente
    historico: [],                    // movimentações do estoque (entradas, saídas, ajustes)
    estoque: [],                      // sobras guardadas
    projetos: [],                     // projetos salvos
    aj: { ...DEFAULT_AJ },            // ajustes (serra, refilo, tempo...)
    uid: 0,                           // contador de ids de linhas e chapas
    res: null,                        // plano calculado
    hist: [],                         // versões anteriores do plano (para desfazer a edição manual)
    cfgUsed: null,
    approved: false,                  // plano aprovado (libera exportar)
    estAtual: false,                  // estoque de sobras já atualizado com este plano
    running: false, cancel: false,    // cálculo em andamento
    dl: null,                         // capacidade de download da plataforma (quando existe)
    fileFor: null,                    // chapa que está recebendo um arquivo aberto
    model: null,                      // modelo de móvel aberto
    statusFiltro: 'todos',
  };
}

export function newRow(state, r) {
  r = r || {};
  return {
    uid: ++state.uid, q: r.q == null ? '' : String(r.q), c: r.c == null ? '' : String(r.c), l: r.l == null ? '' : String(r.l),
    n: r.n || '', fc: String(r.fc || 0), fl: String(r.fl || 0), livre: !!r.livre, open: !!r.open,
  };
}

export function newBlock(state, o) {
  o = o || {};
  const { fromMm } = fmtFor(state.unit);
  return {
    uid: ++state.uid, nome: o.nome || '', esp: o.esp || '15', sw: o.sw || fromMm(2750), sh: o.sh || fromMm(1850),
    veio: o.veio === true, estoque: o.estoque || '', preco: o.preco || '', fita: o.fita || '', fitaNome: o.fitaNome || '',
    usarSobras: o.usarSobras !== false, origem: o.origem || '', mode: o.mode === 'paste' ? 'paste' : 'form', paste: o.paste || '',
    rows: (o.rows && o.rows.length ? o.rows : [{}]).map((r) => newRow(state, r)),
  };
}

/** Chave do tamanho da chapa ("2750x1850") ou "custom" se não for um dos tamanhos conhecidos. */
export function tamKey(state, b) {
  const F = fac(state.unit);
  const k = Math.round(pIn(b.sw) * F) + 'x' + Math.round(pIn(b.sh) * F);
  return SIZES.some((s) => s[0] === k) ? k : 'custom';
}

export const linhasVazias = (b) => b.mode === 'form' && !b.paste && b.rows.every((r) => !r.c.trim() && !r.l.trim() && !r.n.trim());
