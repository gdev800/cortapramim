// Fase 14: histórico de movimentações (entradas, saídas e ajustes) e desfazer o último.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planejar } from '../../../src/core/index.js';
import { createState, newBlock } from '../../../src/domain/state.js';
import { coletar } from '../../../src/domain/collect.js';
import { adicionarInsumo } from '../../../src/domain/supplies.js';
import { fotografar, registrarEntrada, registrarAjuste, saidaDoPlano, desfazerUltimo, textoMovimento, historicoParaImportar, movimentoValido } from '../../../src/domain/history.js';
import { montarPacote, lerPacote } from '../../../src/domain/backup.js';

const tick = async () => {};

async function comPlano() {
  const st = createState(); st.unit = 'cm'; st.proj = { id: 'p1', nome: 'Guarda-roupa' };
  st.blocks = [newBlock(st, { nome: 'Branco TX', esp: '15', sw: '275', sh: '185', fitaNome: 'Fita branca', rows: [{ q: 8, c: '270', l: '90', n: 'Tampo', fc: 1 }] })];
  st.ferr = [{ uid: 1, n: 'Dobradiça', q: '4', p: '' }];
  adicionarInsumo(st, { tipo: 'chapa', nome: 'Branco TX', esp: '15', c: '275', l: '185', q: '10' });
  adicionarInsumo(st, { tipo: 'fita', nome: 'Fita branca', q: '100' });
  adicionarInsumo(st, { tipo: 'ferr', nome: 'Dobradiça', q: '20' });
  st.res = await planejar({ K: 3.2, minRet: 200, refilo: 0 }, coletar(st).groups, 500, tick);
  return st;
}

test('atualizar o estoque com um plano lança uma saída com peças, chapas, fita, ferragens e sobras', async () => {
  const st = await comPlano();
  const { mov } = saidaDoPlano(st);
  assert.equal(st.historico.length, 1);
  assert.equal(mov.tipo, 'saida'); assert.equal(mov.projeto, 'Guarda-roupa');
  assert.equal(mov.pecas, 8);
  assert.deepEqual(mov.chapas, [{ nome: 'Branco TX', esp: 15, q: 4 }]);
  assert.ok(mov.fitaM > 21 && mov.fitaM < 22, 'fita ' + mov.fitaM);
  assert.deepEqual(mov.ferragens, [{ nome: 'Dobradiça', q: 4 }]);
  assert.ok(mov.areaPecas > 0 && mov.areaChapas >= mov.areaPecas);
  assert.equal(st.insumos.find((x) => x.tipo === 'chapa').q, 6);
  assert.match(textoMovimento(mov).titulo, /Saída · Guarda-roupa/);
  assert.match(textoMovimento(mov).detalhe, /8 peças · 4 chapas/);
});

test('desfazer a saída volta o estoque e libera o plano para atualizar de novo', async () => {
  const st = await comPlano();
  const antes = JSON.stringify(fotografar(st));
  saidaDoPlano(st);
  assert.equal(st.estAtual, true);
  const r = desfazerUltimo(st);
  assert.equal(r.ok, true);
  assert.equal(JSON.stringify(fotografar(st)), antes);
  assert.equal(st.historico.length, 0); assert.equal(st.estAtual, false);
  saidaDoPlano(st);
  assert.equal(st.insumos.find((x) => x.tipo === 'chapa').q, 6, 'atualiza de novo sem duplicar');
});

test('entrada e ajuste; só o último pode ser desfeito', () => {
  const st = createState();
  let a = fotografar(st); adicionarInsumo(st, { tipo: 'fita', nome: 'Fita', q: '50' });
  registrarEntrada(st, { tipoItem: 'fita', nome: 'Fita', q: 50, un: 'm' }, a);
  a = fotografar(st); st.insumos[0].q = 30;
  registrarAjuste(st, { tipoItem: 'fita', nome: 'Fita', de: 50, para: 30, un: 'm' }, a);
  assert.equal(st.historico.length, 2);
  assert.ok(!st.historico[0].desfazer, 'só o último guarda a foto');
  assert.match(textoMovimento(st.historico[0]).detalhe, /\+50 m/);
  assert.match(textoMovimento(st.historico[1]).detalhe, /50 → 30 m/);
  assert.equal(desfazerUltimo(st).ok, true); assert.equal(st.insumos[0].q, 50);
  assert.equal(desfazerUltimo(st).ok, false, 'o anterior não tem foto');
});

test('backup v2 leva o histórico sem a foto; v1 (sem histórico) continua sendo lido', async () => {
  const st = await comPlano(); saidaDoPlano(st);
  const p = montarPacote(st);
  assert.equal(p.versao, 2); assert.equal(p.historico.length, 1); assert.ok(!p.historico[0].desfazer);
  const d = lerPacote(JSON.stringify(p)).d;
  assert.equal(historicoParaImportar(d, []).length, 1);
  assert.equal(historicoParaImportar(d, st.historico).length, 0, 'mesmo id não duplica');
  const v1 = lerPacote(JSON.stringify({ app: 'plano-corte-mdf', versao: 1, projetos: [], estoque: [], insumos: [] })).d;
  assert.deepEqual(historicoParaImportar(v1, []), []);
  assert.equal(movimentoValido({ id: 'x', tipo: 'roubo', data: new Date().toISOString() }), false);
});
