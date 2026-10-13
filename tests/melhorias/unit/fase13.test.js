// Fase 13: estoque de chapas inteiras. O plano usa como "Tenho" e o "Atualizar estoque" desconta as chapas novas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planejar } from '../../../src/core/index.js';
import { createState, newBlock } from '../../../src/domain/state.js';
import { coletar } from '../../../src/domain/collect.js';
import { adicionarInsumo, chapasEmEstoque, baixarInsumos, insumoValido, definirQuantidade } from '../../../src/domain/supplies.js';
import { montarPacote, lerPacote, insumosParaImportar } from '../../../src/domain/backup.js';

const tick = async () => {};

function estado() {
  const st = createState();
  st.unit = 'cm';
  st.blocks = [newBlock(st, { nome: 'Branco TX', esp: '15', sw: '275', sh: '185', rows: [{ q: 6, c: '200', l: '60', n: 'Lateral' }] })];
  return st;
}
const chapa = (st, q, extra = {}) => adicionarInsumo(st, { tipo: 'chapa', nome: 'Branco TX', esp: '15', c: '275', l: '185', q: String(q), ...extra });

test('cadastra chapa em mm e soma quando material, espessura e tamanho batem (tamanho em qualquer ordem)', () => {
  const st = estado();
  assert.deepEqual(chapa(st, 10), { somou: false });
  assert.deepEqual(chapa(st, 2, { c: '185', l: '275' }), { somou: true });
  assert.equal(st.insumos.length, 1);
  assert.deepEqual({ c: st.insumos[0].c, l: st.insumos[0].l, esp: st.insumos[0].esp, q: st.insumos[0].q }, { c: 2750, l: 1850, esp: 15, q: 12 });
  chapa(st, 1, { esp: '18' });
  assert.equal(st.insumos.length, 2, 'outra espessura é outro item');
});

test('recusa quantidade quebrada e medidas faltando', () => {
  const st = estado();
  assert.ok(chapa(st, 1.5).erro);
  assert.ok(chapa(st, 2, { c: '' }).erro);
  assert.ok(adicionarInsumo(st, { tipo: 'chapa', nome: '', esp: '15', c: '275', l: '185', q: '2' }).erro);
  chapa(st, 3); definirQuantidade(st, st.insumos[0].id, '4,7');
  assert.equal(st.insumos[0].q, 4);
});

test('casa com o grupo do plano só com o mesmo nome, espessura e tamanho', () => {
  const st = estado(); chapa(st, 10);
  assert.equal(chapasEmEstoque(st, { nome: 'branco tx', esp: 15, SW: 2750, SH: 1850 }), 10);
  assert.equal(chapasEmEstoque(st, { nome: 'Branco TX', esp: 18, SW: 2750, SH: 1850 }), 0);
  assert.equal(chapasEmEstoque(st, { nome: 'Branco TX', esp: 15, SW: 2440, SH: 1220 }), 0);
});

test('campo "tenho" vazio usa o estoque; digitado continua valendo', () => {
  const st = estado(); chapa(st, 10);
  let g = coletar(st).groups[0];
  assert.equal(g.estoque, 10); assert.equal(g.estoqueAuto, true);
  st.blocks[0].estoque = '2';
  g = coletar(st).groups[0];
  assert.equal(g.estoque, 2); assert.ok(!g.estoqueAuto);
});

test('dois blocos do mesmo material dividem o estoque', () => {
  const st = estado(); chapa(st, 3);
  st.blocks.push(newBlock(st, { nome: 'Branco TX', esp: '15', sw: '275', sh: '185', rows: [{ q: 1, c: '50', l: '50' }] }));
  const gs = coletar(st).groups;
  assert.equal(gs[0].estoque + (gs[1].estoque || 0), 3);
});

test('pronto quando: 10 em estoque, plano de 4 → Tenho 10, Comprar 0; ao atualizar ficam 6', async () => {
  const st = estado(); chapa(st, 10);
  st.blocks[0].rows = [{ q: '8', c: '270', l: '90', n: 'Tampo', fc: '0', fl: '0' }].map((r) => ({ ...st.blocks[0].rows[0], ...r }));
  const col = coletar(st);
  st.res = await planejar({ K: 3.2, minRet: 200, refilo: 0 }, col.groups, 500, tick);
  const g = st.res.groups[0];
  assert.equal(g.nNovas, 4);
  assert.equal(g.estoque, 10); assert.equal(g.estoqueAuto, true);
  assert.equal(Math.max(0, g.nNovas - g.estoque), 0);
  assert.ok(baixarInsumos(st) >= 1);
  assert.equal(st.insumos[0].q, 6);
});

test('backup leva e traz a chapa; item malformado é recusado', () => {
  const st = estado(); chapa(st, 5);
  const r = lerPacote(JSON.stringify(montarPacote(st)));
  const st2 = estado();
  const ins = insumosParaImportar(r.d, st2.insumos);
  assert.equal(ins.length, 1); assert.equal(ins[0].tipo, 'chapa'); assert.equal(ins[0].c, 2750);
  assert.equal(insumoValido({ id: 'x', tipo: 'chapa', nome: 'A', esp: 15, c: 2750, l: 1850, q: 2.5 }), false);
  assert.equal(insumoValido({ id: 'x', tipo: 'chapa', nome: 'A', esp: 0, c: 2750, l: 1850, q: 2 }), false);
});
