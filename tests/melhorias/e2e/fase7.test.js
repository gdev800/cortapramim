// Fase 7: o painel de modelos tem o seletor cm/mm, ligado ao do projeto.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../../e2e/helpers.js';

let app, page;
before(async () => { app = await abrirApp(); page = app.page; });
after(async () => { await app.fechar(); });

const pressed = (id) => page.getAttribute(id, 'aria-pressed');

test('trocar a unidade no modelo muda os campos e acompanha o seletor do projeto', async () => {
  await page.click('#modelCards .mcard >> nth=0');
  await page.waitForSelector('#modelForm .grid label');
  await page.click('#mdUnMm');
  assert.match(await page.innerText('#modelForm .grid .field label >> nth=0'), /\(mm\)/);
  assert.equal(await pressed('#unMm'), 'true');
  await page.click('#mdUnCm');
  assert.match(await page.innerText('#modelForm .grid .field label >> nth=0'), /\(cm\)/);
  assert.equal(await pressed('#unCm'), 'true');
  assert.equal(await pressed('#mdUnCm'), 'true');
});

test('o valor digitado é convertido ao trocar (120 cm vira 1200 mm) e o modelo gera peças', async () => {
  const campo = '#modelForm input[data-mk]:not([type=checkbox]) >> nth=0';
  await page.click('#mdUnCm');
  await page.fill(campo, '120');
  await page.dispatchEvent(campo, 'input');
  const mm = await page.evaluate(() => Object.values(window.__pc.state.model.v)[0]);
  assert.equal(mm, 1200);
  await page.click('#mdUnMm');
  assert.equal(await page.inputValue(campo), '1200');
  await page.click('#btnModeloAdd');
  assert.ok(await page.evaluate(() => window.__pc.state.blocks.some((b) => b.rows.length || b.paste)));
  assert.deepEqual(app.erros, []);
});
