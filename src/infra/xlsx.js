// Planilha Excel -> texto de colunas separadas por tab, que o leitor de lista (parseLista) já entende.
// Usa a biblioteca SheetJS carregada pela página (window.XLSX).
import { flagsTxt } from '../core/index.js';
import { norm } from '../domain/units.js';

export function xlsxParaTexto(buf) {
  if (!window.XLSX) throw new Error('O leitor de Excel não carregou. Verifique a conexão e recarregue a página.');
  const wb = window.XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  return linhasParaTexto(rows);
}

/** Parte pura (testável sem a biblioteca): matriz de células -> texto. */
export function linhasParaTexto(rows) {
  let iq = 0, ic = 1, il = 2, inm = 3, start = 0, ifc = -1, ifl = -1, ilv = -1;
  for (let r = 0; r < Math.min(3, rows.length); r++) {
    const h = rows[r].map((x) => norm(x));
    const q = h.findIndex((x) => /^(qtd|qtde|qde|quant)/.test(x));
    const c = h.findIndex((x) => /^(c|comp\w*)$/.test(x));
    const l = h.findIndex((x) => /^(l|larg\w*)$/.test(x));
    const n = h.findIndex((x) => /^(nome|pe[cç]a|descri\w*|item|ambiente)/.test(x));
    if (q >= 0 && c >= 0 && l >= 0) {
      iq = q; ic = c; il = l; inm = n >= 0 ? n : -1; start = r + 1;
      ifc = h.findIndex((x) => /^(fita ?c|fc)/.test(x)); ifl = h.findIndex((x) => /^(fita ?l|fl)/.test(x)); ilv = h.findIndex((x) => /^(livre|gira)/.test(x));
      break;
    }
  }
  const num = (v) => (typeof v === 'number' ? String(v).replace('.', ',') : String(v == null ? '' : v).trim());
  const out = [];
  for (let r = start; r < rows.length; r++) {
    const row = rows[r]; const q = num(row[iq]), c = num(row[ic]), l = num(row[il]);
    if (!/^\d+$/.test(q) || !/^\d+([.,]\d+)?$/.test(c) || !/^\d+([.,]\d+)?$/.test(l)) continue;
    const nm = inm >= 0 ? String(row[inm] == null ? '' : row[inm]).trim() : (start === 0 && row[3] != null ? String(row[3]).trim() : '');
    const fcv = ifc >= 0 ? parseInt(row[ifc], 10) || 0 : 0, flv = ifl >= 0 ? parseInt(row[ifl], 10) || 0 : 0;
    const lv = ilv >= 0 && /^(s|sim|x|1|true)/i.test(String(row[ilv]).trim());
    out.push(q + '\t' + c + '\t' + l + '\t' + nm + flagsTxt({ fc: Math.min(2, fcv), fl: Math.min(2, flv), livre: lv }).replace(/^ ; /, '\t').replace(/ ; /g, ' ; '));
  }
  return out.join('\n');
}
