// Fase 15: relatório mensal. Soma por mês, mês vazio, virada de ano, CSV com acentos e gráfico em SVG.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumoDoMes, serieMensal, somarMeses, csvMensal, cartoesDoMes, nomeArquivoMes } from '../../../src/domain/monthly.js';
import { graficoBarras } from '../../../src/ui/components/monthly/chart.js';
import { createState, newBlock } from '../../../src/domain/state.js';
import { saidaDoPlano, registrarEntrada } from '../../../src/domain/history.js';
import { planejar } from '../../../src/core/index.js';
import { coletar } from '../../../src/domain/collect.js';

// datas no horário local, como a tela mostra
const em = (ano, mes, dia) => new Date(ano, mes - 1, dia, 12).toISOString();
let n = 0;
const saida = (data, x = {}) => ({
  id: 'm' + (++n), tipo: 'saida', data, projeto: 'Cozinha', pecas: 10, chapas: [{ nome: 'Branco TX', esp: 15, q: 2 }],
  sobrasUsadas: 1, sobrasNovas: 2, fitaM: 12.5, ferragens: [{ nome: 'Dobradiça', q: 4 }],
  areaPecas: 7, areaChapas: 10, areaPerda: 3, custo: 500, economia: 40.5, ...x,
});

const hist = [
  saida(em(2026, 10, 2), { projeto: 'Cozinha Ana' }),
  saida(em(2026, 10, 15), { projeto: 'Guarda-roupa', pecas: 20, chapas: [{ nome: 'Branco TX', esp: 15, q: 3 }, { nome: 'Carvalho', esp: 18, q: 1 }], areaPecas: 8, areaChapas: 10, areaPerda: 2, fitaM: 7.5, ferragens: [{ nome: 'Dobradiça', q: 2 }, { nome: 'Corrediça', q: 6 }], custo: 1000, economia: 9.5 }),
  saida(em(2026, 10, 30), { projeto: 'Balcão', pecas: 5, chapas: [{ nome: 'branco tx ', esp: 15, q: 1 }], areaPecas: 1, areaChapas: 5, areaPerda: 4, fitaM: 0, ferragens: [], custo: 200, economia: 0 }),
  saida(em(2026, 9, 20), { projeto: 'Setembro', pecas: 99 }),
  { id: 'e1', tipo: 'entrada', data: em(2026, 10, 3), item: { tipo: 'fita', nome: 'Fita' }, q: 50, un: 'm' },
  { id: 'a1', tipo: 'ajuste', data: em(2026, 10, 4), item: { tipo: 'ferr', nome: 'X' }, de: 3, para: 1, un: 'un' },
];

test('3 projetos em outubro: somas certas e setembro fica de fora', () => {
  const r = resumoDoMes(hist, 2026, 10);
  assert.equal(r.projetos, 3);
  assert.deepEqual(r.nomesProjetos, ['Cozinha Ana', 'Guarda-roupa', 'Balcão']);
  assert.equal(r.pecas, 35);
  assert.equal(r.chapas, 7);
  assert.equal(r.fitaM, 20);
  assert.equal(r.sobrasUsadas, 3); assert.equal(r.sobrasNovas, 6);
  assert.equal(r.areaPecas, 16); assert.equal(r.areaChapas, 25); assert.equal(r.areaPerda, 9);
  assert.equal(r.aproveitamento, 64, 'média ponderada pela área: 16/25');
  assert.equal(r.custo, 1700); assert.equal(r.economia, 50);
  assert.equal(r.entradas, 1); assert.equal(r.ajustes, 1);
  assert.equal(r.rotulo, 'outubro de 2026');
});

test('tabela por material junta o mesmo nome/espessura (sem diferenciar maiúsculas) e conta projetos', () => {
  const r = resumoDoMes(hist, 2026, 10);
  assert.deepEqual(r.porMaterial, [{ nome: 'Branco TX', esp: 15, chapas: 6, projetos: 3 }, { nome: 'Carvalho', esp: 18, chapas: 1, projetos: 1 }]);
  assert.deepEqual(r.ferragens, [{ nome: 'Corrediça', q: 6 }, { nome: 'Dobradiça', q: 6 }]);
});

test('mês vazio: tudo zero, aproveitamento nulo, cartões com traço', () => {
  const r = resumoDoMes(hist, 2026, 11);
  assert.equal(r.vazio, true); assert.equal(r.projetos, 0); assert.equal(r.chapas, 0);
  assert.equal(r.aproveitamento, null); assert.deepEqual(r.porMaterial, []);
  assert.equal(cartoesDoMes(r).find((c) => c.k === 'aprov').valor, '–');
  assert.equal(resumoDoMes([], 2026, 10).vazio, true);
  assert.equal(resumoDoMes(undefined, 2026, 10).vazio, true);
});

test('ignora movimentos com data inválida ou campos faltando', () => {
  const r = resumoDoMes([{ id: 'x', tipo: 'saida', data: 'lixo', pecas: 5 }, { id: 'y', tipo: 'saida', data: em(2026, 10, 1) }], 2026, 10);
  assert.equal(r.projetos, 1); assert.equal(r.pecas, 0); assert.equal(r.chapas, 0);
});

test('virada de ano: somarMeses e série dos últimos meses', () => {
  assert.deepEqual(somarMeses(2026, 1, -1), { ano: 2025, mes: 12 });
  assert.deepEqual(somarMeses(2025, 12, 1), { ano: 2026, mes: 1 });
  assert.deepEqual(somarMeses(2026, 3, -14), { ano: 2025, mes: 1 });
  const h = [saida(em(2025, 12, 31), { pecas: 4 }), saida(em(2026, 1, 1), { pecas: 6 })];
  assert.equal(resumoDoMes(h, 2025, 12).pecas, 4);
  assert.equal(resumoDoMes(h, 2026, 1).pecas, 6);
  const s = serieMensal(h, 3, { ano: 2026, mes: 1 });
  assert.deepEqual(s.map((x) => [x.ano, x.mes, x.rotulo, x.pecas]), [[2025, 11, 'nov/25', 0], [2025, 12, 'dez/25', 4], [2026, 1, 'jan/26', 6]]);
});

test('série padrão termina no mês atual', () => {
  const s = serieMensal([], 6), d = new Date();
  assert.equal(s.length, 6);
  assert.deepEqual([s[5].ano, s[5].mes], [d.getFullYear(), d.getMonth() + 1]);
});

test('CSV com acentos, ponto e vírgula, vírgula decimal e aspas', () => {
  const h = [saida(em(2026, 10, 5), { projeto: 'Cozinha "da Ana"; ilha', chapas: [{ nome: 'Branco Ártico', esp: 15, q: 2 }], fitaM: 12.5, ferragens: [{ nome: 'Dobradiça calço', q: 4 }] })];
  const r = resumoDoMes(h, 2026, 10), csv = csvMensal(r, serieMensal(h, 2, { ano: 2026, mes: 10 }));
  assert.ok(!csv.startsWith('﻿'), 'o BOM é posto na entrega');
  assert.match(csv, /^Relatório do mês;outubro de 2026\r\n/);
  assert.match(csv, /Peças cortadas;10/);
  assert.match(csv, /Fita de borda \(m\);12,5/);
  assert.match(csv, /Aproveitamento \(%\);70/);
  assert.match(csv, /Branco Ártico;15;2;1/);
  assert.match(csv, /Dobradiça calço;4/);
  assert.match(csv, /Projetos do mês;"Cozinha ""da Ana""; ilha"/);
  assert.match(csv, /set\/26;0;0;0;;0;0;0\r\nout\/26;1;10;2;70;12,5;500;40,5$/);
  assert.equal(nomeArquivoMes(2026, 3, 'csv'), 'relatorio-2026-03.csv');
});

test('gráfico SVG: uma barra por mês, destaca o escolhido e escapa texto', () => {
  const s = serieMensal(hist, 3, { ano: 2026, mes: 10 });
  const svg = graficoBarras(s, 'chapas', { ano: 2026, mes: 10 });
  assert.match(svg, /^<svg class="rel-svg"/);
  assert.equal((svg.match(/<rect /g) || []).length, 3);
  assert.equal((svg.match(/class="rel-b on"/g) || []).length, 1);
  assert.match(svg, /data-mes="10"[^>]*><title>out\/26: 7<\/title>/);
  const vazio = graficoBarras(serieMensal([], 2, { ano: 2026, mes: 10 }), 'economia', null);
  assert.match(vazio, /height="0\.0"/, 'sem dado não quebra (sem divisão por zero)');
  assert.doesNotMatch(vazio, /NaN/);
});

test('de ponta a ponta: saidaDoPlano entra no relatório do mês atual', async () => {
  const st = createState(); st.unit = 'cm';
  st.blocks = [newBlock(st, { nome: 'Branco TX', esp: '15', sw: '275', sh: '185', rows: [{ q: 4, c: '100', l: '50', n: 'Porta' }] })];
  st.res = await planejar({ K: 3.2, minRet: 200, refilo: 0 }, coletar(st).groups, 300, async () => {});
  st.historico = [];
  registrarEntrada(st, { tipoItem: 'fita', nome: 'Fita', q: 10, un: 'm' });
  saidaDoPlano(st);
  const d = new Date(), r = resumoDoMes(st.historico, d.getFullYear(), d.getMonth() + 1);
  assert.equal(r.projetos, 1); assert.equal(r.pecas, 4); assert.equal(r.chapas, 1); assert.equal(r.entradas, 1);
  assert.ok(r.aproveitamento > 0 && r.aproveitamento <= 100);
});
