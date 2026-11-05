// Chapas repetidas (melhoria vinda da comparação com o LeoPlan): o mesmo desenho em várias chapas,
// sem gastar chapa a mais. Desligável em Ajustes (cfg.repetir = false).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planejar } from '../../../src/core/index.js';
import { repetirDesenhos, assinaturaDesenho } from '../../../src/core/repeat.js';
import { gruposDeDesenho, contarDesenhos, faixa, textoDesenho } from '../../../src/domain/patterns.js';
import { cfgDoMotor } from '../../../src/domain/estimate.js';

const tick = async () => {};
let id = 0;
const P = (q, c, l) => Array.from({ length: q }, () => ({ id: ++id, c, l, nome: '', fc: 0, fl: 0, livre: false }));
// 4 "módulos" iguais embaralhados: cabem em 4 chapas com o mesmo desenho
const modulos = () => { id = 0; return [...P(8, 2000, 550), ...P(4, 2000, 600), ...P(12, 700, 500)].sort((a, b) => (a.id * 7919) % 24 - (b.id * 7919) % 24); };
const grupo = (pieces, rot = true) => ({ nome: 'A', esp: 15, SW: 2750, SH: 1850, rot, estoque: 0, preco: 0, sobras: [], pieces });
const ids = (sheets) => sheets.flatMap((s) => s.pecas.map((p) => p.id)).sort((a, b) => a - b);

test('peças de módulos iguais: o plano usa o mesmo desenho e não gasta chapa a mais', async () => {
  const res = await planejar({ K: 3.2, minRet: 200, refilo: 0 }, [grupo(modulos())], 4000, tick);
  const sh = res.groups[0].sheets;
  assert.equal(sh.length, 4);
  assert.ok(sh.every((s) => s.ok));
  assert.deepEqual(ids(sh), Array.from({ length: 24 }, (_, i) => i + 1));
  assert.ok(contarDesenhos(res) <= 2, 'desenhos: ' + contarDesenhos(res));
});

test('repetirDesenhos nunca devolve mais chapas e mantém todas as peças', async () => {
  const base = await planejar({ K: 3.2, minRet: 200, refilo: 0, repetir: false }, [grupo(modulos())], 1500, tick);
  const sheets = base.groups[0].sheets;
  const resto = async (pecas, ms) => (await planejar({ K: 3.2, minRet: 200, refilo: 0, repetir: false }, [grupo(pecas)], ms, tick)).groups[0].sheets;
  const nova = await repetirDesenhos(sheets, resto, 3000, () => performance.now(), true);
  const fim = nova || sheets;
  assert.ok(fim.length <= sheets.length);
  assert.deepEqual(ids(fim), ids(sheets));
  assert.ok(fim.every((s) => s.ok));
});

test('com repetir: false o motor não marca chapas repetidas', async () => {
  const res = await planejar({ K: 3.2, minRet: 200, refilo: 0, repetir: false }, [grupo(modulos())], 1500, tick);
  assert.ok(res.groups[0].sheets.every((s) => !s.repetido));
});

test('peça deitada e em pé contam como a mesma em chapa sem veio, e a cópia continua válida', async () => {
  id = 0;
  const pecas = [...P(6, 2000, 550), ...P(6, 550, 2000), ...P(12, 700, 500)];
  const res = await planejar({ K: 3.2, minRet: 200, refilo: 0 }, [grupo(pecas)], 4000, tick);
  assert.ok(res.groups[0].sheets.every((s) => s.ok));
  assert.equal(ids(res.groups[0].sheets).length, 24);
});

test('grupos de desenho, faixa e texto', () => {
  assert.equal(faixa([1, 2, 3, 4]), '1 a 4');
  assert.equal(faixa([1, 3, 5]), '1, 3 e 5');
  assert.equal(textoDesenho({ chapas: [2, 3], ordem: 1 }), 'mesmo desenho das chapas 2 a 3 (2×)');
  const s = (n, expr) => ({ n, cfg: { SW: 100, SH: 100, K: 3 }, spec: { expr, items: [{ p: { c: 10, l: 10 }, flip: false }, { p: { c: 20, l: 10 }, flip: false }] } });
  const res = { groups: [{ sheets: [s(1, [0, 1, -1]), s(2, [0, 1, -1]), s(3, [0, 1, -2])] }] };
  const g = gruposDeDesenho(res);
  assert.deepEqual(g.get(1).chapas, [1, 2]); assert.equal(g.get(2).ordem, 2); assert.equal(g.has(3), false);
  assert.equal(contarDesenhos(res), 2);
  assert.equal(assinaturaDesenho({ n: 9 }), null);
});

test('ajuste da tela: repetir ligado por padrão, desligável', () => {
  assert.equal(cfgDoMotor({ K: '3', minRet: '0', refilo: '0', fases: '0' }).repetir, true);
  assert.equal(cfgDoMotor({ K: '3', minRet: '0', refilo: '0', fases: '0', repetir: false }).repetir, false);
});
