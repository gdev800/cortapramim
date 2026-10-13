// PDF do estoque de sobras.
import { fmtFor } from '../../domain/units.js';
import { novoPdf } from './lib.js';
import { PM, hojeStr, pdfTitulo, pdfRodape, pdfTabela } from './common.js';

/** Desenha a tabela do estoque a partir do Y informado. Devolve o Y final. */
export function tabelaEstoque(doc, y, state) {
  const { fu, unit } = fmtFor(state.unit); let area = 0;
  const body = state.estoque.map((s) => { area += s.c * s.l; return [s.nome || 'Sem nome', s.esp ? s.esp + ' mm' : '-', fu(s.c) + ' x ' + fu(s.l) + ' ' + unit, s.veio ? 'sim' : 'não', s.obs || '']; });
  if (!body.length) { doc.setFontSize(10); doc.setTextColor(109, 101, 91); doc.text('Nenhuma sobra cadastrada.', PM, y + 4); return y + 8; }
  const fy = pdfTabela(doc, y, ['Material', 'Espessura', 'Medidas', 'Veio', 'Observação'], body);
  doc.setFontSize(9.5); doc.setTextColor(29, 25, 20);
  doc.text(body.length + (body.length === 1 ? ' sobra' : ' sobras') + ' · ' + (Math.round(area / 1e4) / 100).toString().replace('.', ',') + ' m² no total', PM, fy + 7);
  return fy + 9;
}

export async function gerarPdfEstoque(state) {
  const doc = novoPdf();
  const y = pdfTitulo(doc, 'Estoque de sobras', 'Posição em ' + hojeStr());
  tabelaEstoque(doc, y, state); pdfRodape(doc);
  return doc.output('blob');
}
