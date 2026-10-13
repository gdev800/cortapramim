// Fase 3 no navegador: escolher fases de corte nos Ajustes e ver o resultado respeitar o limite.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../../e2e/helpers.js';

let app, page;
before(async () => { app = await abrirApp(); page = app.page; });
after(async () => { await app.fechar(); });

const escolher = (v) => page.evaluate((x) => { const e = document.getElementById('ajFases'); e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); }, v);
const calcular = () => page.evaluate(async () => { window.__pc.state.res = null; await window.__pc.calcular(5, true); });

test('campo de fases existe, começa em livre e vai para os ajustes salvos', async () => {
  assert.equal(await page.inputValue('#ajFases'), '0');
  await escolher('2');
  assert.equal(await page.evaluate(() => window.__pc.state.aj.fases), '2');
});

test('2 fases: toda chapa respeita o limite e a tela mostra Fases e a coluna Fase', async () => {
  await calcular();
  const r = await page.evaluate(() => window.__pc.state.res.groups.flatMap((g) => g.sheets.map((s) => ({ ok: s.ok, fases: s.fases, maxFase: Math.max(...s.cortes.map((c) => c.fase || 0)) }))));
  assert.ok(r.length > 0);
  r.forEach((s) => { assert.equal(s.ok, true); assert.ok(s.fases <= 2 && s.maxFase <= 2); });
  await page.evaluate(() => document.querySelectorAll('#sheets details').forEach((d) => { d.open = true; }));
  const txt = (await page.innerText('#sheets')).toLowerCase();
  assert.ok(txt.includes('fases') && txt.includes('fase'));
});

test('voltando para livre, a coluna Fase some', async () => {
  await escolher('0');
  await calcular();
  await page.evaluate(() => document.querySelectorAll('#sheets details').forEach((d) => { d.open = true; }));
  assert.ok(!(await page.innerText('#sheets')).toLowerCase().includes('fase'));
});

test('sem erros de JS', () => { assert.deepEqual(app.erros, []); });
