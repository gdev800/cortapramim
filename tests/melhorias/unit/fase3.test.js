// Fase 3: cortes em fases (2 = tiras e cortes cruzados, 3 = com um aparo a mais).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planejar, fasesDoPlano, csvCortes } from '../../../src/core/index.js';
import { makeCtx, costOf } from '../../../src/core/anneal.js';
import { otimizarChapa } from '../../../src/core/sheet.js';
import { cfgDoMotor } from '../../../src/domain/estimate.js';
import { H, V } from '../../../src/core/constants.js';

const tick = async () => {};
const grupo = (pieces, extra = {}) => ({ nome: 'A', esp: 15, SW: 2750, SH: 1850, rot: false, estoque: 0, preco: 100, fitaPreco: 0, sobras: [], pieces, ...extra });
const peca = (id, c, l, o = {}) => ({ id, c, l, nome: 'p' + id, fc: 0, fl: 0, livre: false, ...o });
function aleatorio(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

test('fasesDoPlano conta mudanças de direção (verificador independente)', () => {
  const cfg = { SW: 1000, SH: 1000, K: 0 };
  const cortes = [
    { tipo: 'V', pos: 500, ini: 0, fim: 1000 },
    { tipo: 'H', pos: 300, ini: 0, fim: 500 },
    { tipo: 'V', pos: 200, ini: 0, fim: 300 },
  ];
  assert.equal(fasesDoPlano(cortes, [{ x: 0, y: 0, w: 200, h: 300 }], cfg).fases, 3);
  assert.deepEqual(fasesDoPlano(cortes, [{ x: 0, y: 0, w: 200, h: 300 }], cfg).porCorte, [1, 2, 3]);
  assert.equal(fasesDoPlano(cortes.slice(0, 2), [{ x: 0, y: 0, w: 500, h: 300 }], cfg).fases, 2);
  assert.equal(fasesDoPlano([], [{ x: 0, y: 0, w: 1000, h: 1000 }], cfg).fases, 0);
  // corte que não cabe em nenhum retângulo é inválido
  assert.equal(fasesDoPlano([{ tipo: 'V', pos: 5000, ini: 0, fim: 1000 }], [], cfg).fases, Infinity);
});

test('contador do otimizador bate com a simulação física em árvores aleatórias', async () => {
  const R = aleatorio(11);
  const cfg = { K: 3.2, minRet: 200, SW: 2750, SH: 1850, rot: false, ref: 0, fases: 9 };
  let comparados = 0;
  for (let k = 0; k < 300; k++) {
    const n = 1 + Math.floor(R() * 8);
    const items = Array.from({ length: n }, (_, i) => ({ p: peca(i + 1, 100 + Math.floor(R() * 500), 100 + Math.floor(R() * 400)), flip: false }));
    // árvore binária aleatória em notação polonesa
    const monta = (ids) => {
      if (ids.length === 1) return [ids[0]];
      const corte = 1 + Math.floor(R() * (ids.length - 1));
      return monta(ids.slice(0, corte)).concat(monta(ids.slice(corte)), [R() < 0.5 ? V : H]);
    };
    const expr = monta(items.map((_, i) => i));
    const ctx = makeCtx(items, cfg);
    costOf(expr, ctx.fl, ctx);
    if (!ctx.lastOk) continue; // estourou a chapa
    const r = await otimizarChapa({ items, expr }, cfg, 0, aleatorio(1), tick);
    assert.equal(r.ok, true);
    assert.equal(r.fases, ctx.lastFases, 'árvore ' + expr.join(','));
    comparados++;
  }
  assert.ok(comparados > 200, 'poucos casos comparados: ' + comparados);
});

test('2 e 3 fases: todo plano respeita o limite, passa na verificação e leva todas as peças', async () => {
  const R = aleatorio(5);
  for (const fases of [2, 3]) {
    for (let t = 0; t < 4; t++) {
      const pieces = [];
      const n = 6 + Math.floor(R() * 20);
      for (let i = 1; i <= n; i++) pieces.push(peca(i, 100 + Math.floor(R() * 1200), 80 + Math.floor(R() * 700)));
      const res = await planejar({ K: 3.2, minRet: 200, refilo: 0, fases }, [grupo(pieces, { rot: R() < 0.5 })], 500, tick);
      let total = 0;
      res.groups[0].sheets.forEach((s) => {
        assert.equal(s.ok, true, 'verificação falhou');
        const f = fasesDoPlano(s.cortes, s.pecas, s.cfg);
        assert.ok(f.fases <= fases, 'fases ' + f.fases + ' > ' + fases);
        assert.equal(s.fases, f.fases);
        assert.ok(s.cortes.every((c) => c.fase >= 1 && c.fase <= fases));
        total += s.pecas.length;
      });
      assert.equal(total, n);
    }
  }
});

test('2 fases com peças repetidas gasta o mesmo número de chapas que o corte livre', async () => {
  const pieces = Array.from({ length: 8 }, (_, i) => peca(i + 1, 600, 400));
  const livre = await planejar({ K: 3.2, minRet: 200, refilo: 0 }, [grupo(pieces)], 400, tick);
  const duas = await planejar({ K: 3.2, minRet: 200, refilo: 0, fases: 2 }, [grupo(pieces)], 400, tick);
  assert.equal(duas.groups[0].sheets.length, livre.groups[0].sheets.length);
  duas.groups[0].sheets.forEach((s) => assert.ok(s.fases <= 2 && s.ok));
});

test('livre não muda nada: sem fase nos cortes e sem coluna extra no CSV', async () => {
  const res = await planejar({ K: 3.2, minRet: 200, refilo: 0 }, [grupo([peca(1, 800, 400), peca(2, 600, 300), peca(3, 500, 200)])], 300, tick);
  res.groups[0].sheets.forEach((s) => { assert.equal(s.fases, 0); assert.ok(s.cortes.every((c) => c.fase === undefined)); });
  assert.ok(!csvCortes(res, (v) => String(v), 'mm').split('\r\n')[0].includes('Fase'));
});

test('CSV de cortes ganha a coluna Fase quando limitado', async () => {
  const res = await planejar({ K: 3.2, minRet: 200, refilo: 0, fases: 2 }, [grupo([peca(1, 800, 400), peca(2, 800, 400), peca(3, 500, 200)])], 300, tick);
  const l = csvCortes(res, (v) => String(v), 'mm').replace('﻿', '').split('\r\n');
  assert.match(l[0], /;Fase$/);
  assert.ok(l.slice(1).every((x) => /;[12]$/.test(x)));
});

test('cfgDoMotor: fases só aceita 2 ou 3, o resto é livre', () => {
  assert.equal(cfgDoMotor({ K: '3', minRet: '0', refilo: '0', fases: '2' }).fases, 2);
  assert.equal(cfgDoMotor({ K: '3', minRet: '0', refilo: '0', fases: '3' }).fases, 3);
  assert.equal(cfgDoMotor({ K: '3', minRet: '0', refilo: '0', fases: '7' }).fases, 0);
  assert.equal(cfgDoMotor({ K: '3', minRet: '0', refilo: '0' }).fases, 0);
});
