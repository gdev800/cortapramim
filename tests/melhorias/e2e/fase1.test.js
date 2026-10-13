// Fase 1 no navegador: campo de fita nos Ajustes, relatório na tela e coluna "Final".
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../../e2e/helpers.js';

let app, page;
before(async () => { app = await abrirApp(); page = app.page; });
after(async () => { await app.fechar(); });

const calcular = () => page.evaluate(async () => { window.__pc.state.res = null; await window.__pc.calcular(5, true); });
const digitar = (v) => page.evaluate((x) => { const e = document.getElementById('ajFita'); e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); }, v);

test('campo de fita existe e começa em 0', async () => {
  assert.equal(await page.inputValue('#ajFita'), '0');
});

test('com fita 0,45: coleta desconta, relatório aparece e a lista ganha a coluna Final', async () => {
  await page.evaluate(() => {
    const s = window.__pc.state; s.unit = 'cm'; s.blocks = [s.blocks[0]];
    Object.assign(s.blocks[0], { nome: 'MDF Branco', esp: '15', sw: '275', sh: '185', veio: false, preco: '300', mode: 'paste', paste: '4 = 80 x 40 = Prateleira ; fita 1C\n2 = 100 x 50 = Porta ; fita 1C 2L' });
  });
  await digitar('0.45');
  assert.equal(await page.evaluate(() => window.__pc.state.aj.fitaEsp), '0.45');
  const p = await page.evaluate(() => window.__pc.coletar().groups[0].pieces.find((x) => x.nome === 'Porta'));
  assert.ok(Math.abs(p.c - 999.1) < 1e-6 && p.cf === 1000);
  await calcular();
  const txt = (await page.innerText('#relat')).toLowerCase();
  for (const e of ['relatório de aproveitamento', 'área de chapa usada', 'aproveitamento da chapa', 'cortes de serra']) assert.ok(txt.includes(e), 'faltou ' + e);
  assert.ok(txt.includes('m²') && txt.includes('%'));
  await page.evaluate(() => document.querySelectorAll('#sheets details').forEach((d) => { d.open = true; }));
  assert.ok((await page.innerText('#sheets')).toLowerCase().includes('final'));
});

test('com fita 0 a coluna Final some', async () => {
  await digitar('0');
  await calcular();
  await page.evaluate(() => document.querySelectorAll('#sheets details').forEach((d) => { d.open = true; }));
  assert.ok(!(await page.innerText('#sheets')).toLowerCase().includes('final'));
});

test('sem erros de JS', () => { assert.deepEqual(app.erros, []); });
