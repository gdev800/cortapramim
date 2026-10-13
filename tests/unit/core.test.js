import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLista, extraiFlags, flagsTxt, naoCabem, planejar, fitaMetros, csvCortes, csvPecas, sheetSVG, PAL_SCREEN, labelsSVG } from '../../src/core/index.js';

test('parseLista: estilo caderno com nome e fita', () => {
  const p = parseLista('2 = 54,3 x 49,5 = Fundo ; fita 2C 1L ; livre\nlixo qualquer');
  assert.equal(p.rows.length, 1);
  assert.deepEqual([p.rows[0].qty, p.rows[0].c, p.rows[0].l, p.rows[0].nome], [2, 54.3, 49.5, 'Fundo']);
  assert.deepEqual([p.rows[0].fc, p.rows[0].fl, p.rows[0].livre], [2, 1, true]);
  assert.equal(p.ignorados.length, 1);
});

test('parseLista: colunas de planilha', () => {
  const p = parseLista('3\t100\t50\tPrateleira');
  assert.deepEqual([p.rows[0].qty, p.rows[0].c, p.rows[0].l, p.rows[0].nome], [3, 100, 50, 'Prateleira']);
});

test('extraiFlags / flagsTxt fazem ida e volta', () => {
  const f = extraiFlags('Porta ; fita 2C 1L ; livre');
  assert.equal(f.nome, 'Porta');
  assert.equal(flagsTxt(f), ' ; fita 2C 1L ; livre');
  assert.equal(flagsTxt({ fc: 0, fl: 0, livre: false }), '');
});

function grupo(pieces, extra = {}) {
  return { nome: 'A', mat: 'A', esp: 15, SW: 2750, SH: 1850, rot: false, estoque: 0, preco: 100, fitaPreco: 2, sobras: [], pieces, ...extra };
}
const peca = (id, c, l, o = {}) => ({ id, c, l, nome: 'p' + id, fc: 0, fl: 0, livre: false, ...o });

test('naoCabem aponta peça maior que a chapa', () => {
  assert.equal(naoCabem([grupo([peca(1, 3000, 100)])]).length, 1);
  assert.equal(naoCabem([grupo([peca(1, 2750, 1850)])]).length, 0);
});

test('planejar: todas as peças dentro, sem sobreposição e verificadas', async () => {
  let seed = 7; const R = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const ri = (a, b) => Math.floor(a + R() * (b - a + 1));
  for (let k = 0; k < 4; k++) {
    const K = [0, 3.2, 4][ri(0, 2)], pieces = [];
    for (let i = 1; i <= ri(5, 25); i++) pieces.push(peca(i, ri(50, 1500), ri(40, 900), { fc: ri(0, 2), fl: ri(0, 2) }));
    const res = await planejar({ K, minRet: 200, refilo: 0 }, [grupo(pieces, { rot: R() < 0.5 })], 800, async () => {});
    let total = 0;
    res.groups[0].sheets.forEach((s) => {
      assert.equal(s.ok, true);
      total += s.pecas.length;
      s.pecas.forEach((p) => assert.ok(p.x >= -1e-6 && p.y >= -1e-6 && p.x + p.w <= s.cfg.SW + 1e-3 && p.y + p.h <= s.cfg.SH + 1e-3));
      for (let i = 0; i < s.pecas.length; i++) for (let j = i + 1; j < s.pecas.length; j++) {
        const a = s.pecas[i], b = s.pecas[j];
        assert.ok(!(a.x < b.x + b.w + K - 1e-3 && b.x < a.x + a.w + K - 1e-3 && a.y < b.y + b.h + K - 1e-3 && b.y < a.y + a.h + K - 1e-3), 'sobreposição');
      }
    });
    assert.equal(total, pieces.length);
  }
});

test('saídas: fita, csv, svg e etiquetas', async () => {
  const res = await planejar({ K: 3.2, minRet: 200, refilo: 0 }, [grupo([peca(1, 800, 400, { fc: 2, fl: 1 }), peca(2, 600, 300)])], 300, async () => {});
  assert.ok(fitaMetros(res.groups[0]) > 0);
  const fu = (v) => String(Math.round(v));
  assert.match(csvPecas(res, fu, 'mm'), /p1/);
  assert.ok(csvCortes(res, fu, 'mm').length > 0);
  assert.match(sheetSVG(res.groups[0].sheets[0], PAL_SCREEN, { fu, un: 'mm', header: false, numbers: true }, 1).svg, /<svg/);
  assert.ok(labelsSVG(res, fu, 'mm'));
});
