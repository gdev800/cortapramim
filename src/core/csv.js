// Listas em CSV (medidas na unidade escolhida).
import { V } from './constants.js';

// ---------- CSV (medidas na unidade escolhida) ----------
export function csvCortes(res, fu, un) {
  const temF = res.groups.some(function (g) { return g.sheets.some(function (sh) { return sh.cortes.some(function (c) { return c.fase; }); }); });
  const L = ['Chapa;Material;Ordem;Direcao;Posicao_' + un + ';De_' + un + ';Ate_' + un + ';Comprimento_do_corte_' + un + (temF ? ';Fase' : '')];
  res.groups.forEach(function (g) { g.sheets.forEach(function (sh) {
    sh.cortes.forEach(function (c, i) { L.push([sh.n, '"' + g.mat.replace(/"/g, '""') + '"', i + 1, c.tipo === 'V' ? 'Vertical' : 'Horizontal', fu(c.pos), fu(c.ini), fu(c.fim), fu(c.fim - c.ini)].concat(temF ? [c.fase] : []).join(';')); });
  }); });
  return '﻿' + L.join('\r\n');
}
export function csvPecas(res, fu, un) {
  const temP = res.groups.some(function (g) { return g.sheets.some(function (sh) { return sh.pecas.some(function (q) { return q.proj; }); }); });
  const L = ['Chapa;Material;Espessura_mm;Peca;Nome;C_' + un + ';L_' + un + ';X_' + un + ';Y_' + un + ';Girada;Fita_lados_C;Fita_lados_L;C_final_' + un + ';L_final_' + un + (temP ? ';Projeto' : '')];
  res.groups.forEach(function (g) { g.sheets.forEach(function (sh) {
    sh.pecas.slice().sort(function (a, b) { return a.id - b.id; }).forEach(function (q) { L.push([sh.n, '"' + g.mat.replace(/"/g, '""') + '"', g.esp || '', q.id, '"' + (q.nome || '').replace(/"/g, '""') + '"', fu(q.c), fu(q.l), fu(q.x), fu(q.y), q.girada ? 'sim' : 'nao', q.fc || 0, q.fl || 0, fu(q.cf || q.c), fu(q.lf || q.l)].concat(temP ? ['"' + (q.proj || '').replace(/"/g, '""') + '"'] : []).join(';')); });
  }); });
  return '﻿' + L.join('\r\n');
}
