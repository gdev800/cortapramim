// Leitura de planilha Excel (.xlsx) com a biblioteca read-excel-file, embutida no build.
// A SheetJS 0.18.5 (antiga) tinha falhas conhecidas (prototype pollution e ReDoS) e a versão corrigida não está no npm.
// O formato .xls (Excel 97-2003) não é lido: o usuário salva como .xlsx ou CSV.
import { readSheet } from 'read-excel-file/browser';
import { linhasParaTexto } from '../domain/planilha.js';

export { linhasParaTexto };

/** Tamanho máximo de planilha aceito (uma lista de corte real tem poucos KB). */
export const MAX_BYTES_PLANILHA = 5 * 1024 * 1024;

/** @param {ArrayBuffer|Blob} buf  @returns {Promise<string>} */
export async function xlsxParaTexto(buf) {
  const tam = buf && (buf.byteLength != null ? buf.byteLength : buf.size);
  if (tam > MAX_BYTES_PLANILHA) throw new Error('Planilha grande demais (máximo 5 MB).');
  let rows;
  try { rows = await readSheet(buf); } catch (e) { throw new Error('Não consegui ler a planilha. Salve como .xlsx (Excel) ou CSV e tente de novo.', { cause: e }); }
  return linhasParaTexto(rows);
}
