// Fase 12: imagens e PDF para baixar mostram todas as sobras com medida (numeradas) e uma legenda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planejar, sheetSVG, PAL_EXPORT } from '../../../src/core/index.js';
import { RETALHO_MIN_LISTA } from '../../../src/core/constants.js';

const tick = async () => {};
const fu = (v) => String(Math.round(v) / 10).replace('.', ',');
let id = 0;
const P = (q, c, l) => Array.from({ length: q }, () => ({ id: ++id, c, l, nome: 'p', fc: 0, fl: 0, livre: false }));

async function chapa() {
  id = 0;
  const g = { nome: 'A', esp: 15, SW: 2750, SH: 1850, rot: true, estoque: 0, preco: 100, fitaPreco: 0, sobras: [], pieces: [...P(2, 2200, 550), ...P(2, 886, 120), ...P(3, 886, 500)] };
  const res = await planejar({ K: 3.2, minRet: 200, refilo: 0 }, [g], 800, tick);
  return res.groups[0].sheets[0];
}

test('com sobras: true, toda sobra listável aparece na legenda com número e medida', async () => {
  const s = await chapa();
  const { svg } = sheetSVG(s, PAL_EXPORT, { fu, un: 'cm', header: true, numbers: true, sobras: true }, 1);
  assert.match(svg, /Sobras \(cm\):/);
  s.restos.forEach((r, i) => {
    if (Math.min(r.w, r.h) < RETALHO_MIN_LISTA) return;
    assert.ok(svg.includes('R' + (i + 1) + ' ' + fu(r.w) + '×' + fu(r.h)), 'falta R' + (i + 1));
  });
  assert.match(svg, /dá para guardar como sobra/);
});

test('a legenda aumenta a altura da imagem; sem a opção o desenho fica igual ao de antes', async () => {
  const s = await chapa();
  const com = sheetSVG(s, PAL_EXPORT, { fu, un: 'cm', header: true, sobras: true }, 1);
  const sem = sheetSVG(s, PAL_EXPORT, { fu, un: 'cm', header: true }, 1);
  assert.ok(com.h > sem.h);
  assert.equal(com.w, sem.w);
  assert.doesNotMatch(sem.svg, /Sobras \(/);
});

test('chapa sem sobra nenhuma não ganha legenda', async () => {
  id = 0;
  const g = { nome: 'A', esp: 15, SW: 1000, SH: 500, rot: true, estoque: 0, preco: 100, fitaPreco: 0, sobras: [], pieces: P(1, 1000, 500) };
  const s = (await planejar({ K: 3.2, minRet: 200, refilo: 0 }, [g], 200, tick)).groups[0].sheets[0];
  const com = sheetSVG(s, PAL_EXPORT, { fu, un: 'cm', sobras: true }, 1), sem = sheetSVG(s, PAL_EXPORT, { fu, un: 'cm' }, 1);
  assert.equal(com.h, sem.h);
});
