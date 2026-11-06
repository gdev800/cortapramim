// Recomeçar: janela de confirmação, "limpar só o plano", "limpar tudo" mantendo a oficina, e "Desfazer".
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../helpers.js';

const app = await abrirApp();
const { page } = app;
after(async () => { await app.fechar(); });

const estado = () => page.evaluate(() => {
  const s = window.__pc.state;
  return { res: !!s.res, blocos: s.blocks.length, pecas: s.blocks.reduce((n, b) => n + b.rows.filter((r) => r.c || r.l).length, 0), unit: s.unit, K: s.aj.K, refilo: s.aj.refilo,
    marcenaria: s.prop.marcenaria, cliente: s.prop.cliente, aprovado: s.approved, estAtual: s.estAtual,
    painelResultado: !document.getElementById('resultado').hidden, janela: document.getElementById('recDlg').open,
    msg: document.getElementById('msg').textContent, desfazer: !!document.getElementById('recDesfazer') };
});

test('"Recomeçar…" ao lado de Aprovar abre a confirmação; Cancelar não muda nada', async () => {
  const antes = await estado();
  assert.ok(antes.res && antes.painelResultado);
  await page.click('#btnRecomecar');
  assert.equal((await estado()).janela, true);
  const txt = await page.textContent('#recTxt');
  assert.match(txt, /\d+ peças em \d+ chapas/);
  assert.match(txt, /Limpar só o plano/);
  assert.match(txt, /Continuam: a unidade \(cm\)/);
  assert.equal(await page.isVisible('#recPlano'), true);
  await page.click('#recCancela');
  const depois = await estado();
  assert.equal(depois.janela, false);
  assert.equal(depois.res, true);
  assert.equal(depois.pecas, antes.pecas);
});

test('limpar só o plano: some o resultado, ficam as peças; Desfazer traz o plano de volta', async () => {
  const antes = await estado();
  await page.click('#btnRecomecar');
  await page.click('#recPlano');
  let s = await estado();
  assert.equal(s.res, false);
  assert.equal(s.painelResultado, false);
  assert.equal(s.pecas, antes.pecas);
  assert.match(s.msg, /Plano descartado/);
  assert.equal(s.desfazer, true);
  await page.click('#recDesfazer');
  s = await estado();
  assert.equal(s.res, true);
  assert.equal(s.painelResultado, true);
  assert.match(s.msg, /restaurado/);
});

test('limpar tudo mantém unidade, serra, refilo e marcenaria; limpa peças e cliente', async () => {
  await page.evaluate(() => window.__pc.state.prop.marcenaria = 'Marcenaria do Gilmar');
  await page.evaluate(() => window.__pc.state.prop.cliente = 'Dona Maria');
  await page.click('#unMm');
  await page.evaluate(() => { document.getElementById('ajK').closest('details').open = true; });
  await page.fill('#ajK', '4'); await page.dispatchEvent('#ajK', 'input'); await page.dispatchEvent('#ajK', 'change');
  await page.fill('#ajRef', '10'); await page.dispatchEvent('#ajRef', 'input'); await page.dispatchEvent('#ajRef', 'change');
  const antes = await estado();
  assert.equal(antes.unit, 'mm'); assert.equal(String(antes.K), '4');
  // pelo botão antigo, que agora pergunta antes
  await page.click('#btnLimpar');
  assert.equal((await estado()).janela, true);
  assert.match(await page.textContent('#recTxt'), /dados do cliente/);
  await page.click('#recTudo');
  const s = await estado();
  assert.equal(s.res, false);
  assert.equal(s.blocos, 1);
  assert.equal(s.pecas, 0);
  assert.equal(s.cliente, '');
  assert.equal(s.unit, 'mm');
  assert.equal(String(s.K), '4');
  assert.equal(String(s.refilo), '10');
  assert.equal(s.marcenaria, 'Marcenaria do Gilmar');
  assert.equal(await page.inputValue('#ajK'), '4', 'o campo da serra na tela também mantém o valor');
  assert.equal(await page.getAttribute('#unMm', 'aria-pressed'), 'true');
  assert.match(s.msg, /Tudo limpo/);
  // fica gravado: recarregar a página não traz o trabalho antigo
  await page.reload();
  await page.waitForFunction(() => window.__pc && window.__pc.state);
  await page.waitForTimeout(300);
  const r = await estado();
  assert.equal(r.pecas, 0);
  assert.equal(r.unit, 'mm');
});

test('trabalho vazio: avisa e não abre a janela', async () => {
  // centraliza o botão: o botão flutuante "Editar peças" pode cobrir o fim da lista logo depois de recarregar
  await page.evaluate(() => document.getElementById('btnLimpar').scrollIntoView({ block: 'center' }));
  await page.click('#btnLimpar');
  await page.waitForFunction(() => /nada para limpar/.test(document.getElementById('msg').textContent), null, { timeout: 5000 });
  const s = await estado();
  assert.equal(s.janela, false);
  assert.match(s.msg, /nada para limpar/);
});

test('Desfazer devolve também "aprovado" e "estoque atualizado" (sem isso, a baixa no estoque poderia repetir)', async () => {
  await page.click('#btnExemplo');
  await page.evaluate(() => window.__pc.calcular(1, true));
  await page.waitForFunction(() => window.__pc.state.res);
  await page.evaluate(() => { const s = window.__pc.state; s.approved = true; s.estAtual = true; });
  await page.click('#btnRecomecar');
  assert.match(await page.textContent('#recTxt'), /aprovado/);
  assert.match(await page.textContent('#recTxt'), /estoque já foi atualizado/);
  await page.click('#recTudo');
  let s = await estado();
  assert.equal(s.aprovado, false); assert.equal(s.estAtual, false);
  await page.click('#recDesfazer');
  s = await estado();
  assert.equal(s.res, true);
  assert.equal(s.aprovado, true);
  assert.equal(s.estAtual, true);
  assert.deepEqual(app.erros, []);
});

test('"Novo" dos projetos: limpa sem janela, mantém unidade e serra, e oferece Desfazer', async () => {
  await page.evaluate(() => { window.__pc.state.prop.cliente = 'Seu João'; });
  const antes = await estado();
  assert.ok(antes.pecas > 0);
  await page.evaluate(() => document.getElementById('btnNovoProj').scrollIntoView({ block: 'center' }));
  await page.click('#btnNovoProj');
  let s = await estado();
  assert.equal(s.janela, false);
  assert.equal(s.pecas, 0);
  assert.equal(s.cliente, '');
  assert.equal(s.unit, antes.unit);
  assert.equal(String(s.K), String(antes.K));
  assert.equal(s.desfazer, true);
  await page.click('#recDesfazer');
  s = await estado();
  assert.equal(s.pecas, antes.pecas);
  assert.equal(s.cliente, 'Seu João');
  assert.deepEqual(app.erros, []);
});
