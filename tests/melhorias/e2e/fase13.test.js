// Fase 13: cadastrar chapa inteira pela tela, ver "Tenho" na lista de compras e baixar ao atualizar o estoque.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../../e2e/helpers.js';

let app, page;
before(async () => { app = await abrirApp(); page = app.page; });
after(async () => { await app.fechar(); });

test('cadastra 10 chapas do material do exemplo pela tela', async () => {
  await page.evaluate(() => { document.getElementById('sobras').open = true; });
  await page.selectOption('#insTipo', 'chapa');
  assert.equal(await page.isVisible('#insChapa'), true);
  await page.fill('#insNome', 'Branco TX Eucatex');
  await page.fill('#insEsp', '15');
  await page.fill('#insC', '275'); await page.fill('#insL', '185');
  await page.fill('#insQ', '10');
  await page.click('#btnIns');
  await page.waitForFunction(() => window.__pc.state.insumos.some((x) => x.tipo === 'chapa'));
  assert.match(await page.innerText('#insList'), /Branco TX Eucatex · 15 mm · 275 × 185 cm/);
});

test('o plano mostra "Tenho 10 do estoque" e, ao atualizar, desconta as chapas novas', async () => {
  await page.evaluate(async () => { window.__pc.state.res = null; await window.__pc.calcular(4, true); });
  const g = await page.evaluate(() => window.__pc.state.res.groups.find((x) => x.mat === 'Branco TX Eucatex'));
  assert.equal(g.estoque, 10);
  assert.match(await page.innerText('#shop'), /do estoque/);
  await page.click('#btnAprovar');
  await page.click('#btnEstoque');
  await page.waitForFunction(() => window.__pc.state.estAtual);
  const q = await page.evaluate(() => window.__pc.state.insumos.find((x) => x.tipo === 'chapa').q);
  assert.equal(q, 10 - g.nNovas);
  assert.deepEqual(app.erros, []);
});
