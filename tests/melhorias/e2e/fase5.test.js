// Fase 5 no navegador: clicar na chapa abre a visão ampliada com todos os retalhos e o botão de guardar.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../../e2e/helpers.js';

let app, page;
before(async () => { app = await abrirApp(); page = app.page; });
after(async () => { await app.fechar(); });

test('clicar no desenho abre a chapa ampliada, lista retalhos e guarda um como sobra', async () => {
  await page.evaluate(() => {
    const s = window.__pc.state; s.unit = 'cm'; s.blocks = [s.blocks[0]];
    Object.assign(s.blocks[0], { nome: 'MDF Branco', esp: '15', sw: '275', sh: '185', veio: false, preco: '300', mode: 'paste', paste: '1 = 270 x 180 = Painel', origem: '' });
  });
  await page.evaluate(async () => { window.__pc.state.res = null; await window.__pc.calcular(5, true); });
  assert.equal(await page.isVisible('#zoomDlg'), false);
  await page.click('#sheets .draw-wrap');
  assert.equal(await page.isVisible('#zoomDlg'), true);
  assert.ok(await page.locator('#zoomDraw [data-resto]').count() >= 1);
  const n = await page.locator('#zoomList [data-guardar]').count();
  assert.ok(n >= 1);
  const antes = await page.evaluate(() => window.__pc.state.estoque.length);
  await page.click('#zoomList [data-guardar]');
  await page.waitForFunction((a) => window.__pc.state.estoque.length === a + 1, antes);
  assert.match(await page.innerText('#zoomMsg'), /guardado/i);
  assert.equal(await page.locator('#zoomList [data-guardar]').count(), n - 1);
  await page.click('#zmFecha');
  assert.equal(await page.isVisible('#zoomDlg'), false);
  assert.deepEqual(app.erros, []);
});
