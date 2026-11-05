// Fronteira de entrada. Tudo que vem de fora do app passa por aqui antes de entrar no estado:
// arquivo de backup, rascunho e listas guardadas no navegador, dados da conta na nuvem e arquivos de lista de peças.
//
// Analogia: é a conferência da chapa na entrada da oficina. Chapa empenada ou com medida errada não vai para a
// pilha; o que passa tem o tipo certo (texto é texto, número é número finito), tamanho dentro do limite e
// nenhum caractere de controle. Escapar o HTML na hora de mostrar (esc) continua obrigatório: são duas travas.
//
// Funções puras: sem DOM e sem gravação. Nunca lançam erro por dado ruim; descartam ou corrigem o campo.
import { DEFAULT_AJ, DEFAULT_ORC, DEFAULT_PROP } from './state.js';
import { STATUS } from './status.js';
import { insumoValido } from './supplies.js';
import { LIM, MEDIDA_MAX_MM, ESPESSURA_MAX_MM, QTD_MAX, MAX_CHAPAS, MAX_LINHAS, MAX_FERRAGENS, MAX_ITENS_LISTA, MAX_BYTES_LISTA, MAX_BYTES_PLANILHA } from './limites.js';

// Caracteres de controle (menos tab e quebra de linha) e marcas de direção do texto, que servem para disfarçar nomes.
// eslint-disable-next-line no-control-regex -- de propósito: a regex procura caracteres de controle para removê-los
const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;
const QUEBRAS = /[\t\r\n]+/g;
const CHAVES_PROIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);
// ids gerados pelo app: 'p' + base36, 's' + base36 + contador, 'm…'; versões antigas usavam números e Math.random()
const ID_OK = /^[\w.:@-]{1,64}$/;
const CAMPO_NUMERO_OK = /^\s*[+-]?(\d+([.,]\d*)?|[.,]\d+)?\s*$/;

/** Texto de uma linha: sem controle, sem quebra, cortado no limite. */
export function texto(v, max = LIM.nome) {
  if (v == null || typeof v === 'object') return '';
  return String(v).replace(CONTROLE, '').replace(QUEBRAS, ' ').slice(0, max);
}

/** Texto de várias linhas (proposta, lista colada): mantém tab e quebra de linha. */
export function textoLongo(v, max = LIM.textoLongo) {
  if (v == null || typeof v === 'object') return '';
  return String(v).replace(CONTROLE, '').replace(/\r\n?/g, '\n').slice(0, max);
}

/** Texto colado na lista de peças ou lido de CSV/TXT. */
export const limparTextoColado = (v) => textoLongo(v, LIM.colado);

/** Campo digitado que deve conter um número ("88,6"). Mantém o texto se for número; senão, vazio. */
export function campoNumero(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  const t = texto(v, LIM.campoNumero);
  return CAMPO_NUMERO_OK.test(t) ? t : '';
}

/** Número finito dentro de [min, max]; fora disso devolve `def`. */
export function numero(v, { min = -Infinity, max = Infinity, def = null } = {}) {
  const n = typeof v === 'number' ? v : Number(String(v == null ? '' : v).trim().replace(',', '.'));
  return Number.isFinite(n) && n >= min && n <= max && !(typeof v === 'string' && v.trim() === '') ? n : def;
}

export const bool = (v) => v === true;
export const idSeguro = (v) => {
  const t = typeof v === 'number' && Number.isFinite(v) ? String(v) : v;
  return typeof t === 'string' && ID_OK.test(t) ? t : null;
};
const umDe = (v, lista, def) => (lista.includes(v) ? v : def);
const lista = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
const dataValida = (v) => typeof v === 'string' && v.length <= 40 && !isNaN(new Date(v));

/**
 * Limpeza genérica para estruturas sem formato fixo (plano calculado, movimentos do histórico):
 * tira chaves perigosas (__proto__), troca número não finito por 0, limpa textos e corta profundidade e tamanho.
 * @returns {any} cópia limpa, ou null se passar do limite de tamanho
 */
export function limparProfundo(v, { maxNos = 500000, maxProf = 24, maxTexto = LIM.obs, aoTexto = null } = {}) {
  let nos = 0;
  const vai = (x, prof, chave) => {
    if (++nos > maxNos) throw new RangeError('grande demais');
    if (x == null || typeof x === 'boolean') return x;
    if (typeof x === 'number') return Number.isFinite(x) ? x : 0;
    if (typeof x === 'string') return aoTexto ? aoTexto(chave, x) : texto(x, maxTexto);
    if (typeof x !== 'object' || prof > maxProf) return null;
    if (Array.isArray(x)) return x.map((y) => vai(y, prof + 1, chave));
    const o = {};
    for (const k of Object.keys(x)) { if (!CHAVES_PROIBIDAS.has(k) && k.length <= 64) o[k] = vai(x[k], prof + 1, k); }
    return o;
  };
  try { return vai(v, 0, ''); } catch (e) { return null; }
}

// Plano calculado (state.res). Só estes campos são texto livre, e a tela sempre os mostra com esc().
// Todo o resto é número: muitos vão direto para o HTML e o SVG da chapa ("Chapa 3 de 7", coordenadas),
// então um texto no lugar de número (plano adulterado num backup) viraria HTML. Aqui ele vira número ou some.
const TEXTO_PLANO = new Set(['mat', 'nome', 'proj', 'fitaNome', 'obs', 'origem']);
const ROTULO_CURTO = /^[\w .,:×-]{0,40}$/; // ex.: tipo do corte 'V'/'H'; nada de < > " ' &
const NUMERO_TEXTO = /^-?\d+(\.\d+)?$/;

export function sanitizarPlano(res) {
  const o = limparProfundo(res, {
    aoTexto: (k, v) => {
      if (TEXTO_PLANO.has(k)) return texto(v);
      if (k === 'id') return idSeguro(v) || '';
      if (NUMERO_TEXTO.test(v)) return Number(v);
      return ROTULO_CURTO.test(v) ? v : '';
    },
  });
  return o && Array.isArray(o.groups) && o.groups.length ? o : null;
}

// ---------------------------------------------------------------- trabalho (rascunho, projeto, backup)

const FITA = ['0', '1', '2'];

export function sanitizarLinha(r) {
  r = r && typeof r === 'object' ? r : {};
  return {
    q: campoNumero(r.q), c: campoNumero(r.c), l: campoNumero(r.l), n: texto(r.n),
    fc: umDe(String(r.fc == null ? 0 : r.fc), FITA, '0'), fl: umDe(String(r.fl == null ? 0 : r.fl), FITA, '0'),
    livre: bool(r.livre), open: bool(r.open),
  };
}

export function sanitizarBloco(b) {
  b = b && typeof b === 'object' ? b : {};
  const o = {
    nome: texto(b.nome), esp: campoNumero(b.esp), sw: campoNumero(b.sw), sh: campoNumero(b.sh), veio: bool(b.veio),
    estoque: campoNumero(b.estoque), preco: campoNumero(b.preco), fita: campoNumero(b.fita), fitaNome: texto(b.fitaNome),
    usarSobras: b.usarSobras !== false, origem: texto(b.origem), mode: b.mode === 'paste' ? 'paste' : 'form',
    paste: limparTextoColado(b.paste), rows: lista(b.rows, MAX_LINHAS).map(sanitizarLinha),
  };
  // newBlock usa o padrão quando o campo vem vazio; aqui só não deixa passar lixo
  ['esp', 'sw', 'sh'].forEach((k) => { if (!o[k]) delete o[k]; });
  return o;
}

function sanitizarAjustes(aj) {
  const o = {};
  if (!aj || typeof aj !== 'object') return o;
  Object.keys(DEFAULT_AJ).forEach((k) => {
    if (!(k in aj)) return;
    o[k] = typeof DEFAULT_AJ[k] === 'boolean' ? aj[k] !== false && aj[k] !== 'false' : campoNumero(aj[k]);
  });
  return o;
}

function sanitizarCampos(orig, padrao, longos = []) {
  const o = {};
  if (!orig || typeof orig !== 'object') return o;
  Object.keys(padrao).forEach((k) => {
    if (!(k in orig)) return;
    if (typeof padrao[k] === 'boolean') o[k] = bool(orig[k]);
    else o[k] = longos.includes(k) ? textoLongo(orig[k]) : texto(orig[k], LIM.nome);
  });
  return o;
}

const STATUS_IDS = STATUS.map((s) => s[0]);

/** Foto de trabalho (formato de snapshot()) vinda de fora. O resultado vai para restore(). */
export function sanitizarSnapshot(d) {
  d = d && typeof d === 'object' ? d : {};
  const o = {
    unit: d.unit === 'mm' ? 'mm' : 'cm',
    aj: sanitizarAjustes(d.aj),
    blocks: lista(d.blocks, MAX_CHAPAS).map(sanitizarBloco),
    ferr: lista(d.ferr, MAX_FERRAGENS).map((f) => ({ n: texto(f && f.n), q: campoNumero(f && f.q), p: campoNumero(f && f.p) })),
    orc: { ...sanitizarCampos(d.orc, DEFAULT_ORC) },
    nome: texto(d.nome),
    projId: idSeguro(d.projId),
    id: idSeguro(d.id),
    prop: sanitizarCampos(d.prop, DEFAULT_PROP, ['itens', 'pagamento', 'prazo', 'servico']),
    status: umDe(d.status, STATUS_IDS, 'orcado'),
  };
  ['mao', 'margem'].forEach((k) => { if (k in o.orc) o.orc[k] = campoNumero(o.orc[k]); });
  if ('valor' in o.prop) o.prop.valor = campoNumero(o.prop.valor);
  if ('validade' in o.prop) o.prop.validade = campoNumero(o.prop.validade);
  if (d.res && typeof d.res === 'object') { const res = sanitizarPlano(d.res); if (res) o.res = res; }
  return o;
}

/** Projeto salvo: a foto do trabalho mais id, data, status e valor. null se não for aproveitável. */
export function sanitizarProjeto(p) {
  if (!p || typeof p !== 'object') return null;
  const id = idSeguro(p.id);
  if (!id || !Array.isArray(p.blocks)) return null;
  const s = sanitizarSnapshot(p);
  return { ...s, id, nome: texto(p.nome), atualizado: numero(p.atualizado, { min: 0, def: 0 }), valor: numero(p.valor, { min: 0, max: 1e12, def: 0 }) };
}

// ---------------------------------------------------------------- listas guardadas

/** Sobra (retalho) com medidas em mm. null se não for aproveitável. */
export function sanitizarSobra(s) {
  if (!s || typeof s !== 'object') return null;
  const id = idSeguro(s.id), c = numero(s.c, { min: Number.MIN_VALUE, max: MEDIDA_MAX_MM }), l = numero(s.l, { min: Number.MIN_VALUE, max: MEDIDA_MAX_MM });
  if (!id || c == null || l == null) return null;
  const extra = limparProfundo(s) || {};
  return { ...extra, id, nome: texto(s.nome), esp: numero(s.esp, { min: 0, max: ESPESSURA_MAX_MM, def: 0 }), c, l, veio: bool(s.veio), obs: texto(s.obs, LIM.obs) };
}

const TIPOS_INSUMO = ['chapa', 'fita', 'ferr'];

/** Insumo (chapa inteira, fita ou ferragem). null se não for aproveitável. */
export function sanitizarInsumo(s) {
  if (!s || typeof s !== 'object') return null;
  const id = idSeguro(s.id), tipo = umDe(s.tipo, TIPOS_INSUMO, null), nome = texto(s.nome).trim();
  const q = numero(s.q, { min: 0, max: QTD_MAX });
  if (!id || !tipo || !nome || q == null) return null;
  const o = { id, tipo, nome, q };
  const min = numero(s.min, { min: Number.MIN_VALUE, max: QTD_MAX });
  if (min != null) o.min = min;
  if (tipo === 'chapa') {
    o.esp = numero(s.esp, { min: Number.MIN_VALUE, max: ESPESSURA_MAX_MM });
    o.c = numero(s.c, { min: Number.MIN_VALUE, max: MEDIDA_MAX_MM }); o.l = numero(s.l, { min: Number.MIN_VALUE, max: MEDIDA_MAX_MM });
    if (o.esp == null || o.c == null || o.l == null) return null;
  }
  if (s.un != null) o.un = texto(s.un, LIM.unidade);
  return insumoValido(o) ? o : null;
}

/** Movimento do histórico. Formato variável (saída, entrada, ajuste): limpeza genérica + campos-chave. */
export function sanitizarMovimento(m) {
  if (!m || typeof m !== 'object') return null;
  const id = idSeguro(m.id), tipo = umDe(m.tipo, ['saida', 'entrada', 'ajuste'], null);
  if (!id || !tipo || !dataValida(m.data)) return null;
  const o = limparProfundo(m, { maxTexto: LIM.itemNome, maxNos: 50000 });
  if (!o) return null;
  return { ...o, id, tipo, data: m.data };
}

const limparLista = (v, fn) => lista(v, MAX_ITENS_LISTA).map(fn).filter(Boolean);
export const sanitizarSobras = (v) => limparLista(v, sanitizarSobra);
export const sanitizarInsumos = (v) => limparLista(v, sanitizarInsumo);
export const sanitizarHistorico = (v) => limparLista(v, (m) => {
  const s = sanitizarMovimento(m);
  // a foto do "desfazer" é um estado inteiro de estoque e insumos: passa pela mesma conferência
  if (s && m.desfazer && typeof m.desfazer === 'object') s.desfazer = { estoque: sanitizarSobras(m.desfazer.estoque), insumos: sanitizarInsumos(m.desfazer.insumos) };
  return s;
});
export const sanitizarProjetos = (v) => limparLista(v, sanitizarProjeto);

// ---------------------------------------------------------------- arquivos

/** Confere o arquivo aberto para a lista de peças. @returns {{tipo:'xlsx'|'texto'}|{erro:string}} */
export function tipoDeArquivoDeLista(f) {
  const nome = String((f && f.name) || ''), tam = Number(f && f.size) || 0;
  if (/\.xls$/i.test(nome)) return { erro: 'O formato .xls (Excel antigo) não é lido. No Excel, use "Salvar como" > .xlsx ou CSV e abra de novo.' };
  if (/\.xlsx$/i.test(nome)) return tam > MAX_BYTES_PLANILHA ? { erro: 'Planilha grande demais (máximo 5 MB).' } : { tipo: 'xlsx' };
  if (tam > MAX_BYTES_LISTA) return { erro: 'Arquivo grande demais (máximo 2 MB). Uma lista de peças costuma ter poucos KB.' };
  return { tipo: 'texto' };
}
