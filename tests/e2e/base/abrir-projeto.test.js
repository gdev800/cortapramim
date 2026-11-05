// Regressão: abrir um projeto salvo com plano mostra o plano DELE (desenho, resumo e compras),
// e não o desenho do trabalho que estava na tela. Erro de corte não tem volta.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../helpers.js';

const app = await abrirApp();
const { page } = app;
after(async () => { await app.fechar(); });

test('abrir projeto salvo redesenha as chapas e o resumo com o plano dele', async () => {
  await page.evaluate(() => {
    const s = window.__pc.state, res = JSON.parse(JSON.stringify(s.res));
    res.groups.forEach((g) => { g.mat = 'Material do Projeto B'; g.sheets.forEach((sh) => { sh.mat = 'Material do Projeto B'; }); });
    s.projetos.push({ id: 'pB', nome: 'Projeto B', blocks: [{ nome: 'Material do Projeto B', rows: [{ q: 1, c: 50, l: 30 }] }], res, atualizado: Date.now() });
    document.getElementById('projList').closest('details').open = true;
    document.querySelector('[data-pf="todos"]').click();
  });
  await page.evaluate(() => document.querySelector('[data-open="pB"]').click());
  await page.waitForTimeout(300);
  const tela = await page.evaluate(() => ({ chapas: document.getElementById('sheets').innerText, compras: document.getElementById('shop').innerText }));
  assert.match(tela.chapas, /Material do Projeto B/);
  assert.doesNotMatch(tela.chapas, /Branco TX Eucatex/);
  assert.match(tela.compras, /Material do Projeto B/);
  assert.deepEqual(app.erros, []);
});
