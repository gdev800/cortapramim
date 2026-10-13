// Fase 8: estoque (sobras, fita e ferragens) começa escondido e abre com um clique.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../../e2e/helpers.js';

let app, page;
before(async () => { app = await abrirApp(); page = app.page; });
after(async () => { await app.fechar(); });

test('começa fechado, com o resumo no botão, e o conteúdo some da tela', async () => {
  assert.equal(await page.evaluate(() => document.getElementById('sobras').open), false);
  assert.match(await page.innerText('#estoqueResumo'), /\d+ sobras?.*\d+ itens? de fita/);
  assert.equal(await page.isVisible('#btnIns'), false);
});

test('clicar no resumo abre e fecha; o resumo acompanha uma sobra nova', async () => {
  await page.click('#sobras > summary');
  assert.equal(await page.isVisible('#btnIns'), true);
  await page.click('#sobras > summary');
  assert.equal(await page.isVisible('#btnIns'), false);
  const antes = await page.evaluate(() => window.__pc.state.insumos.length);
  await page.click('#sobras > summary');
  await page.fill('#insNome', 'Fita teste fase 8');
  await page.fill('#insQ', '12');
  await page.click('#btnIns');
  await page.waitForFunction((n) => window.__pc.state.insumos.length === n + 1, antes);
  const esperado = antes + 1;
  assert.match(await page.innerText('#estoqueResumo'), new RegExp(esperado + ' ' + (esperado === 1 ? 'item de fita' : 'itens de fita')));
});

test('o link Estoque da barra abre a seção', async () => {
  await page.click('.nav-links a[data-sec="sobras"]');
  await page.waitForFunction(() => document.getElementById('sobras').open);
  assert.equal(await page.isVisible('#btnIns'), true);
  assert.deepEqual(app.erros, []);
});
