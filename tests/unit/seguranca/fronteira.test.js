// Fronteira de entrada (src/domain/sanitize.js): tudo que vem de fora chega ao estado com tipo certo e tamanho limitado.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  texto, textoLongo, campoNumero, numero, idSeguro, limparProfundo, sanitizarSnapshot, sanitizarPlano, sanitizarProjeto,
  sanitizarSobra, sanitizarInsumo, sanitizarMovimento, sanitizarHistorico, tipoDeArquivoDeLista,
} from '../../../src/domain/sanitize.js';
import { LIM, MAX_CHAPAS } from '../../../src/domain/limites.js';
import { pIn, money } from '../../../src/domain/units.js';
import { lerPacote, montarPacote, APP_ID } from '../../../src/domain/backup.js';
import { createState } from '../../../src/domain/state.js';
import { restore, snapshot, EXEMPLO } from '../../../src/domain/snapshot.js';

const XSS = '"><img src=x onerror=alert(1)>';

test('texto: tira controle e marcas de direção, corta no limite, recusa objeto', () => {
  assert.equal(texto('Lat\u0000eral‮'), 'Lateral');
  assert.equal(texto('a\tb\nc'), 'a b c');
  assert.equal(texto('x'.repeat(500)).length, LIM.nome);
  assert.equal(texto({ toString: () => XSS }), '');
  assert.equal(texto(null), '');
  assert.equal(textoLongo('linha 1\r\nlinha 2'), 'linha 1\nlinha 2');
});

test('texto não escapa HTML: isso é papel do esc() na hora de mostrar', () => {
  assert.equal(texto(XSS), XSS);
});

test('campoNumero: só número digitado passa', () => {
  assert.equal(campoNumero('88,6'), '88,6');
  assert.equal(campoNumero(' 12 '), ' 12 ');
  assert.equal(campoNumero(15), '15');
  assert.equal(campoNumero(''), '');
  assert.equal(campoNumero('15' + XSS), '');
  assert.equal(campoNumero(Infinity), '');
  assert.equal(campoNumero('1e3'), '');
});

test('pIn: só decimal simples (sem Infinity, notação científica ou hexadecimal)', () => {
  assert.equal(pIn('54,3'), 54.3);
  assert.equal(pIn('54.3'), 54.3);
  assert.equal(pIn('.5'), 0.5);
  assert.equal(pIn('-5'), -5);
  assert.equal(pIn(12), 12);
  for (const v of ['Infinity', '1e309', '1e3', '0x10', '', '  ', 'abc', '5' + XSS, null, NaN, Infinity]) assert.ok(Number.isNaN(pIn(v)), String(v));
});

test('money nunca devolve texto cru', () => {
  assert.equal(money(XSS), money(0));
  assert.match(money(12.5), /12,50/);
});

test('numero e idSeguro', () => {
  assert.equal(numero('10', { min: 0, max: 100 }), 10);
  assert.equal(numero('200', { min: 0, max: 100, def: -1 }), -1);
  assert.equal(numero('', { def: 7 }), 7);
  assert.equal(idSeguro('s1a2b'), 's1a2b');
  assert.equal(idSeguro('e0.5123'), 'e0.5123');   // formato antigo (Math.random)
  assert.equal(idSeguro(123), '123');
  assert.equal(idSeguro('a"><b'), null);
  assert.equal(idSeguro('x'.repeat(65)), null);
});

test('limparProfundo: sem __proto__, sem Infinity, com limite de tamanho', () => {
  const sujo = JSON.parse('{"a":1,"__proto__":{"poluido":true},"b":{"constructor":{"prototype":{"x":1}},"c":"ok"}}');
  const o = limparProfundo(sujo);
  assert.deepEqual(o, { a: 1, b: { c: 'ok' } });
  assert.equal({}.poluido, undefined);
  assert.equal(limparProfundo({ n: Infinity }).n, 0);
  assert.equal(limparProfundo(Array.from({ length: 20 }, () => [1, 2, 3]), { maxNos: 10 }), null);
});

test('sanitizarSnapshot: campos de número só com número, listas limitadas, unidade e status conhecidos', () => {
  const d = sanitizarSnapshot({
    unit: 'pol', status: 'roubado', nome: XSS,
    aj: { K: '3,2' + XSS, repetir: 'false', invasor: '1' },
    blocks: [{ nome: XSS, esp: '15', sw: XSS, sh: '185', rows: [{ q: '2' + XSS, c: '220', l: '55', n: XSS, fc: '9' }] }],
    ferr: [{ n: XSS, q: XSS, p: '3,50' }], prop: { cliente: XSS, valor: XSS, mostrarMat: 'sim' },
  });
  assert.equal(d.unit, 'cm');
  assert.equal(d.status, 'orcado');
  assert.equal(d.nome, XSS);                  // texto continua texto (a tela escapa)
  assert.equal(d.aj.K, '');
  assert.equal(d.aj.repetir, false);
  assert.equal('invasor' in d.aj, false);
  const b = d.blocks[0];
  assert.equal(b.sw, undefined);              // vazio: newBlock usa o tamanho padrão
  assert.equal(b.rows[0].q, '');
  assert.equal(b.rows[0].fc, '0');
  assert.equal(d.ferr[0].q, '');
  assert.equal(d.ferr[0].p, '3,50');
  assert.equal(d.prop.valor, '');
  assert.equal(d.prop.mostrarMat, false);
  assert.equal(sanitizarSnapshot({ blocks: Array.from({ length: 500 }, () => ({})) }).blocks.length, MAX_CHAPAS);
});

test('sanitizarPlano: número no lugar de número, texto só nos campos de texto', () => {
  const res = sanitizarPlano({
    groups: [{ mat: XSS, esp: '15', nNovas: XSS, sheets: [{ n: '<script>', mat: 'MDF', pecas: [{ id: 'a"b', nome: XSS, c: '100', x: 'onerror=1' }], cortes: [{ tipo: 'V', pos: 10 }] }] }],
  });
  const g = res.groups[0], s = g.sheets[0];
  assert.equal(g.mat, XSS);
  assert.equal(g.esp, 15);
  assert.equal(g.nNovas, '');
  assert.equal(s.n, '');
  assert.equal(s.pecas[0].id, '');
  assert.equal(s.pecas[0].nome, XSS);
  assert.equal(s.pecas[0].c, 100);
  assert.equal(s.pecas[0].x, '');             // texto onde deveria haver número some
  assert.equal(s.cortes[0].tipo, 'V');
  assert.equal(sanitizarPlano({ groups: [] }), null);
  assert.equal(sanitizarPlano({ groups: 'x' }), null);
});

test('restore aceita o que o próprio app gravou sem perder nada', () => {
  const a = createState(); restore(a, EXEMPLO);
  const foto = snapshot(a);
  const b = createState(); restore(b, JSON.parse(JSON.stringify(foto)));
  const sem = (s) => JSON.stringify(snapshot(s).blocks.map((x) => ({ ...x, uid: 0, rows: x.rows.map((r) => ({ ...r, uid: 0 })) })));
  assert.equal(sem(b), sem(a));
  assert.deepEqual(snapshot(b).ferr.map((f) => f.n), snapshot(a).ferr.map((f) => f.n));
});

test('sanitizarSobra: espessura e medidas viram número; sem medida, descarta', () => {
  const s = sanitizarSobra({ id: 's1', nome: XSS, esp: '15' + XSS, c: 500, l: '400', veio: 'sim', obs: 'x'.repeat(900) });
  assert.equal(s.esp, 0);
  assert.equal(s.l, 400);
  assert.equal(s.veio, false);
  assert.equal(s.obs.length, LIM.obs);
  assert.equal(sanitizarSobra({ id: 's1', c: XSS, l: 1 }), null);
  assert.equal(sanitizarSobra({ id: 's1', c: 0, l: 1 }), null);
  assert.equal(sanitizarSobra({ id: 's1', c: 1e9, l: 1 }), null);
  assert.equal(sanitizarSobra({ id: '"><', c: 1, l: 1 }), null);
});

test('sanitizarInsumo: tipo conhecido, quantidade válida, chapa com medidas', () => {
  assert.equal(sanitizarInsumo({ id: 'i1', tipo: 'ferragem', nome: 'Dobradiça', q: 3 }), null);
  assert.equal(sanitizarInsumo({ id: 'i1', tipo: 'ferr', nome: 'Dobradiça', q: -1 }), null);
  assert.equal(sanitizarInsumo({ id: 'i1', tipo: 'chapa', nome: 'Branco', q: 2, esp: 15 }), null);
  const ok = sanitizarInsumo({ id: 'i1', tipo: 'ferr', nome: 'Dobradiça', q: '8', min: 'abc', un: 'un' + XSS });
  assert.equal(ok.q, 8);
  assert.equal('min' in ok, false);
  assert.equal(ok.un.length <= LIM.unidade, true);
});

test('sanitizarMovimento e histórico (inclusive a foto do desfazer)', () => {
  assert.equal(sanitizarMovimento({ id: 'm1', tipo: 'roubo', data: new Date().toISOString() }), null);
  assert.equal(sanitizarMovimento({ id: 'm1', tipo: 'saida', data: 'ontem' }), null);
  const [m] = sanitizarHistorico([{ id: 'm1', tipo: 'entrada', data: '2026-11-01T10:00:00Z', item: XSS, qtd: Infinity,
    desfazer: { estoque: [{ id: 's1', c: 1, l: 1, esp: XSS }, { id: 's2', c: XSS, l: 1 }], insumos: [{ id: 'x', tipo: 'nada' }] } }]);
  assert.equal(m.qtd, 0);
  assert.equal(m.desfazer.estoque.length, 1);
  assert.equal(m.desfazer.estoque[0].esp, 0);
  assert.equal(m.desfazer.insumos.length, 0);
});

test('sanitizarProjeto: precisa de id e de chapas', () => {
  assert.equal(sanitizarProjeto({ id: 'p1' }), null);
  assert.equal(sanitizarProjeto({ id: '"><', blocks: [] }), null);
  const p = sanitizarProjeto({ id: 'p1', nome: XSS, blocks: [{}], valor: XSS, atualizado: 'ontem' });
  assert.equal(p.valor, 0);
  assert.equal(p.atualizado, 0);
});

test('backup: limite de tamanho, formato e ida e volta sem perda', () => {
  assert.ok(lerPacote('x'.repeat(21 * 1024 * 1024)).erro);
  assert.ok(lerPacote('[1,2]').erro);
  assert.ok(lerPacote('{"app":"outro","projetos":[]}').erro);
  const st = createState(); restore(st, EXEMPLO); st.proj = { id: 'p1', nome: 'Cozinha' };
  st.estoque = [{ id: 's1', nome: 'Branco', esp: 15, c: 800, l: 400, veio: false, obs: '' }];
  st.insumos = [{ id: 'i1', tipo: 'ferr', nome: 'Dobradiça', q: 8 }];
  const r = lerPacote(JSON.stringify(montarPacote(st)));
  assert.equal(r.d.app, APP_ID);
  assert.deepEqual(r.d.estoque, st.estoque);
  assert.deepEqual(r.d.insumos, st.insumos);
  assert.equal(r.d.atual.id, 'p1');
});

test('backup com __proto__ não polui objetos do app', () => {
  const txt = '{"app":"plano-corte-mdf","projetos":[{"id":"p1","blocks":[{}],"__proto__":{"admin":true}}],"__proto__":{"admin":true}}';
  const r = lerPacote(txt);
  assert.equal(r.d.projetos.length, 1);
  assert.equal({}.admin, undefined);
  assert.equal(r.d.projetos[0].admin, undefined);
});

test('arquivo de lista: .xls recusado com orientação, tamanho limitado', () => {
  assert.match(tipoDeArquivoDeLista({ name: 'lista.xls', size: 10 }).erro, /xlsx/);
  assert.equal(tipoDeArquivoDeLista({ name: 'lista.xlsx', size: 10 }).tipo, 'xlsx');
  assert.ok(tipoDeArquivoDeLista({ name: 'lista.xlsx', size: 6 * 1024 * 1024 }).erro);
  assert.equal(tipoDeArquivoDeLista({ name: 'lista.csv', size: 1000 }).tipo, 'texto');
  assert.ok(tipoDeArquivoDeLista({ name: 'lista.csv', size: 3 * 1024 * 1024 }).erro);
});
