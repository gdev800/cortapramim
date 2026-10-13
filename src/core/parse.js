// Leitura da lista de peças (caderno, colunas de planilha, marcações de fita e giro).

// Aceita linhas no estilo do caderno ("2 = 54,3 x 49 = Fundo") ou colunas de planilha (Qtde, C, L, Nome).
const NUM = '(\\d+(?:[.,]\\d+)?)';
const reN = new RegExp('^\\s*(\\d+)\\s*(?:[=:\\-xX×*]|\\s)\\s*' + NUM + '\\s*(?:[xX×*])\\s*' + NUM + '(?:\\s*(?:[=\\-:;\\t]|\\s)\\s*(.*?))?\\s*$');
const reT = new RegExp('^\\s*(\\d+)[\\t;]+' + NUM + '[\\t;]+' + NUM + '(?:[\\t;]+(.*?))?\\s*$');
const reS = new RegExp('^\\s*(\\d+)\\s+' + NUM + '\\s+' + NUM + '(?:\\s+(.*?))?\\s*$');
// Depois do nome, aceita: "; fita 2C 1L ; livre" ou, em colunas de planilha, FitaC, FitaL, Livre.
export function extraiFlags(raw) {
  const seg = String(raw).split(/\t|\s*[;|]\s*/).map(function (s) { return s.trim(); });
  let nome = seg[0], resto = seg.slice(1).join(' ');
  if (/^(fita\b|livre\b|\d\s*[CL]\b)/i.test(nome)) { resto = seg.join(' '); nome = ''; }
  nome = nome.replace(/\s+/g, ' ').trim();
  let fc = 0, fl = 0, livre = false;
  if (/\blivre\b|\bgira\b/i.test(resto)) { livre = true; resto = resto.replace(/\blivre\b|\bgira\b/ig, ' '); }
  const mc = /(\d)\s*C\b/i.exec(resto), ml = /(\d)\s*L\b/i.exec(resto);
  if (mc || ml) { fc = mc ? +mc[1] : 0; fl = ml ? +ml[1] : 0; }
  else { const mn = /^\s*(?:fita\s*)?(\d)\s+(\d)\s*$/i.exec(resto); if (mn) { fc = +mn[1]; fl = +mn[2]; } }
  return { nome: nome, fc: Math.min(2, fc), fl: Math.min(2, fl), livre: livre };
}
export function flagsTxt(r) {
  const t = [];
  if (r.fc || r.fl) t.push('fita ' + (r.fc || 0) + 'C ' + (r.fl || 0) + 'L');
  if (r.livre) t.push('livre');
  return t.length ? ' ; ' + t.join(' ; ') : '';
}
export function parseLista(text) {
  const rows = [], ignorados = [];
  text.split(/\r?\n/).forEach(function (raw) {
    const line = raw.trim();
    if (!line) return;
    const m = reT.exec(line) || reN.exec(line) || reS.exec(line);
    if (!m) { if (!/^(qtd|qtde|quant|pe[cç]a|item|#)/i.test(line)) ignorados.push(line); return; }
    const qty = parseInt(m[1], 10), c = parseFloat(m[2].replace(',', '.')), l = parseFloat(m[3].replace(',', '.'));
    const ex = extraiFlags((m[4] || '').replace(/^[=\-:\s]+/, ''));
    if (!(qty > 0) || !(c > 0) || !(l > 0)) { ignorados.push(line); return; }
    rows.push({ qty: qty, c: c, l: l, nome: ex.nome, fc: ex.fc, fl: ex.fl, livre: ex.livre });
  });
  return { rows: rows, ignorados: ignorados };
}
