// Fase 10: chapa nova começa sem veio; com veio aparece o alerta de aproveitamento menor.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../../e2e/helpers.js';

let app, page;
before(async () => { app = await abrirApp(); page = app.page; });
after(async () => { await app.fechar(); });

test('chapa adicionada começa sem veio e sem alerta', async () => {
  const antes = await page.locator('.blk').count();
  await page.click('#btnAddBlk');
  await page.waitForFunction((n) => document.querySelectorAll('.blk').length === n + 1, antes);
  const nova = page.locator('.blk').last();
  assert.equal(await nova.locator('[data-k="veio"]').isChecked(), false);
  assert.equal(await nova.locator('.veiowarn').count(), 0);
});

test('marcar veio mostra o alerta; desmarcar tira', async () => {
  const nova = page.locator('.blk').last();
  await nova.locator('[data-k="veio"]').check();
  await nova.locator('.veiowarn').waitFor();
  assert.match(await nova.locator('.veiowarn').innerText(), /Com veio, o aproveitamento é menor/);
  await nova.locator('[data-k="veio"]').uncheck();
  assert.equal(await nova.locator('.veiowarn').count(), 0);
  assert.deepEqual(app.erros, []);
});

test('o exemplo (chapa TX com veio) mostra o alerta na chapa certa', async () => {
  const primeira = page.locator('.blk').first();
  assert.equal(await primeira.locator('[data-k="veio"]').isChecked(), true);
  assert.equal(await primeira.locator('.veiowarn').count(), 1);
});
