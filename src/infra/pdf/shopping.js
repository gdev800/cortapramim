// PDF da lista de compras (plano aberto + estoque mínimo).
import { novoPdf, latin1 } from './lib.js';
import { PM, PW, hojeStr, pdfTitulo, pdfRodape, pdfTabela } from './common.js';
import { toStr } from '../../domain/units.js';

export async function gerarPdfCompras(lista, abaixo, fu, unit) {
  const doc = novoPdf();
  let y = pdfTitulo(doc, 'Lista de compras', latin1('Posição em ' + hojeStr() + (lista.temPlano ? ' · inclui o plano aberto' : '')));
  if (abaixo.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(160, 70, 30);
    abaixo.forEach((a) => { const t = doc.splitTextToSize(latin1(a.texto), PW - 2 * PM); doc.text(t, PM, y + 2); y += t.length * 4.6; });
    y += 4;
  }
  if (!lista.itens.length) { doc.setFontSize(10); doc.setTextColor(109, 101, 91); doc.text('Nada para comprar agora.', PM, y + 4); }
  else {
    pdfTabela(doc, y, ['Item', 'Tamanho (' + unit + ')', 'Tenho', 'Plano pede', latin1('Mínimo'), 'Comprar', 'Motivo'],
      lista.itens.map((x) => [latin1(x.nome), x.c ? fu(x.c) + ' x ' + fu(x.l) : '-', toStr(x.tenho), x.precisa ? toStr(x.precisa) : '-', x.min ? toStr(x.min) : '-',
        toStr(x.comprar) + ' ' + (x.un === 'chapa' ? (x.comprar === 1 ? 'chapa' : 'chapas') : x.un), latin1(x.motivo)]),
      { columnStyles: { 5: { fontStyle: 'bold' } } });
  }
  pdfRodape(doc);
  return doc.output('blob');
}
