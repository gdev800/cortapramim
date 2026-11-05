// Fase 5: todos os retalhos aparecem na chapa ampliada e podem ser guardados como sobra, sem mexer no resto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planejar, sheetSVG, PAL_SCREEN } from '../../../src/core/index.js';
import { createState } from '../../../src/domain/state.js';
import { retalhosDaChapa, guardarRetalho, pendEstoque } from '../../../src/domain/scraps.js';

const tick = async () => {};
const peca = (id, c, l) => ({ id, c, l, nome: 'p' + id, fc: 0, fl: 0, livre: false });
const grupo = (pieces) => ({ nome: 'A', esp: 15, SW: 2750, SH: 1850, rot: true, estoque: 0, preco: 100, fitaPreco: 0, sobras: [], pieces });
const fu = (v) => String(Math.round(v / 10));

async function estado() {
  const state = createState();
  state.proj = { nome: 'Teste' };
  // 2700 x 1800 em chapa 2750 x 1850: sobram tiras de ~50 mm, abaixo do mínimo útil (200)
  state.res = await planejar({ K: 3.2, minRet: 200, refilo: 0 }, [grupo([peca(1, 2700, 1800)])], 200, tick);
  return state;
}

test('retalhos pequenos entram na lista, mas não são "úteis" pelo critério antigo', async () => {
  const st = await estado(); const s = st.res.groups[0].sheets[0];
  const l = retalhosDaChapa(s);
  assert.ok(l.length >= 1);
  assert.ok(l.some((r) => !r.util));
  assert.ok(l.every((r) => Math.min(r.w, r.h) >= 10));
});

test('desenho padrão não muda; com todos:true aparecem os pequenos', async () => {
  const st = await estado(); const s = st.res.groups[0].sheets[0];
  const base = sheetSVG(s, PAL_SCREEN, { fu, un: 'cm', header: false }, 1).svg;
  const amp = sheetSVG(s, PAL_SCREEN, { fu, un: 'cm', header: false, todos: true }, 1).svg;
  assert.ok(!base.includes('data-resto'));
  assert.ok(amp.includes('data-resto'));
  assert.equal(base, sheetSVG(s, PAL_SCREEN, { fu, un: 'cm', header: false, todos: false }, 1).svg);
});

test('guardar um retalho pequeno entra no estoque, não duplica e não repete no "Atualizar estoque"', async () => {
  const st = await estado(); const s = st.res.groups[0].sheets[0];
  const alvo = retalhosDaChapa(s).find((r) => !r.util);
  const antes = pendEstoque(st).novos.length;
  const r = guardarRetalho(st, s.n, alvo.i);
  assert.equal(r.ok, true);
  assert.equal(st.estoque.length, 1);
  assert.ok(st.estoque[0].id);
  assert.equal(st.estoque[0].esp, 15);
  assert.equal(guardarRetalho(st, s.n, alvo.i).ok, false);
  assert.equal(st.estoque.length, 1);
  assert.equal(pendEstoque(st).novos.length, antes); // o pequeno nunca contou como útil
});

test('guardar um retalho útil e depois atualizar o estoque não duplica', async () => {
  const st = createState(); st.proj = { nome: 'T' };
  st.res = await planejar({ K: 3.2, minRet: 200, refilo: 0 }, [grupo([peca(1, 1000, 1000)])], 200, tick);
  const s = st.res.groups[0].sheets[0];
  const util = retalhosDaChapa(s).filter((r) => r.util);
  assert.ok(util.length >= 1);
  const antes = pendEstoque(st).novos.length;
  guardarRetalho(st, s.n, util[0].i);
  assert.equal(pendEstoque(st).novos.length, antes - 1);
});

test('chapa inexistente e índice inválido são recusados', async () => {
  const st = await estado();
  assert.equal(guardarRetalho(st, 999, 0).ok, false);
  assert.equal(guardarRetalho(st, st.res.groups[0].sheets[0].n, 999).ok, false);
});
