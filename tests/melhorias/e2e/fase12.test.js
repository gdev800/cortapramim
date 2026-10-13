// Fase 12: depois de aprovar, os botões baixam os arquivos de verdade num navegador comum (GitHub Pages).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../../e2e/helpers.js';

let app, page;
before(async () => { app = await abrirApp(); page = app.page; await page.click('#btnAprovar'); await page.waitForSelector('#exportBox:not([hidden])'); });
after(async () => { await app.fechar(); });

const baixa = async (sel) => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click(sel)]);
  return d.suggestedFilename();
};

test('PNG da chapa, PDF do plano, etiquetas em PDF e PNG e CSVs baixam', async () => {
  assert.match(await baixa('#exportBox button[data-exp="png"][data-n="1"]'), /^chapa-1-.*\.png$/);
  assert.match(await baixa('#exportBox button[data-exp="pdf"]'), /\.pdf$/);
  assert.match(await baixa('#exportBox button[data-exp="etqpdf"]'), /^etiquetas-.*\.pdf$/);
  assert.match(await baixa('#exportBox button[data-exp="etq"]'), /^etiquetas-.*\.png$/);
  assert.equal(await baixa('#exportBox button[data-exp="cortes"]'), 'lista-de-cortes.csv');
  assert.deepEqual(app.erros, []);
});

test('fora de um quadro não aparece o aviso de download bloqueado', async () => {
  const txt = await page.locator('#exportBox').innerText();
  assert.doesNotMatch(txt, /download direto não está disponível|download for bloqueado/);
  assert.match(await page.locator('#exportBox button[data-exp="png"][data-n="1"] ~ .slot').innerText(), /Baixado: chapa-1/);
});
