// PDF do plano de corte: resumo, compras, custos, uma página por chapa e o estoque de sobras.
import { sheetSVG, PAL_EXPORT } from '../../core/index.js';
import { RETALHO_MIN_LISTA } from '../../core/constants.js';
import { fmtFor, money, toStr, pct } from '../../domain/units.js';
import { custos } from '../../domain/costs.js';
import { relatorioPlano, linhasRelatorio, linhasRelatorioMat, linhasPorProjeto, CAB_RELAT_MAT, CAB_RELAT_PROJ } from '../../domain/report.js';
import { svgToCanvas } from '../raster.js';
import { novoPdf } from './lib.js';
import { PM, PW, hojeStr, pdfTitulo, pdfRodape, pdfTabela } from './common.js';
import { tabelaEstoque } from './stock.js';

export async function gerarPdfPlano(state) {
  const doc = novoPdf(), { fu, unit: un } = fmtFor(state.unit);
  const res = state.res; let total = 0, nSob = 0;
  res.groups.forEach((g) => { total += g.sheets.length; nSob += g.nSobras; });
  let y = pdfTitulo(doc, state.proj.nome || 'Plano de corte', 'Plano de corte · ' + hojeStr() + ' · medidas em ' + un);
  doc.setFontSize(10.5); doc.setTextColor(29, 25, 20);
  let ap = 0, as = 0, pecas = 0;
  res.groups.forEach((g) => { pecas += g.nPecas; g.sheets.forEach((s) => { ap += s.area; as += s.cfg.SW * s.cfg.SH; }); });
  doc.text(pecas + ' peças · ' + (total - nSob) + ' chapa(s) nova(s)' + (nSob ? ' + ' + nSob + ' sobra(s)' : '') + ' · aproveitamento ' + pct(ap / as) + '%', PM, y + 2);
  y += 8;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Lista de compras', PM, y + 4); y += 7;
  y = pdfTabela(doc, y, ['Chapa', 'Esp.', 'Tamanho', 'Veio', 'Novas', 'Sobras', 'Comprar', 'Aprov.'], res.groups.map((g) => {
    let a1 = 0, a2 = 0; g.sheets.forEach((s) => { a1 += s.area; a2 += s.cfg.SW * s.cfg.SH; });
    const r = g.cfg.ref || 0;
    return [g.mat, g.esp ? g.esp + ' mm' : '-', fu(g.cfg.SW + 2 * r) + ' x ' + fu(g.cfg.SH + 2 * r), g.veio ? 'sim' : 'não', g.nNovas, g.nSobras, Math.max(0, g.nNovas - (g.estoque || 0)), pct(a1 / a2) + '%'];
  })) + 8;

  const c = custos(res, state.ferr, state.orc);
  if (c.custo > 0) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Custos', PM, y + 4); y += 7;
    const body = [];
    if (c.chapas > 0) body.push(['Chapas novas', money(c.chapas)]);
    if (c.fita > 0) body.push(['Fita de borda (' + toStr(c.fitaM) + ' m)', money(c.fita)]);
    if (c.ferr > 0) body.push(['Ferragens', money(c.ferr)]);
    if (c.mao > 0) body.push(['Mão de obra', money(c.mao)]);
    body.push(['Custo total', money(c.custo)]);
    if (c.venda > 0) body.push(['Preço de venda (margem ' + toStr(c.mg) + '%)', money(c.venda)]);
    y = pdfTabela(doc, y, ['Item', 'Valor'], body, { tableWidth: 110, columnStyles: { 1: { halign: 'right' } } }) + 6;
  }

  // "²" não existe na fonte do PDF: aqui sai "m2".
  const semSup = (s) => String(s).replace(/m²/g, 'm2');
  const rel = relatorioPlano(res);
  if (y > 225) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(29, 25, 20); doc.text('Relatório de aproveitamento', PM, y + 4); y += 7;
  y = pdfTabela(doc, y, ['Item', 'Valor'], linhasRelatorio(rel, c.custo).map((r) => r.map(semSup)), { tableWidth: 110, columnStyles: { 1: { halign: 'right' } } }) + 6;
  if (rel.grupos.length > 1) y = pdfTabela(doc, y, CAB_RELAT_MAT.map(semSup), linhasRelatorioMat(rel).map((r) => r.map(semSup))) + 8;
  const pp = linhasPorProjeto(res);
  if (pp.length) {
    if (y > 235) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(29, 25, 20); doc.text('Por projeto', PM, y + 4); y += 7;
    y = pdfTabela(doc, y, CAB_RELAT_PROJ.map(semSup), pp.map((r) => r.map(semSup))) + 8;
  }

  for (const g of res.groups) {
    for (const s of g.sheets) {
      doc.addPage();
      let yy = pdfTitulo(doc, 'Chapa ' + s.n + ' de ' + total, g.mat + (g.esp ? ' · ' + g.esp + ' mm' : '') + (s.sobra ? ' · sobra do estoque' : '') + (g.veio ? ' · com veio' : ''));
      const r = sheetSVG(s, PAL_EXPORT, { fu, un, header: false, numbers: true, sobras: true }, total);
      const cv = await svgToCanvas(r, 1800); const w = PW - 2 * PM, h = w * r.h / r.w;
      doc.addImage(cv.toDataURL('image/png'), 'PNG', PM, yy, w, h); yy += h + 6;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(29, 25, 20);
      const mr = s.maiorRetalho;
      doc.text('Aproveitamento ' + pct(s.util) + '% · ' + s.pecas.length + ' peças · ' + s.nCortes + ' cortes · ' + (mr ? 'maior retalho ' + fu(mr.w) + ' x ' + fu(mr.h) + ' ' + un : 'sem retalho útil'), PM, yy); yy += 4;
      const temF = s.pecas.some((q) => q.cf), temP = s.pecas.some((q) => q.proj);
      yy = pdfTabela(doc, yy, ['#', 'Nome', 'C', 'L', 'X', 'Y', 'Giro', 'Fita C/L'].concat(temF ? ['Final C x L'] : []).concat(temP ? ['Projeto'] : []), s.pecas.slice().sort((a, b) => a.id - b.id).map((q) =>
        [q.id, q.nome || '-', fu(q.c), fu(q.l), fu(q.x), fu(q.y), q.girada ? 'sim' : '', (q.fc || q.fl) ? (q.fc || 0) + '/' + (q.fl || 0) : ''].concat(temF ? [q.cf ? fu(q.cf) + ' x ' + fu(q.lf) : ''] : []).concat(temP ? [q.proj || ''] : [])));
      const sob = s.restos.map((rr, i) => [rr, i]).filter(([rr]) => Math.min(rr.w, rr.h) >= RETALHO_MIN_LISTA);
      if (sob.length) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(29, 25, 20);
        if (yy > 250) { doc.addPage(); yy = 20; }
        doc.text('Sobras desta chapa', PM, yy + 8);
        yy = pdfTabela(doc, yy + 10, ['#', 'C', 'L', 'X', 'Y', 'Guardar?'], sob.map(([rr, i]) => ['R' + (i + 1), fu(rr.w), fu(rr.h), fu(rr.x), fu(rr.y), rr.util ? 'sim' : 'pequena']));
      }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(29, 25, 20);
      if (yy > 250) { doc.addPage(); yy = 20; }
      doc.text('Sequência de cortes', PM, yy + 8);
      pdfTabela(doc, yy + 10, ['#', 'Direção', 'Posição', 'De', 'Até'].concat(s.cfg.fases ? ['Fase'] : []), s.cortes.map((cc, i) => [i + 1, cc.tipo === 'V' ? 'Vertical' : 'Horizontal', fu(cc.pos), fu(cc.ini), fu(cc.fim)].concat(s.cfg.fases ? [cc.fase] : [])));
    }
  }
  doc.addPage();
  const ye = pdfTitulo(doc, 'Estoque de sobras', 'Posição em ' + hojeStr() + (state.estAtual ? ' (já com este plano)' : ''));
  tabelaEstoque(doc, ye, state);
  pdfRodape(doc);
  return doc.output('blob');
}
