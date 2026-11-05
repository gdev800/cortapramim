// Gera um .xlsx de verdade (mínimo, com sharedStrings) para os testes, sem biblioteca de Excel.
// Um .xlsx é um zip de XMLs; o fflate já vem com o leitor (read-excel-file).
import { zipSync, strToU8 } from 'fflate';

const NS = 'http://schemas.openxmlformats.org';
const xml = (s) => strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + s);
const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const col = (i) => String.fromCharCode(65 + i);

/** @param {Array<Array<string|number>>} linhas  @returns {Uint8Array} */
export function criarXlsx(linhas) {
  const textos = [];
  const idx = (t) => { let i = textos.indexOf(t); if (i < 0) { i = textos.length; textos.push(t); } return i; };
  const rows = linhas.map((l, r) => '<row r="' + (r + 1) + '">' + l.map((v, c) => {
    const ref = col(c) + (r + 1);
    return typeof v === 'number' ? '<c r="' + ref + '"><v>' + v + '</v></c>' : '<c r="' + ref + '" t="s"><v>' + idx(String(v)) + '</v></c>';
  }).join('') + '</row>').join('');
  return zipSync({
    '[Content_Types].xml': xml('<Types xmlns="' + NS + '/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>'),
    '_rels/.rels': xml('<Relationships xmlns="' + NS + '/package/2006/relationships"><Relationship Id="rId1" Type="' + NS + '/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml': xml('<workbook xmlns="' + NS + '/spreadsheetml/2006/main" xmlns:r="' + NS + '/officeDocument/2006/relationships"><sheets><sheet name="Pecas" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': xml('<Relationships xmlns="' + NS + '/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="' + NS + '/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="' + NS + '/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>'),
    'xl/sharedStrings.xml': xml('<sst xmlns="' + NS + '/spreadsheetml/2006/main" count="' + textos.length + '" uniqueCount="' + textos.length + '">' + textos.map((t) => '<si><t xml:space="preserve">' + escXml(t) + '</t></si>').join('') + '</sst>'),
    'xl/worksheets/sheet1.xml': xml('<worksheet xmlns="' + NS + '/spreadsheetml/2006/main"><sheetData>' + rows + '</sheetData></worksheet>'),
  });
}
