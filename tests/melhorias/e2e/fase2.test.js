// Fase 2 no navegador: salvar um projeto, abrir outro, juntar e calcular tudo no mesmo plano.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../../e2e/helpers.js';

let app, page;
before(async () => { app = await abrirApp(); page = app.page; });
after(async () => { await app.fechar(); });

const definir = (nome, paste) => page.evaluate(([n, p]) => {
  const s = window.__pc.state; s.unit = 'cm'; s.blocks = [s.blocks[0]];
  Object.assign(s.blocks[0], { nome: 'MDF Branco', esp: '15', sw: '275', sh: '185', veio: false, preco: '300', mode: 'paste', paste: p, origem: '' });
  const e = document.getElementById('projNome'); e.value = n; e.dispatchEvent(new Event('input', { bubbles: true }));
}, [nome, paste]);

test('juntar dois projetos e calcular num plano só', async () => {
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
  await definir('Quarto', '3 = 80 x 40 = Prateleira');
  await page.click('#btnSalvarProj');
  await page.click('#btnNovoProj');
  await definir('Cozinha', '2 = 100 x 50 = Porta');
  await page.click('#projList button[data-join]');
  const st = await page.evaluate(() => ({ n: window.__pc.state.blocks.length, o: window.__pc.state.blocks.map((b) => b.origem) }));
  assert.equal(st.n, 2);
  assert.deepEqual(st.o.sort(), ['Cozinha', 'Quarto']);
  assert.ok((await page.innerText('#blocks')).includes('projeto: Quarto'));

  await page.evaluate(async () => { window.__pc.state.res = null; await window.__pc.calcular(5, true); });
  const r = await page.evaluate(() => ({ grupos: window.__pc.state.res.groups.length, pecas: window.__pc.state.res.groups[0].nPecas }));
  assert.equal(r.grupos, 1); assert.equal(r.pecas, 5);
  const txt = (await page.innerText('#relat')).toLowerCase();
  assert.ok(txt.includes('por projeto') && txt.includes('quarto') && txt.includes('cozinha'));
  await page.evaluate(() => document.querySelectorAll('#sheets details').forEach((d) => { d.open = true; }));
  assert.ok((await page.innerText('#sheets')).toLowerCase().includes('projeto'));
});

test('sem erros de JS', () => { assert.deepEqual(app.erros, []); });
