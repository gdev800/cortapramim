// Fase 6: avisa por que uma sobra não serve e mostra quanto de chapa nova o plano evitou.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planejar } from '../../../src/core/index.js';
import { createState } from '../../../src/domain/state.js';
import { sobrasDoBloco, sobrasDescartadas, economiaSobras } from '../../../src/domain/scraps.js';

const tick = async () => {};
const sobra = (o) => ({ id: 's' + Math.random(), nome: 'MDF Branco', esp: 15, c: 1000, l: 800, veio: false, ...o });
const bloco = (o = {}) => ({ nome: 'MDF Branco', esp: '15', veio: false, usarSobras: true, ...o });
const estado = (estoque) => { const s = createState(); s.estoque = estoque; return s; };

test('sobra compatível não aparece como descartada', () => {
  const st = estado([sobra()]);
  assert.equal(sobrasDoBloco(st, bloco()).length, 1);
  assert.equal(sobrasDescartadas(st, bloco()).length, 0);
});

test('mesma chapa com espessura diferente é descartada com o motivo', () => {
  const st = estado([sobra({ esp: 18 })]);
  assert.equal(sobrasDoBloco(st, bloco()).length, 0);
  const d = sobrasDescartadas(st, bloco());
  assert.equal(d.length, 1);
  assert.match(d[0].motivos.join(' '), /18 mm/);
});

test('chapa com veio descarta sobra sem veio; sem veio aceita as duas', () => {
  const st = estado([sobra({ veio: false })]);
  assert.match(sobrasDescartadas(st, bloco({ veio: true }))[0].motivos.join(' '), /veio/);
  assert.equal(sobrasDescartadas(st, bloco({ veio: false })).length, 0);
});

test('nome parecido é apontado; nome sem relação e chapa sem nome são ignorados', () => {
  const st = estado([sobra({ nome: 'MDF Branco TX Eucatex' }), sobra({ nome: 'Carvalho' })]);
  const d = sobrasDescartadas(st, bloco());
  assert.equal(d.length, 1);
  assert.match(d[0].motivos.join(' '), /nome/);
  assert.equal(sobrasDescartadas(st, bloco({ nome: '' })).length, 0);
});

test('economia: sem sobras usadas é zero; com sobra mede área e valor', async () => {
  const g = (sobras) => ({ nome: 'A', esp: 15, SW: 2750, SH: 1850, rot: true, estoque: 0, preco: 300, fitaPreco: 0, sobras, pieces: [{ id: 1, c: 500, l: 500, nome: 'p', fc: 0, fl: 0, livre: false }] });
  const cfg = { K: 3.2, minRet: 200, refilo: 0 };
  const sem = economiaSobras(await planejar(cfg, [g([])], 100, tick));
  assert.equal(sem.nSobras, 0); assert.equal(sem.valor, 0);
  const com = economiaSobras(await planejar(cfg, [g([{ id: 'x', c: 1000, l: 1000, nome: 'A' }])], 100, tick));
  assert.equal(com.nSobras, 1); assert.equal(com.nPecas, 1);
  assert.ok(Math.abs(com.chapasEq - 250000 / (2750 * 1850)) < 1e-9);
  assert.ok(Math.abs(com.valor - com.chapasEq * 300) < 1e-6);
  assert.equal(economiaSobras(null).nSobras, 0);
});
