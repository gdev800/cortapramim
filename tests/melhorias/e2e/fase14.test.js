// Fase 14: movimentações na tela. Cadastro gera entrada; aprovar e atualizar gera saída; desfazer volta.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../../e2e/helpers.js';

let app, page;
before(async () => { app = await abrirApp(); page = app.page; await page.evaluate(() => { document.getElementById('sobras').open = true; }); });
after(async () => { await app.fechar(); });

test('cadastrar fita gera uma entrada na lista', async () => {
  await page.selectOption('#insTipo', 'fita');
  await page.fill('#insNome', 'Fita branca'); await page.fill('#insQ', '50');
  await page.click('#btnIns');
  await page.waitForFunction(() => (window.__pc.state.historico || []).length === 1);
  assert.match(await page.innerText('#movList'), /Entrada · fita Fita branca[\s\S]*\+50 m/);
});

test('aprovar e atualizar o estoque gera a saída; desfazer (com confirmação) volta', async () => {
  await page.evaluate(async () => { window.__pc.state.res = null; await window.__pc.calcular(4, true); });
  await page.click('#btnAprovar'); await page.click('#btnEstoque');
  await page.waitForFunction(() => window.__pc.state.historico.length === 2);
  assert.match(await page.innerText('#movList'), /Saída[\s\S]*peças · \d+ chapas/);
  const nSobras = await page.evaluate(() => window.__pc.state.estoque.length);
  assert.ok(nSobras > 0);
  await page.click('#btnMovDesfazer'); await page.click('#btnMovDesfazer');
  await page.waitForFunction(() => window.__pc.state.historico.length === 1);
  assert.equal(await page.evaluate(() => window.__pc.state.estoque.length), 0);
  assert.equal(await page.evaluate(() => window.__pc.state.estAtual), false);
  assert.equal(await page.isVisible('#btnEstoque'), true, 'pode atualizar de novo');
  assert.deepEqual(app.erros, []);
});

test('o histórico fica guardado depois de recarregar', async () => {
  await page.reload();
  await page.waitForFunction(() => window.__pc && (window.__pc.state.historico || []).length === 1);
});
