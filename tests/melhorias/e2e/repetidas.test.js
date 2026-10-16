// Chapas repetidas na tela: o cartão mostra quantos desenhos e as chapas iguais ganham a etiqueta.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../../e2e/helpers.js';

let app, page;
before(async () => { app = await abrirApp(); page = app.page; });
after(async () => { await app.fechar(); });

const carregar = (repetir) => page.evaluate(async (rep) => {
  const st = window.__pc.state;
  st.blocks = [st.blocks[0]];
  const b = st.blocks[0];
  b.nome = 'Modulo'; b.veio = false; b.mode = 'paste'; b.estoque = '';
  b.paste = '8 = 200 x 55\n4 = 200 x 60\n12 = 70 x 50';
  document.getElementById('ajRep').checked = rep;
  st.res = null; await window.__pc.calcular(6, true);
}, repetir);

test('módulos iguais: tile de desenhos e etiqueta "mesmo desenho" nas chapas', async () => {
  await carregar(true);
  const n = await page.evaluate(() => window.__pc.state.res.groups[0].sheets.length);
  assert.equal(n, 4);
  assert.match(await page.innerText('#tileDesenhos'), /desenhos? de corte para 4 chapas/);
  assert.ok(await page.locator('[data-desenho]').count() >= 2);
  assert.match(await page.locator('[data-desenho]').first().innerText(), /mesmo desenho das chapas/);
  assert.deepEqual(app.erros, []);
});

test('desmarcar o ajuste desliga a busca por chapas repetidas', async () => {
  await carregar(false);
  const rep = await page.evaluate(() => window.__pc.state.res.groups[0].sheets.some((s) => s.repetido));
  assert.equal(rep, false);
  assert.equal(await page.evaluate(() => window.__pc.state.aj.repetir === false || !document.getElementById('ajRep').checked), true);
});
