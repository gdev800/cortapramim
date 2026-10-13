import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './helpers.js';

let app, page;
before(async () => { app = await abrirApp(); page = app.page; });
after(async () => { await app.fechar(); });

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

test('abre com o exemplo já calculado e sem erros', async () => {
  const r = await page.evaluate(() => ({ res: !!window.__pc.state.res, tiles: document.getElementById('tiles').children.length, hidden: document.getElementById('resultado').hidden }));
  assert.equal(r.res, true); assert.ok(r.tiles >= 4); assert.equal(r.hidden, false);
  assert.deepEqual(app.erros, []);
});

test('troca de unidade converte e volta', async () => {
  const r = await page.evaluate(async () => {
    const s = window.__pc.state, antes = JSON.stringify(s.blocks.map((b) => b.rows));
    document.getElementById('unMm').click(); const mm = s.unit;
    document.getElementById('unCm').click();
    return { mm, volta: JSON.stringify(s.blocks.map((b) => b.rows)) === antes, un: s.unit };
  });
  assert.equal(r.mm, 'mm'); assert.equal(r.un, 'cm'); assert.equal(r.volta, true);
});

test('limites de entrada: quantidade absurda vira erro, não trava', async () => {
  const msg = await page.evaluate(async () => {
    const s = window.__pc.state; s.blocks[0].mode = 'paste'; s.blocks[0].paste = '1000000000 = 10 x 10';
    await window.__pc.calcular(); return document.getElementById('msg').textContent;
  });
  assert.match(msg, /grande demais/);
});

test('peça maior que a chapa: mensagem clara', async () => {
  const msg = await page.evaluate(async () => {
    window.__pc.state.blocks[0].paste = '1 = 3000 x 20 = gigante'; await window.__pc.calcular(); return document.getElementById('msg').textContent;
  });
  assert.match(msg, /não cabe na chapa/);
});

test('veio: botão "deixar girar" resolve e calcula', async () => {
  const r = await page.evaluate(async () => {
    const s = window.__pc.state; s.blocks[0].veio = true; s.blocks[0].paste = '1 = 180 x 250 = Painel';
    await window.__pc.calcular();
    const tinha = !!document.getElementById('btnLivre');
    document.getElementById('btnLivre').click();
    for (let i = 0; i < 100 && (s.running || !/Plano pronto/.test(document.getElementById('msg').textContent)); i++) await new Promise((r) => setTimeout(r, 300));
    return { tinha, paste: s.blocks[0].paste, msg: document.getElementById('msg').textContent };
  });
  assert.equal(r.tinha, true); assert.match(r.paste, /livre/); assert.match(r.msg, /Plano pronto/);
});

test('texto malicioso não executa', async () => {
  const r = await page.evaluate(async () => {
    const s = window.__pc.state; s.blocks[0].mode = 'paste'; s.blocks[0].nome = '<img src=x onerror="window.__xss=1">';
    s.blocks[0].veio = false; s.blocks[0].paste = '1 = 100 x 50 = <script>window.__xss=1</script>';
    await window.__pc.calcular(); await new Promise((r) => setTimeout(r, 300));
    return { xss: window.__xss || 0, imgs: document.querySelectorAll('img[src="x"]').length };
  });
  assert.equal(r.xss, 0); assert.equal(r.imgs, 0);
});

test('insumos: cadastro valida e aparece na lista de compras', async () => {
  const r = await page.evaluate(async () => {
    const $ = (id) => document.getElementById(id);
    $('insNome').value = 'Fita X'; $('insQ').value = '1e400'; $('btnIns').click(); const erro = $('insMsg').textContent;
    $('insNome').value = 'Fita X'; $('insQ').value = '20'; $('btnIns').click();
    return { erro, lista: $('insList').textContent };
  });
  assert.match(r.erro, /quantidade/i); assert.match(r.lista, /Fita X/);
});

test('aprovar libera exportações e atualiza o estoque', async () => {
  const r = await page.evaluate(async () => {
    const $ = (id) => document.getElementById(id), s = window.__pc.state;
    s.blocks[0].paste = '2 = 800 x 400 = Porta ; fita 2C 1L\n1 = 600 x 300 = Tampo';
    await window.__pc.calcular(3, true);
    $('btnAprovar').click();
    const botoes = $('exportBox').querySelectorAll('button[data-exp]').length;
    const antes = s.estoque.length; $('btnEstoque').click(); await new Promise((r) => setTimeout(r, 500));
    return { aprovado: s.approved, botoes, antes, depois: s.estoque.length, atual: s.estAtual };
  });
  assert.equal(r.aprovado, true); assert.ok(r.botoes >= 6); assert.equal(r.atual, true); assert.ok(r.depois >= r.antes);
});

test('exportações geram saída (png, pdf, etiquetas, csv)', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    for (const k of ['png', 'pdf', 'etqpdf', 'etq', 'cortes', 'pecas']) {
      const bt = document.querySelector('#exportBox button[data-exp="' + k + '"]'); bt.click();
      await new Promise((r) => setTimeout(r, 2500));
      const slot = bt.parentNode.querySelector('.slot'); out[k] = slot.textContent.length + slot.querySelectorAll('img,textarea').length;
    }
    return out;
  });
  Object.entries(r).forEach(([k, v]) => assert.ok(v > 0, k));
});

test('backup inválido é recusado', async () => {
  const msg = await page.evaluate(async () => {
    const s = window.__pc.state; const antes = s.projetos.length;
    const inp = document.getElementById('bkFile') || document.querySelector('input[type=file][accept*=json]');
    return { achou: !!inp, antes };
  });
  assert.ok(msg.achou);
});

test('mobile sem rolagem horizontal', async () => {
  const m = await abrirApp({ viewport: { width: 390, height: 800 } });
  try {
    const r = await m.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    assert.equal(r.sw, r.cw);
    assert.deepEqual(m.erros, []);
  } finally { await m.fechar(); }
});
