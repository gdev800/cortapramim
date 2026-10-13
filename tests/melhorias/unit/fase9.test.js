// Fase 9: peças das últimas chapas sobem para espaço livre das anteriores (consolidação), sem quebrar nada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planejar } from '../../../src/core/index.js';
import { consolidar } from '../../../src/core/consolidate.js';
import { createState } from '../../../src/domain/state.js';
import { coletar } from '../../../src/domain/collect.js';
import { EXEMPLO, restore } from '../../../src/domain/snapshot.js';

const tick = async () => {};
const CFG = { K: 3.2, minRet: 200, refilo: 0, fases: 0 };
const al = (seed) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const livre = (s) => 1 - s.area / (s.cfg.SW * s.cfg.SH);
const conc = (sheets) => sheets.reduce((a, s) => a + livre(s) * livre(s), 0);
const idsDe = (sheets) => sheets.flatMap((s) => s.pecas.map((p) => p.id)).sort((a, b) => a - b);

async function exemplo(portaLivre, extra = {}) {
  const ex = JSON.parse(JSON.stringify(EXEMPLO));
  if (portaLivre) ex.blocks[0].rows.find((r) => r.n === 'Porta').livre = true;
  const st = createState(); restore(st, ex);
  return planejar({ ...CFG, ...extra }, coletar(st).groups, 800, tick);
}
const portasNaChapa = (res, i) => res.groups[0].sheets[i].pecas.filter((p) => p.nome === 'Porta').length;

test('caso do exemplo: com a Porta livre para girar, uma Porta sobe para a chapa 1', async () => {
  const sem = await exemplo(true, { consolidar: false });
  assert.equal(portasNaChapa(sem, 0), 0);
  const com = await exemplo(true);
  assert.equal(portasNaChapa(com, 0), 1);
  assert.equal(portasNaChapa(com, 1), 1);
  assert.ok(com.groups[0].sheets.every((s) => s.ok));
  assert.ok(conc(com.groups[0].sheets) > conc(sem.groups[0].sheets));
});

test('com veio (Porta não gira), a Porta continua onde estava', async () => {
  const com = await exemplo(false);
  assert.equal(portasNaChapa(com, 0), 0);
  assert.equal(portasNaChapa(com, 1), 2);
});

test('chapas ficam numeradas em sequência, sem marca de edição manual', async () => {
  const res = await exemplo(true);
  let n = 0;
  res.groups.forEach((g) => g.sheets.forEach((s) => { assert.equal(s.n, ++n); assert.ok(!s.manual); }));
  assert.equal(res.nChapas, n);
  res.groups.forEach((g) => assert.equal(g.nNovas + g.nSobras, g.sheets.length));
});

test('em planos aleatórios: nenhuma peça some ou duplica, todas passam na verificação e o espaço livre só concentra', async () => {
  for (let seed = 1; seed <= 12; seed++) {
    const r = al(seed), pieces = [];
    const n = 8 + Math.floor(r() * 20);
    for (let i = 1; i <= n; i++) pieces.push({ id: i, c: 300 + Math.floor(r() * 1700), l: 150 + Math.floor(r() * 900), nome: 'p' + i, fc: 0, fl: 0, livre: false });
    const g = { nome: 'A', esp: 15, SW: 2750, SH: 1850, rot: true, estoque: 0, preco: 100, fitaPreco: 0, sobras: [], pieces };
    const base = await planejar({ ...CFG, consolidar: false }, [g], 300, tick);
    const depois = consolidar(base.groups[0].sheets);
    assert.deepEqual(idsDe(depois), idsDe(base.groups[0].sheets), 'seed ' + seed);
    assert.ok(depois.every((s) => s.ok), 'seed ' + seed);
    assert.ok(depois.length <= base.groups[0].sheets.length, 'seed ' + seed);
    // uma chapa que esvaziou e saiu do plano conta como 100% livre
    const removidas = base.groups[0].sheets.length - depois.length;
    assert.ok(conc(depois) + removidas >= conc(base.groups[0].sheets) - 1e-9, 'seed ' + seed);
  }
});

test('com limite de fases de corte, o plano consolidado continua dentro do limite', async () => {
  const res = await exemplo(true, { fases: 3 });
  res.groups.forEach((g) => g.sheets.forEach((s) => { assert.ok(s.ok); assert.ok(s.fases <= 3); }));
});

test('chapas de sobra do estoque não são mexidas', async () => {
  const pieces = [1, 2, 3].map((i) => ({ id: i, c: 400, l: 300, nome: 'p' + i, fc: 0, fl: 0, livre: false }));
  const g = { nome: 'A', esp: 15, SW: 2750, SH: 1850, rot: true, estoque: 0, preco: 100, fitaPreco: 0, sobras: [{ id: 'x', c: 1000, l: 800, nome: 'A' }], pieces };
  const res = await planejar(CFG, [g], 300, tick);
  const sob = res.groups[0].sheets.filter((s) => s.sobra);
  assert.ok(sob.length >= 1);
  assert.deepEqual(sob.map((s) => s.sobra.id), ['x']);
  assert.deepEqual(idsDe(res.groups[0].sheets), [1, 2, 3]);
});

test('uma chapa pouco usada some quando as peças cabem nas outras (3 chapas viram 2)', async () => {
  const r = al(2), pieces = [];
  const n = 8 + Math.floor(r() * 20);
  for (let i = 1; i <= n; i++) pieces.push({ id: i, c: 300 + Math.floor(r() * 1700), l: 150 + Math.floor(r() * 900), nome: 'p' + i, fc: 0, fl: 0, livre: false });
  const g = { nome: 'A', esp: 15, SW: 2750, SH: 1850, rot: true, estoque: 0, preco: 100, fitaPreco: 0, sobras: [], pieces };
  const base = await planejar({ ...CFG, consolidar: false }, [g], 300, tick);
  const depois = consolidar(base.groups[0].sheets);
  assert.ok(depois.length < base.groups[0].sheets.length);
  assert.deepEqual(idsDe(depois), idsDe(base.groups[0].sheets));
  assert.ok(depois.every((s) => s.ok));
});
