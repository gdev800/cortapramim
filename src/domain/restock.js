// Estoque mínimo e lista de compras. Funções puras sobre o state.
// Analogia: o mínimo é o "ponto de pedido" do almoxarifado; a lista de compras junta
// o que o plano aberto pede com o que falta para voltar ao mínimo depois dele.
import { chapaDoEstoque, necessidades, MAX_INSUMO } from './supplies.js';
import { norm, pIn, toStr } from './units.js';

const r2 = (v) => Math.round(v * 100) / 100;
const ORDEM = { chapa: 0, fita: 1, ferr: 2 };

/** Unidade para a tela: chapa conta em chapas, fita em metros, ferragem em unidades. */
export const unDe = (tipo) => (tipo === 'fita' ? 'm' : tipo === 'chapa' ? 'chapa' : 'un');
const qtdTxt = (q, tipo) => (tipo === 'chapa' ? toStr(q) + (q === 1 ? ' chapa' : ' chapas') : toStr(q) + ' ' + unDe(tipo));

/** Nome curto do item: chapa leva a espessura ("Branco TX 15 mm"). */
export const nomeItem = (s) => (s.tipo === 'chapa' ? s.nome + ' ' + toStr(Number(s.esp) || 0) + ' mm' : s.nome);

/** Mínimo válido do item (0 = sem mínimo). */
export const minimoDe = (s) => { const m = Number(s && s.min); return m > 0 && isFinite(m) ? m : 0; };

/**
 * Define o mínimo de um insumo. Vazio ou 0 tira o mínimo. Chapa só aceita número inteiro.
 * @returns {{erro?:string}}
 */
export function definirMinimo(state, id, valor) {
  const s = (state.insumos || []).find((x) => x.id === id); if (!s) return { erro: 'Item não encontrado.' };
  const txt = String(valor == null ? '' : valor).trim();
  if (!txt) { delete s.min; return {}; }
  const v = pIn(txt);
  if (!(v >= 0) || !isFinite(v) || v > MAX_INSUMO) return { erro: 'Mínimo inválido.' };
  if (s.tipo === 'chapa' && !Number.isInteger(v)) return { erro: 'O mínimo de chapas precisa ser um número inteiro.' };
  if (v === 0) delete s.min; else s.min = r2(v);
  return {};
}

/**
 * Itens com quantidade ABAIXO do mínimo (igual ao mínimo não avisa).
 * @returns {{id,tipo,nome,q,min,falta,un,texto}[]}
 */
export function abaixoDoMinimo(state) {
  return (state.insumos || []).filter((s) => minimoDe(s) > 0 && Number(s.q) < minimoDe(s)).map((s) => {
    const min = minimoDe(s), q = Number(s.q) || 0;
    return { id: s.id, tipo: s.tipo, nome: nomeItem(s), q, min, falta: r2(min - q), un: unDe(s.tipo),
      texto: nomeItem(s) + ': ' + qtdTxt(q, s.tipo) + ', abaixo do mínimo ' + toStr(min) };
  }).sort((a, b) => ORDEM[a.tipo] - ORDEM[b.tipo] || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/**
 * Lista de compras: para cada item, comprar = max(0, precisa + mínimo − tenho).
 * "precisa" vem do plano aberto (res pode ser null: aí só conta o mínimo).
 * Itens do plano sem cadastro no estoque também entram (tenho = 0, ou o "tenho" digitado na chapa).
 * @returns {{itens: object[], temPlano: boolean}} itens só com comprar > 0
 */
export function listaDeCompras(state, res) {
  const linhas = new Map();
  const doEstoque = (s) => {
    if (!linhas.has(s.id)) linhas.set(s.id, { chave: s.id, tipo: s.tipo, nome: nomeItem(s), c: s.c, l: s.l, tenho: Number(s.q) || 0, min: minimoDe(s), precisa: 0 });
    return linhas.get(s.id);
  };
  (state.insumos || []).forEach((s) => { if (minimoDe(s) > 0) doEstoque(s); });
  if (res && res.groups) {
    res.groups.forEach((g) => {
      if (!g.nNovas) return;
      const ref = (g.cfg && g.cfg.ref) || 0, SW = g.cfg.SW + 2 * ref, SH = g.cfg.SH + 2 * ref;
      const s = chapaDoEstoque(state, { nome: g.mat, esp: g.esp, SW, SH });
      if (s) { doEstoque(s).precisa += g.nNovas; return; }
      // sem cadastro: o "tenho" digitado no bloco vale para essa chapa
      const k = 'g:' + norm(g.mat) + '|' + (g.esp || 0) + '|' + Math.round(Math.max(SW, SH)) + 'x' + Math.round(Math.min(SW, SH));
      const ln = linhas.get(k) || { chave: k, tipo: 'chapa', nome: g.mat + (g.esp ? ' ' + toStr(g.esp) + ' mm' : ''), c: Math.max(SW, SH), l: Math.min(SW, SH), tenho: 0, min: 0, precisa: 0 };
      ln.precisa += g.nNovas; ln.tenho += g.estoque || 0; linhas.set(k, ln);
    });
    necessidades(state, res).forEach((x) => {
      const s = x.id && state.insumos.find((y) => y.id === x.id);
      if (s) { doEstoque(s).precisa += x.precisa; return; }
      const tipo = x.un === 'm' ? 'fita' : 'ferr', k = tipo + ':' + norm(x.nome);
      const ln = linhas.get(k) || { chave: k, tipo, nome: x.nome, tenho: 0, min: 0, precisa: 0 };
      ln.precisa += x.precisa; linhas.set(k, ln);
    });
  }
  const itens = [...linhas.values()].map((ln) => {
    const precisa = ln.tipo === 'fita' ? r2(ln.precisa) : ln.precisa, sobra = r2(ln.tenho - precisa);
    let comprar = Math.max(0, r2(precisa + ln.min - ln.tenho));
    if (ln.tipo === 'fita') comprar = Math.ceil(comprar * 10) / 10; else comprar = Math.ceil(comprar);
    const peloPlano = precisa > ln.tenho, peloMin = ln.min > 0 && sobra < ln.min;
    return { ...ln, precisa, depois: sobra, comprar, un: unDe(ln.tipo),
      motivo: peloPlano && peloMin ? 'plano e mínimo' : peloPlano ? 'plano' : peloMin ? 'mínimo' : '' };
  }).filter((x) => x.comprar > 0)
    .sort((a, b) => ORDEM[a.tipo] - ORDEM[b.tipo] || a.nome.localeCompare(b.nome, 'pt-BR'));
  return { itens, temPlano: !!(res && res.groups) };
}

/** Avisos do resultado: itens com mínimo que ficam abaixo dele depois do plano. */
export function avisosDoPlano(state, res) {
  return listaDeCompras(state, res).itens.filter((x) => x.min > 0 && x.depois < x.min && x.precisa > 0)
    .map((x) => x.nome + ': ' + qtdTxt(x.tenho, x.tipo) + ', depois deste plano fica ' + qtdTxt(Math.max(0, x.depois), x.tipo) + ', abaixo do mínimo ' + toStr(x.min));
}

const cel = (v) => { const s = String(v == null ? '' : v); return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const dec = (v) => String(r2(v)).replace('.', ',');
const TIPO = { chapa: 'Chapa', fita: 'Fita de borda', ferr: 'Ferragem' };

/** CSV da lista de compras (";" e vírgula decimal). O BOM é posto na entrega. `fu` formata mm na unidade da tela. */
export function csvCompras(lista, fu, unit) {
  const L = [['Tipo', 'Item', 'Tamanho (' + unit + ')', 'Unidade', 'Tenho', 'Plano pede', 'Mínimo', 'Comprar', 'Motivo'].map(cel).join(';')];
  lista.itens.forEach((x) => L.push([TIPO[x.tipo], x.nome, x.c ? fu(x.c) + ' x ' + fu(x.l) : '', x.un, dec(x.tenho), dec(x.precisa), x.min ? dec(x.min) : '', dec(x.comprar), x.motivo].map(cel).join(';')));
  return L.join('\r\n');
}
