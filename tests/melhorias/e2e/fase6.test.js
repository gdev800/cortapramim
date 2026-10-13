// Fase 6 no navegador: aviso de sobra que não serve e cartão de chapa evitada.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../../e2e/helpers.js';

let app, page;
before(async () => { app = await abrirApp(); page = app.page; });
after(async () => { await app.fechar(); });

const preparar = (estoque) => page.evaluate((est) => {
  const s = window.__pc.state; s.unit = 'cm'; s.blocks = [s.blocks[0]]; s.estoque = est;
  Object.assign(s.blocks[0], { nome: 'MDF Branco', esp: '15', sw: '275', sh: '185', veio: false, preco: '300', usarSobras: true, mode: 'paste', paste: '1 = 30 x 30 = Pequena', origem: '' });
}, estoque);
const sobra = (o) => ({ id: 'e' + Math.random(), nome: 'MDF Branco', esp: 15, c: 1000, l: 800, veio: false, ...o });

test('sobra de outra espessura: aviso explica o motivo', async () => {
  await preparar([sobra({ esp: 18 })]);
  await page.fill('.blk [data-k="nome"]', 'MDF Branco');
  await page.waitForSelector('.sobwarn');
  assert.match(await page.innerText('.sobwarn'), /não será usada[\s\S]*18 mm/);
});

test('sobra compatível: peça pequena sai da sobra e aparece a chapa evitada', async () => {
  await preparar([sobra()]);
  await page.fill('.blk [data-k="nome"]', 'MDF Branco');
  assert.equal(await page.locator('.sobwarn').count(), 0);
  await page.evaluate(async () => { window.__pc.state.res = null; await window.__pc.calcular(3, true); });
  const txt = await page.innerText('#tiles');
  assert.match(txt, /evitada com 1 sobra/);
  assert.match(txt, /R\$/);
  assert.deepEqual(app.erros, []);
});
