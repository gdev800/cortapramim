// Fase 16: estoque mínimo e lista de compras.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planejar } from '../../../src/core/index.js';
import { createState, newBlock } from '../../../src/domain/state.js';
import { coletar } from '../../../src/domain/collect.js';
import { adicionarInsumo } from '../../../src/domain/supplies.js';
import { definirMinimo, abaixoDoMinimo, listaDeCompras, avisosDoPlano, csvCompras } from '../../../src/domain/restock.js';
import { montarPacote, lerPacote, insumosParaImportar } from '../../../src/domain/backup.js';

const tick = async () => {};
const fu = (mm) => String(mm / 10).replace('.', ',');

function base() {
  const st = createState(); st.unit = 'cm';
  st.blocks = [newBlock(st, { nome: 'Branco TX', esp: '15', sw: '275', sh: '185', fitaNome: 'Fita branca', rows: [{ q: 8, c: '270', l: '90', n: 'Tampo', fc: 1 }] })];
  st.ferr = [{ uid: 1, n: 'Dobradiça', q: '4', p: '' }];
  return st;
}
const chapa = (st, q) => adicionarInsumo(st, { tipo: 'chapa', nome: 'Branco TX', esp: '15', c: '275', l: '185', q: String(q) }).item;
const comPlano = async (st) => { st.res = await planejar({ K: 3.2, minRet: 200, refilo: 0 }, coletar(st).groups, 500, tick); return st; };

test('definirMinimo: vazio ou 0 tira; chapa só inteiro; valor inválido recusa', () => {
  const st = base(), c = chapa(st, 3), f = adicionarInsumo(st, { tipo: 'fita', nome: 'Fita branca', q: '20' }).item;
  assert.deepEqual(definirMinimo(st, c.id, '5'), {}); assert.equal(c.min, 5);
  assert.match(definirMinimo(st, c.id, '2,5').erro, /inteiro/); assert.equal(c.min, 5);
  assert.deepEqual(definirMinimo(st, f.id, '12,5'), {}); assert.equal(f.min, 12.5);
  assert.match(definirMinimo(st, f.id, '-1').erro, /inválido/);
  definirMinimo(st, c.id, ''); assert.equal('min' in c, false);
  definirMinimo(st, f.id, '0'); assert.equal('min' in f, false);
});

test('aviso: abaixo avisa, igual e acima não', () => {
  const st = base(), c = chapa(st, 3);
  const f = adicionarInsumo(st, { tipo: 'fita', nome: 'Fita branca', q: '20' }).item;
  const d = adicionarInsumo(st, { tipo: 'ferr', nome: 'Dobradiça', q: '30' }).item;
  definirMinimo(st, c.id, '5'); definirMinimo(st, f.id, '20'); definirMinimo(st, d.id, '10');
  const a = abaixoDoMinimo(st);
  assert.equal(a.length, 1);
  assert.equal(a[0].texto, 'Branco TX 15 mm: 3 chapas, abaixo do mínimo 5');
  assert.equal(a[0].falta, 2);
  c.q = 5; assert.equal(abaixoDoMinimo(st).length, 0, 'igual ao mínimo não avisa');
  c.q = 6; assert.equal(abaixoDoMinimo(st).length, 0);
  f.q = 19.5; assert.equal(abaixoDoMinimo(st)[0].texto, 'Fita branca: 19,5 m, abaixo do mínimo 20');
});

test('sem plano: compra só o que falta para o mínimo', () => {
  const st = base(), c = chapa(st, 3); definirMinimo(st, c.id, '5');
  const l = listaDeCompras(st, null);
  assert.equal(l.temPlano, false);
  assert.equal(l.itens.length, 1);
  assert.deepEqual([l.itens[0].nome, l.itens[0].comprar, l.itens[0].motivo], ['Branco TX 15 mm', 2, 'mínimo']);
});

test('com plano: soma a necessidade do plano com o mínimo', async () => {
  const st = base(), c = chapa(st, 10);
  adicionarInsumo(st, { tipo: 'fita', nome: 'Fita branca', q: '100' });
  adicionarInsumo(st, { tipo: 'ferr', nome: 'Dobradiça', q: '20' });
  await comPlano(st);
  const novas = st.res.groups[0].nNovas;
  assert.equal(novas, 4);
  assert.equal(listaDeCompras(st, st.res).itens.length, 0, 'tenho 10, plano pede 4, sem mínimo: nada a comprar');
  definirMinimo(st, c.id, '8');
  let it = listaDeCompras(st, st.res).itens.find((x) => x.tipo === 'chapa');
  assert.deepEqual([it.tenho, it.precisa, it.min, it.depois, it.comprar, it.motivo], [10, 4, 8, 6, 2, 'mínimo'], '4 + 8 − 10 = 2');
  c.q = 3;
  it = listaDeCompras(st, st.res).itens.find((x) => x.tipo === 'chapa');
  assert.deepEqual([it.comprar, it.motivo], [9, 'plano e mínimo'], '4 + 8 − 3 = 9');
  definirMinimo(st, c.id, '');
  it = listaDeCompras(st, st.res).itens.find((x) => x.tipo === 'chapa');
  assert.deepEqual([it.comprar, it.motivo], [1, 'plano'], 'sem mínimo: igual ao "Comprar" de antes');
});

test('itens do plano sem cadastro entram com tenho 0; fita arredonda para cima em 0,1 m', async () => {
  const st = await comPlano(base());
  const l = listaDeCompras(st, st.res);
  assert.deepEqual(l.itens.map((x) => [x.tipo, x.nome]), [['chapa', 'Branco TX 15 mm'], ['fita', 'Fita branca'], ['ferr', 'Dobradiça']]);
  const fita = l.itens[1];
  assert.equal(fita.tenho, 0); assert.ok(fita.comprar >= fita.precisa);
  assert.equal(Math.round(fita.comprar * 10), fita.comprar * 10);
  assert.equal(l.itens[2].comprar, 4);
});

test('avisos do plano: o que fica abaixo do mínimo depois de cortar', async () => {
  const st = base(), c = chapa(st, 10); await comPlano(st);
  definirMinimo(st, c.id, '6');
  assert.deepEqual(avisosDoPlano(st, st.res), [], 'fica com 6 = mínimo');
  definirMinimo(st, c.id, '7');
  assert.deepEqual(avisosDoPlano(st, st.res), ['Branco TX 15 mm: 10 chapas, depois deste plano fica 6 chapas, abaixo do mínimo 7']);
});

test('CSV da lista com acentos e backup guarda o mínimo (e descarta mínimo inválido)', async () => {
  const st = base(), c = chapa(st, 3); definirMinimo(st, c.id, '5');
  const csv = csvCompras(listaDeCompras(st, null), fu, 'cm');
  assert.match(csv, /^Tipo;Item;Tamanho \(cm\);Unidade;Tenho;Plano pede;Mínimo;Comprar;Motivo\r\n/);
  assert.match(csv, /Chapa;Branco TX 15 mm;275 x 185;chapa;3;0;5;2;mínimo$/);
  const { d } = lerPacote(JSON.stringify(montarPacote(st)));
  const lido = insumosParaImportar(d, [])[0];
  assert.equal(lido.min, 5);
  const ruim = insumosParaImportar({ insumos: [{ ...c, id: 'x', min: 'abc' }] }, []);
  assert.equal('min' in ruim[0], false);
});
