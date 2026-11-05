// Validação dos campos digitados: valores inválidos não viram plano de corte.
// "Erro de corte não tem volta": medida errada para o cálculo com mensagem; preço errado só avisa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, newBlock } from '../../../src/domain/state.js';
import { coletar } from '../../../src/domain/collect.js';
import { linhasParaTexto, MAX_LINHAS_PLANILHA } from '../../../src/domain/planilha.js';
import { cadastrarSobra } from '../../../src/domain/scraps.js';
import { adicionarInsumo } from '../../../src/domain/supplies.js';

function comPeca(row, bloco = {}) {
  const s = createState(); s.unit = 'mm';
  s.blocks = [newBlock(s, { nome: 'Branco', esp: '15', sw: '2750', sh: '1850', ...bloco, rows: [{ q: '1', c: '500', l: '300', n: 'Peça', ...row }] })];
  return coletar(s);
}

test('peça válida passa sem erro nem aviso', () => {
  const r = comPeca({});
  assert.deepEqual(r.erros, []);
  assert.deepEqual(r.avisos, []);
  assert.equal(r.groups[0].pieces.length, 1);
});

test('quantidade: só inteiro positivo ("2a" não vira 2)', () => {
  for (const q of ['2a', '-1', '0', '1,5', 'abc']) assert.equal(comPeca({ q }).erros.length, 1, q);
  assert.equal(comPeca({ q: '' }).groups[0].pieces.length, 1); // vazio = 1, como sempre foi
});

test('medidas: número de pelo menos 1 mm (maior que a chapa: "não cabe", no cálculo)', () => {
  for (const c of ['abc', '0', '-5', '0,5', 'Infinity', '1e3', '<img>']) assert.equal(comPeca({ c }).erros.length, 1, c);
  assert.equal(comPeca({ c: '1' }).erros.length, 0);
  assert.equal(comPeca({ c: '2750' }).erros.length, 0);
});

test('chapa em cm digitada como mm passa do limite de 10 m e avisa a unidade', () => {
  const s = createState(); s.unit = 'cm';
  s.blocks = [newBlock(s, { nome: 'Branco', esp: '15', sw: '2750', sh: '1850', rows: [{ q: '1', c: '220', l: '55' }] })];
  assert.match(coletar(s).erros[0], /passa de 10 m.*\(cm\)/);
});

test('chapa: tamanho e espessura válidos', () => {
  assert.equal(comPeca({}, { sw: 'abc' }).erros.length, 1);
  assert.equal(comPeca({}, { sw: '20000' }).erros.length, 1);
  assert.equal(comPeca({}, { esp: 'abc' }).erros.length, 1);
  assert.equal(comPeca({}, { esp: '0' }).erros.length, 1);
  assert.equal(comPeca({}, { esp: '150' }).erros.length, 1);
  assert.equal(comPeca({}, { esp: '18' }).erros.length, 0);
});

test('preço, fita e estoque errados avisam e valem 0 (não travam o cálculo)', () => {
  const r = comPeca({}, { preco: '-10', fita: 'abc', estoque: '2,5' });
  assert.equal(r.erros.length, 0);
  assert.equal(r.avisos.length, 3);
  assert.equal(r.groups[0].preco, 0);
  assert.equal(r.groups[0].fitaPreco, 0);
});

test('lista colada: medida fora do limite também para', () => {
  const s = createState(); s.unit = 'mm';
  s.blocks = [newBlock(s, { nome: 'Branco', esp: '15', sw: '2750', sh: '1850', mode: 'paste', paste: '2 = 0,2 x 300 = Errada\n1 = 500 x 300 = Certa' })];
  assert.equal(coletar(s).erros.length, 1);
});

test('planilha: tab ou quebra no nome não bagunça as colunas; linhas limitadas', () => {
  const t = linhasParaTexto([['Qtde', 'C', 'L', 'Nome'], [2, 500, 300, 'Lat\teral\nX']]);
  assert.equal(t.split('\n').length, 1);
  assert.equal(t.split('\t').length, 4);
  const muitas = [['Qtde', 'C', 'L', 'Nome'], ...Array.from({ length: MAX_LINHAS_PLANILHA + 50 }, () => [1, 10, 10, 'p'])];
  assert.ok(linhasParaTexto(muitas).split('\n').length < MAX_LINHAS_PLANILHA);
  assert.equal(linhasParaTexto(null), '');
  assert.equal(linhasParaTexto([[null], 'x', [1, 2]]), '');
});

test('cadastro manual de sobra e de insumo recusa valores inválidos', () => {
  const s = createState(); s.unit = 'mm';
  assert.ok(cadastrarSobra(s, { nome: 'Branco', esp: '15', c: 'abc', l: '300', q: '1' }).erro);
  assert.ok(cadastrarSobra(s, { nome: '', esp: '15', c: '500', l: '300', q: '1' }).erro);
  assert.ok(adicionarInsumo(s, { tipo: 'ferr', nome: 'Dobradiça', q: 'Infinity' }).erro);
  assert.ok(adicionarInsumo(s, { tipo: 'chapa', nome: 'Branco', q: '2,5', esp: '15', c: '2750', l: '1850' }).erro);
  assert.equal(s.estoque.length + s.insumos.length, 0);
});
