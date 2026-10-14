// PDF do relatório do mês: cartões, tabela por material, ferragens e barras mês a mês.
import { novoPdf, latin1 } from './lib.js';
import { PM, PW, pdfTitulo, pdfRodape, pdfTabela } from './common.js';
import { cartoesDoMes, formatarReais } from '../../domain/monthly.js';
import { toStr } from '../../domain/units.js';

/** Barras simples desenhadas com retângulos do jsPDF. Devolve o Y final. */
function barras(doc, y, serie, sel) {
  const h = 38, w = PW - 2 * PM, max = Math.max(1, ...serie.map((s) => s.chapas)), passo = w / serie.length, bw = passo * 0.56;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(29, 25, 20); doc.text('Chapas novas por mês', PM, y + 4);
  const base = y + 10 + h;
  doc.setDrawColor(228, 224, 217); doc.line(PM, base, PM + w, base);
  serie.forEach((s, i) => {
    const bh = (s.chapas / max) * h, x = PM + i * passo + (passo - bw) / 2;
    const atual = s.ano === sel.ano && s.mes === sel.mes;
    if (atual) doc.setFillColor(176, 112, 42); else doc.setFillColor(214, 196, 170);
    if (bh > 0) doc.rect(x, base - bh, bw, bh, 'F');
    doc.setFont('helvetica', atual ? 'bold' : 'normal'); doc.setFontSize(8); doc.setTextColor(29, 25, 20);
    doc.text(toStr(s.chapas), x + bw / 2, base - bh - 1.5, { align: 'center' });
    doc.setTextColor(109, 101, 91); doc.text(latin1(s.rotulo), x + bw / 2, base + 4.5, { align: 'center' });
  });
  return base + 9;
}

/**
 * @param {object} r resumoDoMes(...)
 * @param {object[]} serie serieMensal(...), terminando no mês do relatório
 */
export async function gerarPdfMensal(r, serie) {
  const doc = novoPdf();
  let y = pdfTitulo(doc, latin1('Relatório do mês'), latin1(r.rotulo.charAt(0).toUpperCase() + r.rotulo.slice(1) + (r.projetos ? ' · ' + r.projetos + (r.projetos === 1 ? ' projeto' : ' projetos') : '')));
  y = pdfTabela(doc, y, ['Indicador', 'Valor', 'Detalhe'], cartoesDoMes(r).map((c) => [latin1(c.rotulo), latin1(c.valor), latin1(c.sub)]), { columnStyles: { 1: { fontStyle: 'bold' } } }) + 8;
  if (r.porMaterial.length) {
    y = pdfTabela(doc, y, ['Material', 'Espessura', 'Chapas novas', 'Projetos'], r.porMaterial.map((m) => [latin1(m.nome), m.esp ? m.esp + ' mm' : '-', toStr(m.chapas), String(m.projetos)])) + 8;
  } else {
    doc.setFontSize(10); doc.setTextColor(109, 101, 91); doc.text(latin1('Nenhuma saída de plano neste mês.'), PM, y + 2); y += 10;
  }
  if (r.ferragens.length) y = pdfTabela(doc, y, ['Ferragem', 'Quantidade'], r.ferragens.map((f) => [latin1(f.nome), toStr(f.q)])) + 8;
  if (r.nomesProjetos.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(109, 101, 91);
    const linhas = doc.splitTextToSize(latin1('Projetos: ' + r.nomesProjetos.join(', ')), PW - 2 * PM);
    doc.text(linhas, PM, y); y += linhas.length * 4.2 + 4;
  }
  if (serie && serie.length) {
    if (y > 200) { doc.addPage(); y = 20; }
    y = barras(doc, y, serie, r);
    pdfTabela(doc, y, ['Mês', 'Projetos', 'Peças', 'Chapas', 'Aproveit.', 'Economia'],
      serie.map((s) => [latin1(s.rotulo), String(s.projetos), toStr(s.pecas), toStr(s.chapas), s.aproveitamento == null ? '-' : toStr(s.aproveitamento) + '%', latin1(formatarReais(s.economia))]));
  }
  pdfRodape(doc);
  return doc.output('blob');
}
