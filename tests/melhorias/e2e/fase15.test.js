// Fase 15: relatório do mês na tela. Três planos atualizados no mês somam certo; CSV e PDF baixam.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { abrirApp } from '../../e2e/helpers.js';

let app, page;
before(async () => { app = await abrirApp(); page = app.page; await page.evaluate(() => { document.getElementById('sobras').open = true; }); });
after(async () => { await app.fechar(); });

const baixa = async (sel) => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click(sel)]);
  return d;
};
const mesAtual = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };

test('sem saídas: aviso de mês vazio e gráfico com 6 meses', async () => {
  assert.equal(await page.inputValue('#relMes'), mesAtual());
  assert.equal(await page.isVisible('#relVazio'), true);
  assert.equal(await page.locator('#relGrafico .rel-b').count(), 6);
  assert.equal(await page.locator('#relGrafico .rel-b.on').count(), 1);
});

test('três planos atualizados no mês: cartões e tabela somam certo', async () => {
  for (let i = 1; i <= 3; i++) {
    await page.evaluate(async () => { window.__pc.state.res = null; window.__pc.state.estAtual = false; await window.__pc.calcular(3, true); });
    await page.click('#btnAprovar'); await page.click('#btnEstoque');
    await page.waitForFunction((n) => window.__pc.state.historico.filter((m) => m.tipo === 'saida').length === n, i);
  }
  const esperado = await page.evaluate(() => {
    const s = window.__pc.state.historico.filter((m) => m.tipo === 'saida');
    return { pecas: s.reduce((a, m) => a + m.pecas, 0), chapas: s.reduce((a, m) => a + m.chapas.reduce((b, c) => b + c.q, 0), 0) };
  });
  assert.equal(await page.isVisible('#relVazio'), false);
  assert.equal((await page.innerText('#relCards .rel-card[data-k="pecas"] b')).trim(), String(esperado.pecas));
  assert.match(await page.innerText('#relCards .rel-card[data-k="pecas"]'), /3 projetos/);
  assert.equal((await page.innerText('#relCards .rel-card[data-k="chapas"] b')).trim(), String(esperado.chapas));
  assert.match(await page.innerText('#relCards .rel-card[data-k="aprov"] b'), /^\d+(,\d)?%$/);
  assert.ok(await page.locator('#relTabela tbody tr').count() >= 1);
  assert.match(await page.textContent('#relGrafico .rel-b.on title'), new RegExp(': ' + esperado.chapas + '$'));
  assert.deepEqual(app.erros, []);
});

test('trocar o mês e a métrica', async () => {
  await page.fill('#relMes', '2020-01');
  await page.waitForFunction(() => !document.getElementById('relVazio').hidden);
  assert.equal((await page.innerText('#relCards .rel-card[data-k="pecas"] b')).trim(), '0');
  await page.fill('#relMes', mesAtual());
  await page.waitForFunction(() => document.getElementById('relVazio').hidden);
  await page.selectOption('#relMetrica', 'pecas');
  assert.match(await page.getAttribute('#relGrafico svg', 'aria-label'), /Peças cortadas/);
  // clicar numa barra de outro mês escolhe aquele mês
  await page.locator('#relGrafico .rel-b .rel-x').first().click();
  assert.notEqual(await page.inputValue('#relMes'), mesAtual());
  await page.fill('#relMes', mesAtual());
});

test('CSV (com acentos) e PDF baixam', async () => {
  const csv = await baixa('#btnRelCsv');
  assert.equal(csv.suggestedFilename(), 'relatorio-' + mesAtual() + '.csv');
  const txt = await readFile(await csv.path(), 'utf8');
  assert.match(txt, /^﻿Relatório do mês;/);
  assert.match(txt, /Peças cortadas;\d+/);
  const pdf = await baixa('#btnRelPdf');
  assert.equal(pdf.suggestedFilename(), 'relatorio-' + mesAtual() + '.pdf');
  const buf = await readFile(await pdf.path());
  assert.equal(buf.subarray(0, 4).toString(), '%PDF');
  assert.deepEqual(app.erros, []);
});

test('o relatório continua depois de recarregar', async () => {
  await page.reload();
  await page.waitForFunction(() => window.__pc && (window.__pc.state.historico || []).length >= 3);
  await page.waitForFunction(() => document.getElementById('relVazio').hidden);
});
