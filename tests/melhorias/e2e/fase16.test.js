// Fase 16: estoque mínimo na tela, aviso no Estoque e no resultado, lista de compras com CSV e PDF.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { abrirApp } from '../../e2e/helpers.js';

let app, page, g;
before(async () => {
  app = await abrirApp(); page = app.page;
  await page.evaluate(() => { document.getElementById('sobras').open = true; });
  // a primeira chapa do plano de exemplo, nas medidas da tela
  g = await page.evaluate(() => {
    const s = window.__pc.state, x = s.res.groups[0], ref = x.cfg.ref || 0, f = s.unit === 'cm' ? 10 : 1;
    return { mat: x.mat, esp: String(x.esp), c: String((x.cfg.SW + 2 * ref) / f).replace('.', ','), l: String((x.cfg.SH + 2 * ref) / f).replace('.', ','), novas: x.nNovas };
  });
});
after(async () => { await app.fechar(); });

const baixa = async (sel) => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click(sel)]); return d; };

test('cadastrar chapa com mínimo acima da quantidade avisa no topo do Estoque e no resumo', async () => {
  await page.selectOption('#insTipo', 'chapa');
  await page.fill('#insNome', g.mat); await page.fill('#insEsp', g.esp); await page.fill('#insC', g.c); await page.fill('#insL', g.l);
  await page.fill('#insQ', String(g.novas)); await page.click('#btnIns');
  await page.waitForSelector('#insList input[data-imin]');
  assert.equal(await page.isVisible('#minAviso'), false);
  await page.fill('#insList input[data-imin]', String(g.novas + 2)); await page.press('#insList input[data-imin]', 'Tab');
  await page.waitForSelector('#minAviso:not([hidden])');
  assert.match(await page.innerText('#minAviso'), new RegExp(g.novas + ' chapas?, abaixo do mínimo ' + (g.novas + 2)));
  assert.match(await page.innerText('#estoqueResumo'), /1 abaixo do mínimo/);
  assert.equal(await page.locator('#insList .srow.abaixo-min').count(), 1);
});

test('resultado avisa que o plano deixa a chapa abaixo do mínimo', async () => {
  await page.waitForSelector('#avisoMin:not([hidden])');
  assert.match(await page.innerText('#avisoMin'), /depois deste plano fica 0 chapas, abaixo do mínimo/);
});

test('lista de compras soma plano + mínimo; sem o plano, só o mínimo', async () => {
  const linha = page.locator('#cmpLista tr[data-tipo="chapa"]').first();
  assert.match(await linha.innerText(), new RegExp('\\b' + (g.novas + 2) + ' chapas?\\b'), 'plano pede N, mínimo N+2, tenho N: comprar N+2');
  await page.uncheck('#cmpPlano');
  assert.match(await page.locator('#cmpLista tr[data-tipo="chapa"]').first().innerText(), /\b2 chapas\b/);
  await page.check('#cmpPlano');
});

test('igual ao mínimo não avisa; o mínimo fica guardado depois de recarregar', async () => {
  await page.fill('#insList input[data-imin]', String(g.novas)); await page.press('#insList input[data-imin]', 'Tab');
  await page.waitForSelector('#minAviso', { state: 'hidden' });
  await page.fill('#insList input[data-imin]', String(g.novas + 2)); await page.press('#insList input[data-imin]', 'Tab');
  await page.waitForSelector('#minAviso:not([hidden])');
  await page.reload();
  await page.waitForFunction(() => window.__pc && window.__pc.state.insumos.some((x) => x.min > 0));
  await page.evaluate(() => { document.getElementById('sobras').open = true; });
  await page.waitForSelector('#minAviso:not([hidden])');
});

test('CSV e PDF da lista de compras baixam', async () => {
  const csv = await baixa('#btnCmpCsv');
  assert.equal(csv.suggestedFilename(), 'lista-de-compras.csv');
  const txt = await readFile(await csv.path(), 'utf8');
  assert.match(txt, /^﻿Tipo;Item;/); assert.match(txt, /Mínimo/);
  const pdf = await baixa('#btnCmpPdf');
  assert.equal(pdf.suggestedFilename(), 'lista-de-compras.pdf');
  assert.equal((await readFile(await pdf.path())).subarray(0, 4).toString(), '%PDF');
  assert.deepEqual(app.erros, []);
});
