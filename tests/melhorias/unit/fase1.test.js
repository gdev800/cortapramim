// Fase 1: relatório de aproveitamento e desconto da espessura da fita de borda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planejar, fitaMetros, csvPecas } from '../../../src/core/index.js';
import { coletar } from '../../../src/domain/collect.js';
import { fmtFor } from '../../../src/domain/units.js';
import { relatorioPlano, linhasRelatorio, csvRelatorio } from '../../../src/domain/report.js';

const AJ = { K: '3.2', minRet: '200', tempo: '15', num: true, refilo: '0', fitaEsp: '0' };
function mkState(paste, aj = {}, extra = {}) {
  return {
    unit: 'cm', aj: { ...AJ, ...aj }, estoque: [],
    blocks: [{ nome: 'MDF Branco', esp: '15', sw: '275', sh: '185', veio: false, estoque: '', preco: '300', fita: '', fitaNome: '', usarSobras: false, mode: 'paste', paste, rows: [], ...extra }],
  };
}
const cfgDe = (aj, ref = 0) => ({ K: Number(aj.K), minRet: Number(aj.minRet), refilo: ref });
const tick = async () => {};
const plano = (st, ms = 300, ref = 0) => planejar(cfgDe(st.aj, ref), coletar(st).groups, ms, tick);

test('fita 0: medidas inalteradas e sem tamanho final', () => {
  const col = coletar(mkState('2 = 100 x 50 = Porta ; fita 1C 2L'));
  assert.equal(col.erros.length, 0);
  const p = col.groups[0].pieces[0];
  assert.equal(p.c, 1000); assert.equal(p.l, 500); assert.equal(p.cf, undefined);
});

test('fita 0,45: C perde 2 lados de L, L perde 1 lado de C', () => {
  const ps = coletar(mkState('2 = 100 x 50 = Porta ; fita 1C 2L', { fitaEsp: '0,45' })).groups[0].pieces;
  assert.equal(ps.length, 2);
  assert.equal(ps[0].c, 999.1); assert.equal(ps[0].l, 499.55);
  assert.equal(ps[0].cf, 1000); assert.equal(ps[0].lf, 500);
});

test('peça sem fita não é descontada, mesmo com a opção ligada', () => {
  const p = coletar(mkState('1 = 100 x 50 = Fundo', { fitaEsp: '2' })).groups[0].pieces[0];
  assert.equal(p.c, 1000); assert.equal(p.cf, undefined);
});

test('espessura maior que a peça gera erro claro', () => {
  const col = coletar(mkState('1 = 0.3 x 0.3 = Mini ; fita 2C 2L', { fitaEsp: '5' }));
  assert.ok(col.erros.length === 1 && /espessura da fita/.test(col.erros[0]), col.erros.join('|'));
});

test('plano com desconto: verificação OK e peças no tamanho de corte', async () => {
  const st = mkState('4 = 80 x 40 = Prateleira ; fita 1C\n2 = 100 x 50 = Porta ; fita 1C 2L\n3 = 60 x 30 = Gaveta ; fita 2C 2L', { fitaEsp: '0,45' });
  const res = await plano(st, 400);
  res.groups.forEach((g) => g.sheets.forEach((s) => {
    assert.equal(s.ok, true, 'verificação falhou');
    s.pecas.forEach((q) => {
      const w = q.girada ? q.l : q.c, h = q.girada ? q.c : q.l;
      assert.ok(Math.abs(q.w - w) < 1e-6 && Math.abs(q.h - h) < 1e-6, 'peça fora do tamanho de corte');
    });
  }));
});

test('metros de fita usam o comprimento final da peça', async () => {
  const res = await plano(mkState('1 = 100 x 50 = Porta ; fita 1C 2L', { fitaEsp: '2' }), 200);
  assert.equal(Math.round(fitaMetros(res.groups[0]) * 1000) / 1000, 2); // 1000 + 2x500, não 1998
});

test('relatório fecha a conta: chapa = peças + retalho + refilo + perda', async () => {
  for (const ref of [0, 10]) {
    const st = mkState('6 = 90 x 45 = A\n4 = 120 x 60 = B\n8 = 50 x 30 = C ; fita 1C', { refilo: String(ref) });
    const res = await plano(st, 500, ref);
    const T = relatorioPlano(res).tot;
    res.groups.forEach((g) => g.sheets.forEach((s) => assert.ok((s.areaRetalhos || 0) <= s.cfg.SW * s.cfg.SH - s.area + 1e-6)));
    assert.ok(Math.abs(T.bruta - (T.pecas + T.retalho + T.refilo + T.perda)) < 1e-9, 'soma não fecha (refilo ' + ref + ')');
    assert.ok(T.perda >= 0 && T.retalho >= 0);
    if (ref === 0) assert.equal(T.refilo, 0); else assert.ok(T.refilo > 0);
    assert.ok(linhasRelatorio(relatorioPlano(res), 0).some((l) => l[0] === 'Aproveitamento da chapa'));
  }
});

test('dinheiro perdido só conta chapa nova com preço', async () => {
  const rel = relatorioPlano(await plano(mkState('2 = 100 x 50 = A'), 200));
  assert.ok(rel.tot.perdaRS > 0 && rel.tot.perdaRS < 300);
  const sem = relatorioPlano(await plano(mkState('2 = 100 x 50 = A', {}, { preco: '' }), 200));
  assert.equal(sem.tot.perdaRS, 0);
});

test('CSVs: peças ganha colunas finais no fim; relatório tem totais e materiais', async () => {
  const res = await plano(mkState('1 = 100 x 50 = Porta ; fita 1C 2L', { fitaEsp: '0,45' }), 200);
  const fu = fmtFor('cm').fu;
  const linhas = csvPecas(res, fu, 'cm').replace('﻿', '').split('\r\n');
  assert.match(linhas[0], /Fita_lados_L;C_final_cm;L_final_cm$/);
  assert.equal(linhas[1].split(';').slice(-2).join(';'), '100;50');
  const rel = csvRelatorio(res, 0).split('\r\n');
  assert.equal(rel[0].replace('﻿', ''), 'Item;Valor');
  assert.ok(rel.some((l) => l.includes('Aproveitamento da chapa')));
  assert.ok(rel.some((l) => l.startsWith('"Material"')));
});
