// Fase 11: sobra única (retalho não fica partido), várias tentativas, absorção da última chapa e mínimo pela área.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planejar, montarChapa, minimoChapas } from '../../../src/core/index.js';
import { makeCtx, costOf, reagrupar, realocar } from '../../../src/core/anneal.js';
import { absorverUltima } from '../../../src/core/absorb.js';
import { areaEmChapas } from '../../../src/core/planner.js';
import { mulberry32 } from '../../../src/core/rng.js';
import { V, H } from '../../../src/core/constants.js';
import { resumoMinimo } from '../../../src/domain/minimum.js';

const tick = async () => {};
const agora = () => performance.now();
let id = 0;
const P = (q, c, l, nome = '') => Array.from({ length: q }, () => ({ id: ++id, c, l, nome, fc: 0, fl: 0, livre: false }));
const grupo = (pieces, extra = {}) => ({ nome: 'A', esp: 15, SW: 2750, SH: 1850, rot: true, estoque: 0, preco: 100, fitaPreco: 0, sobras: [], pieces, ...extra });
const ids = (sheets) => sheets.flatMap((s) => s.pecas.map((p) => p.id)).sort((a, b) => a - b);
const uteis = (s) => s.restos.filter((r) => r.util);

// A "chapa 2" do Gabriel: 3 prateleiras, 2 divisórias, 2 portas. Antes saíam dois retalhos (46×90 e 46×40).
const chapa2 = () => { id = 0; return [...P(3, 886, 500, 'Prateleira'), ...P(2, 2200, 450, 'Divisória'), ...P(2, 1100, 400, 'Porta')]; };

for (const fases of [0, 3]) {
  test('chapa 2 (fases ' + (fases || 'livre') + '): a sobra sai num retalho só, maior que os dois de antes juntos', async () => {
    const res = await planejar({ K: 3.2, minRet: 200, refilo: 0, fases }, [grupo(chapa2())], 1500, tick);
    const s = res.groups[0].sheets[0];
    assert.equal(res.groups[0].sheets.length, 1);
    assert.ok(s.ok);
    assert.equal(uteis(s).length, 1, uteis(s).map((r) => Math.round(r.w) + 'x' + Math.round(r.h)).join(' + '));
    assert.ok(uteis(s)[0].w * uteis(s)[0].h >= 598000);
  });
}

test('sobraUnica: false mantém o critério antigo e o plano continua válido', async () => {
  const res = await planejar({ K: 3.2, minRet: 200, refilo: 0, fases: 0, sobraUnica: false, tentativas: false }, [grupo(chapa2())], 800, tick);
  assert.ok(res.groups[0].sheets.every((s) => s.ok));
  assert.equal(res.groups[0].sheets[0].cfg.sobraUnica, false);
});

test('com fases limitadas, a sobra que o otimizador conta é a mesma que a chapa montada mostra', () => {
  const rnd = mulberry32(3); let conferidos = 0;
  for (let caso = 0; caso < 300; caso++) {
    const n = 2 + Math.floor(rnd() * 9), items = [];
    for (let i = 0; i < n; i++) items.push({ p: { id: i + 1, c: 150 + Math.floor(rnd() * 900), l: 100 + Math.floor(rnd() * 600) }, flip: false });
    let e = [0]; for (let i = 1; i < n; i++) { e.push(i); e.push(rnd() < 0.5 ? V : H); }
    for (let k = 0; k < 6; k++) { const r = realocar(e, rnd); if (r) e = r.e; const g = reagrupar(e, rnd); if (g) e = g; }
    const cfg = { K: 3.2, minRet: 200, SW: 2750, SH: 1850, rot: true, fases: 3, sobraUnica: true };
    const ctx = makeCtx(items, cfg); costOf(e, ctx.fl, ctx);
    if (!ctx.lastOk) continue;
    const s = montarChapa({ expr: e, items }, cfg);
    if (!s.ok) continue;
    let real = 0; uteis(s).forEach((r) => { real += r.w * r.h; });
    assert.ok(Math.abs(real - ctx.lastUse) < 1, 'caso ' + caso + ': otimizador ' + ctx.lastUse + ' x chapa ' + real);
    conferidos++;
  }
  assert.ok(conferidos >= 100, 'só ' + conferidos + ' casos conferidos');
});

test('reagrupar e realocar devolvem árvores válidas com as mesmas peças', () => {
  const rnd = mulberry32(9);
  const valida = (e) => { let c = 0; for (const t of e) { c += t >= 0 ? 1 : -1; if (c < 1) return false; } return c === 1; };
  for (let k = 0; k < 500; k++) {
    const n = 3 + Math.floor(rnd() * 12);
    let e = [0]; for (let i = 1; i < n; i++) { e.push(i); e.push(rnd() < 0.5 ? V : H); }
    const folhas = (x) => x.filter((t) => t >= 0).sort((a, b) => a - b).join();
    const r = realocar(e, rnd); if (r) { assert.ok(valida(r.e)); assert.equal(folhas(r.e), folhas(e)); e = r.e; }
    const g = reagrupar(e, rnd); if (g) { assert.ok(valida(g)); assert.equal(folhas(g), folhas(e)); }
  }
});

// Projeto grande: 2 guarda-roupas + cozinha (159 peças, 9,81 chapas de área). Antes, com 3 fases, às vezes dava 12 chapas.
const guarda = () => [...P(2, 2400, 550), ...P(1, 2370, 535), ...P(2, 1770, 550), ...P(6, 870, 500), ...P(3, 2390, 595), ...P(2, 1770, 100), ...P(4, 860, 200), ...P(8, 480, 150), ...P(4, 800, 150), ...P(2, 1770, 80)];
const cozinha = () => [...P(10, 720, 560), ...P(5, 800, 560), ...P(5, 800, 100), ...P(10, 700, 300), ...P(10, 770, 300), ...P(5, 770, 280), ...P(10, 700, 395), ...P(8, 715, 395), ...P(6, 395, 180), ...P(12, 480, 140), ...P(6, 360, 140), ...P(4, 2400, 100)];

test('projeto grande com 3 fases: no máximo 11 chapas, todas conferidas e dentro do limite', async () => {
  id = 0;
  const res = await planejar({ K: 3.2, minRet: 200, refilo: 0, fases: 3 }, [grupo([...guarda(), ...guarda(), ...cozinha()])], 8000, tick);
  const g = res.groups[0];
  assert.ok(g.sheets.length <= 11, 'deu ' + g.sheets.length);
  assert.ok(g.sheets.every((s) => s.ok && s.fases <= 3));
  assert.equal(ids(g.sheets).length, 159);
  assert.ok(res.tentativas > 1);
  assert.equal(g.minNovas, 10);
});

test('tentativas: false roda uma vez só (como antes)', async () => {
  id = 0;
  const res = await planejar({ K: 3.2, minRet: 200, refilo: 0, fases: 0, tentativas: false }, [grupo(guarda())], 1500, tick);
  assert.equal(res.tentativas, 1);
  assert.ok(res.groups[0].sheets.every((s) => s.ok));
});

// Chapas montadas à mão para a absorção.
const cfgA = { K: 3.2, minRet: 200, SW: 2750, SH: 1850, rot: true, ref: 0, fases: 0, sobraUnica: true };
const chapa = (n, pecas) => {
  const items = pecas.map((p) => ({ p, flip: false }));
  const expr = [0]; for (let i = 1; i < items.length; i++) { expr.push(i); expr.push(V); }
  const s = montarChapa({ expr, items }, cfgA); s.n = n; s.cfg = cfgA; s.sobra = null; return s;
};

test('absorção: a chapa quase vazia some quando a peça cabe na outra', async () => {
  id = 0;
  const a = chapa(1, P(2, 1000, 1800)), b = chapa(2, P(1, 700, 1800));
  const nova = await absorverUltima([a, b], 3000, mulberry32(1), agora, tick);
  assert.ok(nova);
  assert.equal(nova.length, 1);
  assert.deepEqual(ids(nova), [1, 2, 3]);
  assert.ok(nova[0].ok);
});

test('absorção: se a peça não cabe, o plano fica como estava', async () => {
  id = 0;
  const a = chapa(1, P(2, 1000, 1800)), b = chapa(2, P(1, 800, 1850));
  assert.equal(await absorverUltima([a, b], 1500, mulberry32(1), agora, tick), null);
});

test('absorção: chapa bem usada (acima de 40%) não é mexida', async () => {
  id = 0;
  const a = chapa(1, P(1, 1200, 1800)), b = chapa(2, P(1, 1300, 1800));
  assert.equal(await absorverUltima([a, b], 1500, mulberry32(1), agora, tick), null);
});

test('mínimo pela área: conta as sobras do estoque e arredonda para cima', () => {
  id = 0;
  const g = grupo(P(3, 2750, 1850));
  assert.equal(minimoChapas(g, 2750, 1850), 3);
  assert.equal(minimoChapas({ ...g, sobras: [{ c: 2750, l: 1850 }] }, 2750, 1850), 2);
  assert.equal(minimoChapas(grupo(P(1, 100, 100)), 2750, 1850), 1);
  assert.ok(Math.abs(areaEmChapas(grupo(P(1, 1375, 1850)), 2750, 1850) - 0.5) < 1e-9);
});

test('resumo do mínimo: no mínimo, praticamente impossível e "em teoria"', () => {
  const r = (nNovas, minNovas, areaNovas) => resumoMinimo({ groups: [{ nNovas, minNovas, areaNovas }] });
  assert.equal(r(3, 3, 2.5).noMinimo, true);
  assert.match(r(3, 3, 2.5).texto, /Mínimo possível/);
  assert.match(r(4, 3, 2.97).texto, /praticamente impossível/);
  assert.match(r(11, 10, 9.81).texto, /em teoria cabem em 10/);
  assert.equal(resumoMinimo({ groups: [{ nNovas: 2 }] }), null, 'plano antigo, sem o campo');
});

test('o plano traz minNovas e areaNovas por material', async () => {
  id = 0;
  const res = await planejar({ K: 3.2, minRet: 200, refilo: 0 }, [grupo(guarda())], 1500, tick);
  const g = res.groups[0];
  assert.equal(g.minNovas, 3);
  assert.ok(g.areaNovas > 2.9 && g.areaNovas < 3);
  assert.ok(g.nNovas >= g.minNovas);
});
