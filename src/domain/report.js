// Relatório de aproveitamento: números e linhas derivados do plano já calculado (sem DOM).
// Conta de cada chapa: bruta = peças + retalhos úteis + refilo + perda.
import { fitaMetros } from '../core/index.js';
import { toStr, pct, money } from './units.js';
import { custoPorProjeto } from './costs.js';

export const CAB_RELAT_MAT = ['Material', 'Esp.', 'Chapa m²', 'Peças m²', 'Aprov.', 'Retalho m²', 'Perda m²'];

/** Totais e quebra por material, áreas em m². perdaRS conta só chapa nova com preço. */
export function relatorioPlano(res) {
  const tot = { bruta: 0, pecas: 0, retalho: 0, refilo: 0, perda: 0, perdaRS: 0, fitaM: 0, cortes: 0, sobrasUsadas: 0 };
  const grupos = res.groups.map((g) => {
    const r = { mat: g.mat, esp: g.esp, nNovas: g.nNovas, nSobras: g.nSobras, bruta: 0, pecas: 0, retalho: 0, refilo: 0, perda: 0, perdaRS: 0, fitaM: fitaMetros(g) };
    g.sheets.forEach((s) => {
      const rf = s.cfg.ref || 0, util = s.cfg.SW * s.cfg.SH, bruta = (s.cfg.SW + 2 * rf) * (s.cfg.SH + 2 * rf);
      const refilo = bruta - util, retalho = Math.min(s.areaRetalhos || 0, util - s.area), perda = Math.max(0, util - s.area - retalho);
      r.bruta += bruta; r.pecas += s.area; r.retalho += retalho; r.refilo += refilo; r.perda += perda;
      if (!s.sobra && g.preco > 0 && bruta > 0) r.perdaRS += g.preco * (refilo + perda) / bruta;
      if (s.sobra) tot.sobrasUsadas += bruta;
      tot.cortes += s.nCortes;
    });
    ['bruta', 'pecas', 'retalho', 'refilo', 'perda', 'perdaRS', 'fitaM'].forEach((k) => { tot[k] += r[k]; });
    return r;
  });
  ['bruta', 'pecas', 'retalho', 'refilo', 'perda', 'sobrasUsadas'].forEach((k) => { tot[k] /= 1e6; });
  grupos.forEach((r) => { ['bruta', 'pecas', 'retalho', 'refilo', 'perda'].forEach((k) => { r[k] /= 1e6; }); });
  return { tot, grupos };
}

/** Linhas [item, valor] do relatório geral. */
export function linhasRelatorio(rel, custoTotal) {
  const t = rel.tot, m2 = (v) => toStr(v) + ' m²', p = (v) => (t.bruta > 0 ? pct(v / t.bruta) + '%' : '—');
  const L = [
    ['Área de chapa usada', m2(t.bruta)],
    ['Área das peças', m2(t.pecas)],
    ['Retalhos úteis que sobram', m2(t.retalho) + ' (' + p(t.retalho) + ')'],
  ];
  if (t.refilo > 0) L.push(['Perda no refilo', m2(t.refilo) + ' (' + p(t.refilo) + ')']);
  L.push(['Perda na serra e retalhos pequenos', m2(t.perda) + ' (' + p(t.perda) + ')']);
  L.push(['Aproveitamento da chapa', p(t.pecas)]);
  L.push(['Aproveitamento contando retalhos úteis', p(t.pecas + t.retalho)]);
  if (t.perdaRS > 0) L.push(['Perda em R$ (sem contar retalhos úteis)', money(t.perdaRS)]);
  if (t.fitaM > 0) L.push(['Fita de borda', toStr(t.fitaM) + ' m']);
  L.push(['Cortes de serra', String(t.cortes)]);
  if (custoTotal > 0 && t.pecas > 0) L.push(['Custo por m² de peça', money(custoTotal / t.pecas)]);
  return L;
}

/** Uma linha por material, na ordem de CAB_RELAT_MAT. */
export function linhasRelatorioMat(rel) {
  return rel.grupos.map((r) => [r.mat, r.esp ? r.esp + ' mm' : '—', toStr(r.bruta), toStr(r.pecas), r.bruta > 0 ? pct(r.pecas / r.bruta) + '%' : '—', toStr(r.retalho), toStr(r.perda)]);
}

export const CAB_RELAT_PROJ = ['Projeto', 'Peças', 'Peças m²', 'Chapas R$', 'Fita R$', 'Total R$'];

/** Linhas por projeto, ou [] quando o plano tem um projeto só. */
export function linhasPorProjeto(res) {
  const l = custoPorProjeto(res);
  if (l.length < 2) return [];
  const r = (v) => (v > 0 ? money(v) : '—');
  return l.map((x) => [x.nome, String(x.pecas), toStr(x.area), r(x.chapas), r(x.fita), r(x.total)]);
}

/** CSV do relatório: bloco Item;Valor e, abaixo, a tabela por material. */
export function csvRelatorio(res, custoTotal) {
  const rel = relatorioPlano(res), q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  const L = ['Item;Valor'];
  linhasRelatorio(rel, custoTotal).forEach((l) => L.push(q(l[0]) + ';' + q(l[1])));
  L.push('', CAB_RELAT_MAT.map(q).join(';'));
  linhasRelatorioMat(rel).forEach((l) => L.push(l.map(q).join(';')));
  const pp = linhasPorProjeto(res);
  if (pp.length) { L.push('', CAB_RELAT_PROJ.map(q).join(';')); pp.forEach((l) => L.push(l.map(q).join(';'))); }
  return '﻿' + L.join('\r\n');
}
