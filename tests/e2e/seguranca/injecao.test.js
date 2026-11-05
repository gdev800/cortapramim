// Injeção de HTML/script (XSS) por todos os caminhos de entrada: campos da tela, lista colada, planilha .xlsx,
// backup .json adulterado (inclusive o plano calculado) e rascunho guardado no navegador.
//
// Os ataques rodam na versão SEM CSP (a do claude.ai): assim o teste mede o escape de verdade.
// O último teste usa a versão do site e confere que a CSP barra o script mesmo se um escape faltar.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirApp, DIST_ARTEFATO } from '../helpers.js';
import { criarXlsx } from './xlsx-fixture.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const pasta = mkdtempSync(join(tmpdir(), 'cortapramim-xss-'));

// Carga: se executar, registra onde. Cobre texto entre tags e dentro de atributo.
const X = (k) => `"><img src=x onerror="(window.__xss=window.__xss||[]).push('${k}')"><svg onload="(window.__xss=window.__xss||[]).push('${k}:svg')">`;

before(() => { execFileSync(process.execPath, [join(raiz, 'scripts/build.mjs'), '--artefato'], { stdio: 'ignore' }); });

/** Passa por todas as seções para cada painel desenhar com os dados atuais. */
async function percorrerTudo(page) {
  await page.evaluate(() => { document.querySelectorAll('details').forEach((d) => { d.open = true; }); });
  for (const sel of ['nav a', 'nav button', '.dock a', '.dock button']) {
    for (const h of await page.$$(sel)) { try { await h.click({ timeout: 300 }); await page.waitForTimeout(60); } catch (e) { /* oculto */ } }
  }
  await page.evaluate(() => { document.querySelectorAll('details').forEach((d) => { d.open = true; }); });
  await page.waitForTimeout(300);
}

/** O que foi executado e o que entrou cru no DOM (o app tem um único <script>, o próprio). */
const inspecionar = (page) => page.evaluate(() => ({
  executou: [...new Set(window.__xss || [])],
  cru: document.querySelectorAll('img[src="x"], [onerror], [onload], svg[onload]').length,
  scripts: document.querySelectorAll('script').length,
}));

function semInjecao(r, onde) {
  assert.deepEqual(r.executou, [], onde + ': script executou em ' + r.executou.join(', '));
  assert.equal(r.cru, 0, onde + ': HTML injetado entrou cru no DOM');
  assert.equal(r.scripts, 1, onde + ': apareceu <script> a mais');
}

let app;
after(async () => { if (app) await app.fechar(); });

test('campos digitados: carga em todo campo de texto, cálculo e todas as telas', async () => {
  app = await abrirApp({ arquivo: DIST_ARTEFATO });
  const { page } = app;
  page.on('dialog', (d) => d.dismiss());
  await percorrerTudo(page);
  const n = await page.evaluate((carga) => {
    let i = 0;
    for (const el of document.querySelectorAll('input:not([type]), input[type=text], input[type=search], input[type=email], textarea')) {
      if (el.type === 'file' || el.readOnly) continue;
      el.value = carga.replace(/K/g, 'campo' + i++);
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return i;
  }, X('K'));
  assert.ok(n > 40, 'poucos campos encontrados: ' + n);
  await page.evaluate(() => window.__pc.calcular(2, true)).catch(() => {});
  await page.waitForTimeout(2500);
  await percorrerTudo(page);
  semInjecao(await inspecionar(page), 'campos');
  await app.fechar(); app = null;
});

test('lista colada e planilha .xlsx com nomes maliciosos', async () => {
  app = await abrirApp({ arquivo: DIST_ARTEFATO });
  const { page } = app;
  await page.evaluate((nome) => {
    const b = window.__pc.state.blocks[0];
    b.mode = 'paste'; b.paste = '2 = 50 x 30 = ' + nome + '\n1\t40\t20\t' + nome.replace('cola', 'tab');
  }, X('cola'));
  await page.evaluate(() => window.__pc.calcular(2, true));
  await page.waitForTimeout(2500);
  await percorrerTudo(page);
  semInjecao(await inspecionar(page), 'lista colada');

  const arq = join(pasta, 'lista.xlsx');
  writeFileSync(arq, criarXlsx([['Qtde', 'C', 'L', 'Nome'], [2, 50, 30, X('xlsx')], [1, 40, 20, 'Porta']]));
  await page.evaluate(() => { const b = window.__pc.state.blocks[0]; window.__pc.state.fileFor = b.uid; });
  await page.setInputFiles('#fileIn', arq);
  await page.waitForFunction(() => /xlsx/.test(window.__pc.state.blocks[0].paste), null, { timeout: 15000 });
  const lido = await page.evaluate(() => window.__pc.state.blocks[0].paste);
  assert.match(lido, /^2\t50\t30\t/);
  await page.evaluate(() => window.__pc.calcular(2, true));
  await page.waitForTimeout(2500);
  await percorrerTudo(page);
  semInjecao(await inspecionar(page), 'planilha');

  const xls = join(pasta, 'antiga.xls'); writeFileSync(xls, 'nada');
  await page.setInputFiles('#fileIn', xls);
  await page.waitForTimeout(300);
  assert.match(await page.evaluate(() => document.body.innerText), /\.xls \(Excel antigo\) não é lido/);
  await app.fechar(); app = null;
});

test('backup adulterado: textos, números trocados por HTML, plano calculado e __proto__', async () => {
  app = await abrirApp({ arquivo: DIST_ARTEFATO });
  const { page } = app;
  page.on('dialog', (d) => d.accept());
  // parte de um plano real calculado pelo app e troca cada valor por uma carga
  const base = await page.evaluate(() => JSON.parse(JSON.stringify({ blocks: window.__pc.state.blocks, res: window.__pc.state.res })));
  const envenenar = (o, cam) => {
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (k === 'uid') continue;
      if (v && typeof v === 'object') envenenar(v, cam + '.' + k);
      else if (typeof v === 'string' || typeof v === 'number') o[k] = (k === 'id' || k === 'n' || /^[a-z]/i.test(k) ? String(v) : '') + X(cam + '.' + k);
    }
  };
  envenenar(base, 'p');
  const projeto = { id: 'p1', nome: X('proj'), status: X('st'), valor: X('valor'), atualizado: Date.now(), blocks: base.blocks, res: base.res,
    ferr: [{ n: X('ferr'), q: X('ferrq'), p: '2' }], prop: { cliente: X('cliente'), valor: X('pv') }, aj: { K: X('aj') } };
  const pacote = {
    app: 'plano-corte-mdf', versao: 2, projetos: [projeto],
    estoque: [{ id: 's1', nome: X('sobra'), esp: '15' + X('esp'), c: 500, l: 400, veio: false, obs: X('obs') }],
    insumos: [{ id: 'i1', tipo: 'ferr', nome: X('ins'), q: 3, min: 5, un: X('un') }, { id: 'i2', tipo: 'chapa', nome: X('chapa'), esp: 15, c: 2750, l: 1850, q: 1 }],
    historico: [{ id: 'h1', data: '2026-11-01T10:00:00Z', tipo: 'saida', projeto: X('hp'), pecas: X('hpe'), chapas: [{ nome: X('hc'), esp: X('he'), q: X('hq') }] },
      { id: 'h2', data: '2026-11-02T10:00:00Z', tipo: 'entrada', itemTipo: 'sobra', nome: X('hn'), q: 1, obs: X('ho') }],
  };
  const txt = JSON.stringify(pacote).replace('"versao":2', '"versao":2,"__proto__":{"poluido":"sim"}');
  const arq = join(pasta, 'backup.json'); writeFileSync(arq, txt);
  await page.evaluate(() => { document.querySelectorAll('details').forEach((d) => { d.open = true; }); });
  await page.setInputFiles('#bkIn', arq);
  await page.waitForFunction(() => /Backup importado/.test(document.getElementById('bkSlot').textContent), null, { timeout: 10000 });
  await percorrerTudo(page);
  semInjecao(await inspecionar(page), 'backup (listas)');

  // abre o projeto importado: o plano adulterado é desenhado (SVG das chapas, tabelas, resumo)
  await page.evaluate(() => document.querySelector('[data-open="p1"]').click());
  await page.waitForTimeout(800);
  // o desenho das chapas e o resumo redesenham com o plano guardado quando a numeração ou a unidade muda
  await page.evaluate(() => { const n = document.getElementById('ajNum'); if (n) { n.checked = !n.checked; n.dispatchEvent(new Event('change', { bubbles: true })); } });
  await page.waitForTimeout(500);
  await percorrerTudo(page);
  await page.evaluate(() => { const z = document.querySelector('[data-zoom]'); if (z) z.click(); });
  await page.waitForTimeout(300);
  semInjecao(await inspecionar(page), 'backup (projeto aberto)');
  assert.equal(await page.evaluate(() => ({}).poluido), undefined, 'protótipo poluído');

  // e recalcula com os dados importados
  await page.evaluate(() => window.__pc.calcular(2, true)).catch(() => {});
  await page.waitForTimeout(2500);
  await percorrerTudo(page);
  semInjecao(await inspecionar(page), 'backup (recalculado)');
  assert.deepEqual(app.erros, []);
  await app.fechar(); app = null;
});

test('rascunho e listas adulterados no navegador (localStorage)', async () => {
  const rascunho = { unit: 'cm', nome: X('rnome'), blocks: [{ nome: X('rb'), esp: X('resp'), sw: '275', sh: '185', rows: [{ q: '2', c: '50', l: X('rl'), n: X('rn') }, { q: '1', c: '40', l: '20', n: X('rn2') }] }],
    res: { groups: [{ mat: X('rmat'), esp: X('respg'), sheets: [{ n: X('rsn'), cfg: { SW: X('rsw') }, pecas: [] }] }] } };
  app = await abrirApp({
    arquivo: DIST_ARTEFATO,
    antes: (page) => page.addInitScript(([r, sobra]) => {
      if (sessionStorage.getItem('feito')) return; sessionStorage.setItem('feito', '1');
      for (const k of Object.keys(localStorage)) localStorage.removeItem(k);
      localStorage.setItem('plano-mdf-v4', JSON.stringify(r));
      localStorage.setItem('plano-mdf-estoque', JSON.stringify([sobra]));
    }, [rascunho, { id: 's9', nome: X('lsobra'), esp: X('lesp'), c: 600, l: 300 }]),
  }).catch(async (e) => { throw e; });
  const { page } = app;
  await percorrerTudo(page);
  semInjecao(await inspecionar(page), 'rascunho');
  await app.fechar(); app = null;
});

test('valores inválidos nos campos param o cálculo com mensagem clara', async () => {
  app = await abrirApp({ arquivo: DIST_ARTEFATO });
  const { page } = app;
  const tentar = async (campo, valor) => {
    await page.evaluate(([f, v]) => {
      const el = document.querySelector('.blk .nrow [data-f="' + f + '"]');
      el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
    }, [campo, valor]);
    await page.evaluate(() => window.__pc.calcular(1, false)).catch(() => {});
    await page.waitForTimeout(300);
    return page.evaluate(() => window.__pc.coletar().erros);
  };
  assert.ok((await tentar('c', 'abc')).length > 0, 'texto em medida');
  assert.ok((await tentar('c', '-5')).length > 0, 'medida negativa');
  await tentar('c', '99999');
  assert.match(await page.evaluate(() => document.getElementById('msg').textContent), /não cabe/, 'medida maior que a chapa');
  await tentar('c', '50');
  assert.ok((await tentar('q', '2a')).length > 0, 'quantidade com letra');
  assert.equal((await tentar('q', '2')).length, 0, 'valor válido volta a calcular');
  await app.fechar(); app = null;
});

test('site com CSP: script injetado não roda, e a política vem no próprio HTML', async () => {
  app = await abrirApp();
  const { page } = app;
  const csp = await page.evaluate(() => document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || '');
  assert.match(csp, /script-src 'sha256-[A-Za-z0-9+/=]+'/);
  assert.match(csp, /object-src 'none'/);
  assert.doesNotMatch(csp, /unsafe-eval|script-src[^;]*unsafe-inline/);
  // simula um escape esquecido: HTML com evento e <script> entram no DOM, mas o navegador não executa
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.innerHTML = '<img src="data:," onerror="window.__csp=1"><svg onload="window.__csp=2"></svg>';
    document.body.appendChild(d);
    const s = document.createElement('script'); s.textContent = 'window.__csp=3'; document.body.appendChild(s);
  });
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => window.__csp), undefined);
  assert.ok(app.violacoesCsp.length > 0, 'o navegador deveria registrar a violação de CSP');
  // o app continua funcionando normalmente com a CSP ligada
  assert.ok(await page.evaluate(() => window.__pc.state.res.groups.length > 0));
  assert.deepEqual(app.erros, []);
});
