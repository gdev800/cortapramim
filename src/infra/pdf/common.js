// Peças comuns a todos os PDFs: margens, título, rodapé e tabela.
export const PM = 14;   // margem (mm)
export const PW = 210;  // largura da folha A4 (mm)
export const hojeStr = () => new Date().toLocaleDateString('pt-BR');

/** Título com filete de cor. Devolve o Y onde o conteúdo pode começar. */
export function pdfTitulo(doc, titulo, sub) {
  doc.setFillColor(176, 112, 42); doc.rect(PM, 14, 12, 1.6, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(29, 25, 20); doc.text(titulo, PM, 25);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(109, 101, 91); doc.text(sub, PM, 31.5);
  return 38;
}

export function pdfRodape(doc) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(140, 130, 118);
    doc.text('Plano de Corte MDF · ' + hojeStr(), PM, 289); doc.text('Página ' + i + ' de ' + n, PW - PM, 289, { align: 'right' });
  }
}

/** Tabela no estilo do app. Devolve o Y logo abaixo dela. */
export function pdfTabela(doc, y, head, body, opt) {
  doc.autoTable({
    startY: y, head: [head], body, margin: { left: PM, right: PM, bottom: 18 }, theme: 'striped',
    styles: { font: 'helvetica', fontSize: 8.8, cellPadding: 2, textColor: [29, 25, 20], lineColor: [228, 224, 217] },
    headStyles: { fillColor: [42, 33, 24], textColor: [255, 255, 255], fontStyle: 'bold' }, alternateRowStyles: { fillColor: [247, 245, 241] },
    ...(opt || {}),
  });
  return doc.lastAutoTable.finalY;
}
