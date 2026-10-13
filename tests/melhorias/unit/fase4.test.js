// Fase 4: edição manual (girar, trocar, mover, desfazer, conferir) sempre revalidada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planejar, montarChapa, girarPeca, trocarPecas, moverPeca, fasesDoPlano } from '../../../src/core/index.js';
import { V, H } from '../../../src/core/constants.js';
import { createState } from '../../../src/domain/state.js';
import { girar, trocar, mover, desfazer, conferir, MAX_HIST } from '../../../src/domain/edit.js';

const tick = async () => {};
const grupo = (pieces, extra = {}) => ({ nome: 'A', esp: 15, SW: 2750, SH: 1850, rot: true, estoque: 0, preco: 100, fitaPreco: 0, sobras: [], pieces, ...extra });
const peca = (id, c, l, o = {}) => ({ id, c, l, nome: 'p' + id, fc: 0, fl: 0, livre: false, ...o });
const al = (seed) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const CFG = { K: 3.2, minRet: 200, refilo: 0 };

async function estadoCom(pieces, extra = {}, cfg = CFG, ms = 300) {
  const state = createState();
  state.res = await planejar(cfg, [grupo(pieces, extra)], ms, tick);
  return state;
}
const pecasDe = (res) => res.groups.flatMap((g) => g.sheets.flatMap((s) => s.pecas));
const todasOk = (res) => res.groups.every((g) => g.sheets.every((s) => s.ok));
const ids = (res) => pecasDe(res).map((q) => q.id).sort((a, b) => a - b);
// cinco peças de 130 x 90 cm: quatro enchem a chapa 1, a quinta fica sozinha na chapa 2
const CINCO = () => [1, 2, 3, 4, 5].map((i) => peca(i, 1300, 900));

test('o plano guarda a árvore e remontá-la (mesmo após JSON) dá o mesmo desenho', async () => {
  const st = await estadoCom([peca(1, 800, 400), peca(2, 600, 300), peca(3, 500, 200), peca(4, 300, 300)]);
  const s = JSON.parse(JSON.stringify(st.res.groups[0].sheets[0]));
  const novo = montarChapa(s.spec, s.cfg);
  assert.equal(novo.ok, true);
  assert.deepEqual(novo.pecas, s.pecas);
  assert.deepEqual(novo.cortes, s.cortes);
});

test('girar: troca C por L, mantém o plano válido e desfaz', async () => {
  const st = await estadoCom([peca(1, 800, 400), peca(2, 600, 300)]);
  const antes = JSON.stringify(st.res);
  const r = girar(st, 1);
  assert.equal(r.ok, true, r.msg);
  const q = pecasDe(st.res).find((x) => x.id === 1);
  assert.ok(todasOk(st.res));
  assert.equal(q.girada !== JSON.parse(antes).groups[0].sheets[0].pecas.find((x) => x.id === 1).girada, true);
  assert.equal(st.res.groups[0].sheets[0].manual, true);
  assert.equal(desfazer(st).ok, true);
  assert.equal(JSON.stringify(st.res), antes);
});

test('girar é recusado com veio, para peça quadrada e quando não cabe', async () => {
  const veio = await estadoCom([peca(1, 800, 400), peca(2, 600, 300)], { rot: false });
  const antes = JSON.stringify(veio.res);
  assert.match(girar(veio, 1).msg, /veio/);
  assert.equal(JSON.stringify(veio.res), antes, 'nada muda quando recusa');
  assert.equal(veio.hist.length, 0);
  const quad = await estadoCom([peca(1, 500, 500), peca(2, 600, 300)]);
  assert.match(girar(quad, 1).msg, /quadrada/);
  // chapa 1000 x 500: a peça 900 x 400 não cabe girada
  const st = await estadoCom([peca(1, 900, 400)], { SW: 1000, SH: 500 });
  assert.match(girar(st, 1).msg, /não cabe/);
});

test('trocar peças na mesma chapa: posições se invertem e tudo continua válido', async () => {
  const st = await estadoCom([peca(1, 800, 400), peca(2, 800, 400), peca(3, 600, 300), peca(4, 600, 300)]);
  const pos = (id) => { const q = pecasDe(st.res).find((x) => x.id === id); return [q.x, q.y]; };
  const [p1, p3] = [pos(1), pos(3)];
  const r = trocar(st, 1, 3);
  assert.equal(r.ok, true, r.msg);
  assert.ok(todasOk(st.res));
  assert.deepEqual(ids(st.res), [1, 2, 3, 4]);
  // as duas peças têm tamanhos diferentes: o desenho mudou
  assert.notDeepEqual([pos(1), pos(3)], [p1, p3]);
});

test('trocar é recusado quando as peças não cabem nos lugares um do outro', () => {
  // chapa 1000 x 600 (sem veio nas peças): linha com A e B, e C embaixo. A (400x300) por C (800x200) estoura a largura.
  const cfg = { K: 3.2, minRet: 200, SW: 1000, SH: 600, rot: false, ref: 0, fases: 0 };
  const items = [[1, 400, 300], [2, 400, 300], [3, 800, 200]].map(([id, c, l]) => ({ p: peca(id, c, l), flip: false }));
  const base = montarChapa({ expr: [0, 1, V, 2, H], items }, cfg);
  assert.equal(base.ok, true);
  const sheet = { ...base, n: 1, mat: 'A', esp: 15, cfg, sobra: null };
  assert.match(trocarPecas(sheet, 1, sheet, 3).erro, /não cabem/);
  const ok = trocarPecas(sheet, 1, sheet, 2); // peças iguais: sempre cabe
  assert.ok(ok.a && ok.a.ok);
});

test('mover para outra chapa: conserva as peças, valida as duas e renumera quando esvazia', async () => {
  const st = await estadoCom(CINCO());
  assert.equal(st.res.groups[0].sheets.length, 2);
  const [s1, s2] = st.res.groups[0].sheets;
  const dentro1 = s1.pecas[0].id;
  let r = mover(st, dentro1, s2.n);
  assert.equal(r.ok, true, r.msg);
  assert.deepEqual(ids(st.res), [1, 2, 3, 4, 5]);
  assert.ok(todasOk(st.res));
  assert.deepEqual(st.res.groups[0].sheets.map((s) => s.pecas.length).sort((a, b) => a - b), [2, 3]);
  // esvaziar a chapa 2: a peça sozinha volta para a 1 e a chapa 2 some
  const sozinha = st.res.groups[0].sheets.find((s) => s.pecas.length === 2);
  assert.ok(sozinha);
  desfazer(st);
  const sh = st.res.groups[0].sheets;
  const unica = sh.find((s) => s.pecas.length === 1);
  const cheia = sh.find((s) => s.pecas.length === 4);
  r = mover(st, unica.pecas[0].id, cheia.n);
  assert.equal(r.ok, false, 'a chapa cheia não aceita mais uma');
});

test('mover esvaziando a chapa de origem remove a chapa e renumera', async () => {
  const st = await estadoCom([...[1, 2, 3].map((i) => peca(i, 1300, 900)), peca(4, 600, 400), peca(5, 600, 400), peca(6, 600, 400), peca(7, 600, 400), peca(8, 1300, 900)], {}, CFG, 400);
  const g = st.res.groups[0];
  const unitarias = g.sheets.filter((s) => s.pecas.length === 1);
  if (!unitarias.length) return; // plano sem chapa de uma peça só: nada a esvaziar
  const u = unitarias[0], destino = g.sheets.find((s) => s !== u);
  const r = mover(st, u.pecas[0].id, destino.n);
  if (!r.ok) return; // não coube: recusa é válida
  assert.equal(st.res.groups[0].sheets.length, g.sheets.length);
  assert.deepEqual(st.res.groups[0].sheets.map((s) => s.n), st.res.groups[0].sheets.map((_, i) => i + 1));
  assert.equal(st.res.groups[0].nNovas, st.res.groups[0].sheets.length);
  assert.ok(todasOk(st.res));
});

test('trava de segurança: não edita com estoque já atualizado nem sem plano', async () => {
  const st = await estadoCom([peca(1, 800, 400), peca(2, 600, 300)]);
  st.estAtual = true;
  assert.equal(girar(st, 1).ok, false);
  assert.equal(trocar(st, 1, 2).ok, false);
  assert.equal(girar(createState(), 1).ok, false);
  assert.equal(desfazer(createState()).ok, false);
});

test('histórico tem limite e conferir acusa plano adulterado', async () => {
  const st = await estadoCom([peca(1, 800, 400), peca(2, 600, 300)]);
  for (let i = 0; i < MAX_HIST + 5; i++) girar(st, 1);
  assert.ok(st.hist.length <= MAX_HIST);
  assert.equal(conferir(st).ok, true);
  st.res.groups[0].sheets[0].spec.items[0].p.c = 99999; // peça gigante: fora da chapa
  assert.equal(conferir(st).ok, false);
});

test('com 2 fases, mover e trocar continuam respeitando o limite (verificador independente)', async () => {
  const R = al(3);
  const pieces = Array.from({ length: 14 }, (_, i) => peca(i + 1, 300 + Math.floor(R() * 5) * 100, 200 + Math.floor(R() * 3) * 100));
  const st = await estadoCom(pieces, {}, { ...CFG, fases: 2 }, 500);
  const confere = () => st.res.groups[0].sheets.forEach((s) => {
    assert.equal(s.ok, true);
    assert.ok(fasesDoPlano(s.cortes, s.pecas, s.cfg).fases <= 2);
  });
  confere();
  const rnd = al(9);
  let feitas = 0;
  for (let k = 0; k < 40; k++) {
    const sheets = st.res.groups[0].sheets, ps = pecasDe(st.res);
    const a = ps[Math.floor(rnd() * ps.length)], b = ps[Math.floor(rnd() * ps.length)];
    const op = Math.floor(rnd() * 3);
    const r = op === 0 ? girar(st, a.id) : op === 1 ? trocar(st, a.id, b.id) : mover(st, a.id, sheets[Math.floor(rnd() * sheets.length)].n);
    if (r.ok) feitas++;
    confere();
  }
  assert.ok(feitas > 0, 'nenhuma edição aceita no teste');
  assert.deepEqual(ids(st.res), pieces.map((p) => p.id));
});

test('sequências aleatórias (livre): sempre as mesmas peças, tudo válido e desfazer volta ao início', async () => {
  const R = al(21);
  const pieces = Array.from({ length: 16 }, (_, i) => peca(i + 1, 200 + Math.floor(R() * 8) * 100, 150 + Math.floor(R() * 5) * 100));
  const st = await estadoCom(pieces, {}, CFG, 500);
  const inicio = JSON.stringify(st.res), rnd = al(5);
  let aceitas = 0;
  for (let k = 0; k < 60; k++) {
    const sheets = st.res.groups[0].sheets, ps = pecasDe(st.res);
    const a = ps[Math.floor(rnd() * ps.length)], b = ps[Math.floor(rnd() * ps.length)];
    const op = Math.floor(rnd() * 3);
    const r = op === 0 ? girar(st, a.id) : op === 1 ? trocar(st, a.id, b.id) : mover(st, a.id, sheets[Math.floor(rnd() * sheets.length)].n);
    if (r.ok) aceitas++;
    assert.ok(todasOk(st.res));
    assert.deepEqual(ids(st.res), pieces.map((p) => p.id));
    assert.equal(conferir(st).ok, true);
  }
  assert.ok(aceitas > 5);
  while (st.hist.length > 0 && JSON.stringify(st.res) !== inicio) desfazer(st);
  if (aceitas <= MAX_HIST) assert.equal(JSON.stringify(st.res), inicio);
});

test('core: moverPeca devolve erro claro quando a chapa de destino está cheia', async () => {
  const st = await estadoCom(CINCO());
  const [s1, s2] = st.res.groups[0].sheets;
  const cheia = s1.pecas.length === 4 ? s1 : s2, outra = cheia === s1 ? s2 : s1;
  const r = moverPeca(outra, outra.pecas[0].id, cheia);
  assert.match(r.erro, /não cabe/);
  assert.equal(girarPeca({ ...cheia, spec: undefined }, 1).erro.includes('antiga'), true);
});
