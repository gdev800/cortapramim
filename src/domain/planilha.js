// Matriz de células de uma planilha -> texto de colunas separadas por tab, que o leitor de lista (parseLista) já entende.
// Função pura: quem lê o arquivo (infra/xlsx.js) entrega as linhas; aqui só se interpreta o conteúdo.
import { flagsTxt } from '../core/index.js';
import { norm } from './units.js';

/** Limite de linhas lidas de uma planilha (o app aceita no máximo 1500 peças, bem abaixo disso). */
export const MAX_LINHAS_PLANILHA = 5000;

export function linhasParaTexto(rows) {
  rows = (Array.isArray(rows) ? rows : []).slice(0, MAX_LINHAS_PLANILHA).map((r) => (Array.isArray(r) ? r : []));
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
  // tab e quebra de linha dentro do nome bagunçariam as colunas do texto
  const celula = (v) => String(v == null ? '' : v).replace(/[\t\r\n]+/g, ' ').trim();
  const out = [];
  for (let r = start; r < rows.length; r++) {
    const row = rows[r]; const q = num(row[iq]), c = num(row[ic]), l = num(row[il]);
    if (!/^\d+$/.test(q) || !/^\d+([.,]\d+)?$/.test(c) || !/^\d+([.,]\d+)?$/.test(l)) continue;
    const nm = inm >= 0 ? celula(row[inm]) : (start === 0 && row[3] != null ? celula(row[3]) : '');
    const fcv = ifc >= 0 ? parseInt(row[ifc], 10) || 0 : 0, flv = ifl >= 0 ? parseInt(row[ifl], 10) || 0 : 0;
    const lv = ilv >= 0 && /^(s|sim|x|1|true)/i.test(String(row[ilv]).trim());
    out.push(q + '\t' + c + '\t' + l + '\t' + nm + flagsTxt({ fc: Math.min(2, Math.max(0, fcv)), fl: Math.min(2, Math.max(0, flv)), livre: lv }).replace(/^ ; /, '\t').replace(/ ; /g, ' ; '));
  }
  return out.join('\n');
}
