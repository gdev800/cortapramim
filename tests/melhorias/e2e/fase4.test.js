// Fase 4 no navegador: editar o plano à mão (girar, mover, trocar), desfazer e conferir.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../../e2e/helpers.js';

let app, page;
before(async () => { app = await abrirApp(); page = app.page; });
after(async () => { await app.fechar(); });

const calcular = () => page.evaluate(async () => { window.__pc.state.res = null; await window.__pc.calcular(5, true); });
const resumo = () => page.evaluate(() => window.__pc.state.res.groups[0].sheets.map((s) => s.pecas.map((q) => q.id).sort((a, b) => a - b)));
const abrirEditores = () => page.evaluate(() => document.querySelectorAll('#sheets details.ed').forEach((d) => { d.open = true; }));

test('projeto de 5 peças em 2 chapas, com o painel de edição visível', async () => {
  await page.evaluate(() => {
    const s = window.__pc.state; s.unit = 'cm'; s.blocks = [s.blocks[0]];
    Object.assign(s.blocks[0], { nome: 'MDF Branco', esp: '15', sw: '275', sh: '185', veio: false, preco: '300', mode: 'paste', paste: '5 = 130 x 90 = Painel', origem: '' });
  });
  await calcular();
  const ch = await resumo();
  assert.equal(ch.length, 2);
  assert.equal(await page.isVisible('#editBar'), true);
  assert.equal(await page.isDisabled('#btnDesfazer'), true);
  await abrirEditores();
  assert.ok(await page.isVisible('#sheets details.ed table'));
});

test('girar uma peça: aplica, liga o Desfazer e desfazer restaura', async () => {
  const antes = await page.evaluate(() => JSON.stringify(window.__pc.state.res.groups[0].sheets.map((s) => s.pecas.map((q) => [q.id, q.girada]))));
  await abrirEditores();
  await page.click('#sheets button[data-ed="girar"][data-id="1"]');
  assert.match(await page.innerText('#editMsg'), /girada|não cabe/i);
  const depois = await page.evaluate(() => JSON.stringify(window.__pc.state.res.groups[0].sheets.map((s) => s.pecas.map((q) => [q.id, q.girada]))));
  if (depois !== antes) {
    assert.equal(await page.isDisabled('#btnDesfazer'), false);
    await page.click('#btnDesfazer');
    const volta = await page.evaluate(() => JSON.stringify(window.__pc.state.res.groups[0].sheets.map((s) => s.pecas.map((q) => [q.id, q.girada]))));
    assert.equal(volta, antes);
  }
});

test('mover uma peça para a outra chapa mantém as 5 peças; mover para chapa cheia é recusado', async () => {
  await abrirEditores();
  const info = await page.evaluate(() => window.__pc.state.res.groups[0].sheets.map((s) => ({ n: s.n, ids: s.pecas.map((q) => q.id) })));
  const cheia = info.find((s) => s.ids.length === 4), sozinha = info.find((s) => s.ids.length === 1);
  // da cheia para a sozinha: cabe
  await page.selectOption('#sheets select[data-ed="mover"][data-id="' + cheia.ids[0] + '"]', String(sozinha.n));
  assert.match(await page.innerText('#editMsg'), /movida/i);
  const ch = await resumo();
  assert.equal(ch.flat().length, 5);
  assert.deepEqual(ch.map((x) => x.length).sort(), [2, 3]);
  await page.click('#btnDesfazer');
  assert.deepEqual((await resumo()).map((x) => x.length).sort(), [1, 4]);
  // da sozinha para a cheia: não cabe, nada muda
  await abrirEditores();
  await page.selectOption('#sheets select[data-ed="mover"][data-id="' + sozinha.ids[0] + '"]', String(cheia.n));
  assert.match(await page.innerText('#editMsg'), /não cabe/i);
  assert.deepEqual((await resumo()).map((x) => x.length).sort(), [1, 4]);
});

test('trocar duas peças iguais e conferir o plano', async () => {
  await abrirEditores();
  const ids = await page.evaluate(() => window.__pc.state.res.groups[0].sheets.flatMap((s) => s.pecas.map((q) => q.id)));
  await page.selectOption('#sheets details.ed >> nth=0 >> [data-ed-a]', String(ids[0]));
  await page.selectOption('#sheets details.ed >> nth=0 >> [data-ed-b]', String(ids[1]));
  await page.click('#sheets details.ed >> nth=0 >> button[data-ed="trocar"]');
  assert.match(await page.innerText('#editMsg'), /trocadas/i);
  await page.click('#btnConferir');
  assert.match(await page.innerText('#editMsg'), /conferido/i);
});

test('editar tira a aprovação do plano; calcular de novo zera o histórico', async () => {
  await page.evaluate(() => { window.__pc.state.approved = true; });
  await abrirEditores();
  const sozinha = await page.evaluate(() => window.__pc.state.res.groups[0].sheets.find((s) => s.pecas.length === 1).pecas[0].id);
  await page.click('#sheets button[data-ed="girar"][data-id="' + sozinha + '"]');
  const ap = await page.evaluate(() => window.__pc.state.approved);
  assert.equal(ap, false);
  await calcular();
  assert.equal(await page.evaluate(() => window.__pc.state.hist.length), 0);
  assert.equal(await page.isDisabled('#btnDesfazer'), true);
});

test('sem erros de JS', () => { assert.deepEqual(app.erros, []); });
