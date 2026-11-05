// Fase 2: juntar projetos num só cálculo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planejar, csvPecas, labelsSVG } from '../../../src/core/index.js';
import { coletar } from '../../../src/domain/collect.js';
import { createState, newBlock } from '../../../src/domain/state.js';
import { juntarProjeto } from '../../../src/domain/join.js';
import { custoPorProjeto } from '../../../src/domain/costs.js';
import { fmtFor } from '../../../src/domain/units.js';
import { csvRelatorio, linhasPorProjeto } from '../../../src/domain/report.js';

const tick = async () => {};
const blk = (st, paste, o = {}) => newBlock(st, { nome: 'MDF Branco', esp: '15', sw: '275', sh: '185', veio: false, preco: '300', mode: 'paste', paste, ...o });
function projeto(nome, paste, o = {}) {
  const st = createState();
  return { id: 'p-' + nome, nome, unit: 'cm', blocks: [blk(st, paste, o)] };
}
function estadoCom(pasteAtual) {
  const st = createState(); st.proj = { id: 'atual', nome: 'Cozinha' }; st.blocks = [blk(st, pasteAtual)];
  return st;
}
const cfg = { K: 3.2, minRet: 200, refilo: 0 };

test('juntar: chapas iguais viram um grupo só e as peças lembram o projeto', () => {
  const st = estadoCom('2 = 100 x 50 = Porta');
  const r = juntarProjeto(st, projeto('Quarto', '3 = 80 x 40 = Prateleira'));
  assert.equal(r.ok, true);
  assert.equal(st.blocks.length, 2);
  const col = coletar(st);
  assert.equal(col.groups.length, 1);
  const ps = col.groups[0].pieces;
  assert.equal(ps.length, 5);
  assert.equal(ps.filter((p) => p.proj === 'Cozinha').length, 2);
  assert.equal(ps.filter((p) => p.proj === 'Quarto').length, 3);
  assert.equal(new Set(ps.map((p) => p.id)).size, 5, 'ids únicos');
});

test('material diferente continua em grupo separado', () => {
  const st = estadoCom('2 = 100 x 50 = Porta');
  juntarProjeto(st, projeto('Quarto', '3 = 80 x 40 = Fundo', { nome: 'Fundo branco', esp: '6' }));
  assert.equal(coletar(st).groups.length, 2);
});

test('sem juntar, dois blocos iguais não são fundidos (comportamento antigo)', () => {
  const st = createState(); st.blocks = [blk(st, '1 = 10 x 10'), blk(st, '1 = 20 x 20')];
  assert.equal(coletar(st).groups.length, 2);
});

test('juntar converte a unidade do projeto trazido e não repete o mesmo projeto', () => {
  const st = estadoCom('1 = 100 x 50');
  const mm = { id: 'x', nome: 'Em mm', unit: 'mm', blocks: [{ nome: 'MDF Branco', esp: '15', sw: '2750', sh: '1850', veio: false, mode: 'paste', paste: '1 = 1000 x 500 = A' }] };
  assert.equal(juntarProjeto(st, mm).ok, true);
  const g = coletar(st).groups;
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].pieces.map((p) => p.c).sort(), [1000, 1000]);
  assert.equal(juntarProjeto(st, mm).ok, false);
  assert.equal(juntarProjeto(st, { id: 'atual', nome: 'Cozinha', blocks: [{}] }).ok, false);
});

test('juntar descarta a chapa vazia inicial em vez de marcá-la', () => {
  const st = createState(); st.blocks = [newBlock(st)];
  assert.equal(juntarProjeto(st, projeto('Quarto', '3 = 80 x 40')).ok, true);
  assert.equal(st.blocks.length, 1);
  assert.equal(st.blocks[0].origem, 'Quarto');
});

test('plano junto: verificação OK, peças mantêm o projeto, custo repartido fecha o total', async () => {
  const st = estadoCom('4 = 100 x 50 = Porta ; fita 1C');
  juntarProjeto(st, projeto('Quarto', '6 = 80 x 40 = Prateleira ; fita 2C', { fita: '2' }));
  st.blocks[0].fita = '2';
  const col = coletar(st);
  const res = await planejar(cfg, col.groups, 400, tick);
  res.groups.forEach((g) => g.sheets.forEach((s) => { assert.equal(s.ok, true); s.pecas.forEach((q) => assert.ok(q.proj)); }));
  const l = custoPorProjeto(res);
  assert.equal(l.length, 2);
  const g = res.groups[0];
  assert.ok(Math.abs(l.reduce((s, x) => s + x.chapas, 0) - g.nNovas * 300) < 1e-6, 'chapas somam o total');
  assert.ok(l.every((x) => x.chapas > 0 && x.fita > 0));
  assert.equal(linhasPorProjeto(res).length, 2);
});

test('um projeto só não gera quebra por projeto; saídas só ganham coluna Projeto quando há mais de um', async () => {
  const st = createState(); st.blocks = [blk(st, '2 = 100 x 50 = Porta')];
  const res = await planejar(cfg, coletar(st).groups, 200, tick);
  assert.equal(linhasPorProjeto(res).length, 0);
  assert.ok(!csvPecas(res, fmtFor('cm').fu, 'cm').split('\r\n')[0].includes('Projeto'));
  const st2 = estadoCom('2 = 100 x 50 = Porta');
  juntarProjeto(st2, projeto('Quarto', '1 = 80 x 40 = Gaveta'));
  const res2 = await planejar(cfg, coletar(st2).groups, 200, tick);
  const linhas = csvPecas(res2, fmtFor('cm').fu, 'cm').replace('﻿', '').split('\r\n');
  assert.match(linhas[0], /;Projeto$/);
  assert.ok(linhas.slice(1).some((l) => l.endsWith('"Quarto"')));
  assert.ok(csvRelatorio(res2, 0).includes('"Projeto"'));
  assert.ok(labelsSVG(res2, fmtFor('cm').fu, 'cm').svg.includes('Projeto: Quarto'));
});
