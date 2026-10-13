// Fase 11: o cartão de chapas novas diz se o plano está no mínimo possível pela área.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../../e2e/helpers.js';

let app, page;
before(async () => { app = await abrirApp(); page = app.page; });
after(async () => { await app.fechar(); });

test('depois de calcular, o cartão principal mostra a área das peças em chapas', async () => {
  await page.evaluate(async () => { window.__pc.state.res = null; await window.__pc.calcular(5, true); });
  const nota = page.locator('#tiles .tile.main #notaMin');
  await nota.waitFor();
  assert.match(await nota.innerText(), /as peças somam [\d,]+ chapas? de área/i);
  const g = await page.evaluate(() => window.__pc.state.res.groups.map((x) => [x.nNovas, x.minNovas]));
  g.forEach(([nov, min]) => assert.ok(nov >= min));
  assert.deepEqual(app.erros, []);
});

test('a barra de progresso continua funcionando com as tentativas', async () => {
  const textos = await page.evaluate(async () => {
    const vistos = new Set(); const el = document.getElementById('progTxt');
    const obs = new MutationObserver(() => { const t = el.textContent.trim(); if (t) vistos.add(t); });
    obs.observe(el, { subtree: true, childList: true, characterData: true });
    window.__pc.state.res = null; await window.__pc.calcular(5, true); obs.disconnect();
    return Array.from(vistos);
  });
  assert.ok(textos.length > 0);
  assert.ok(textos.every((t) => !/undefined|chapa 0 de 0/.test(t)), textos.join(' | '));
});
