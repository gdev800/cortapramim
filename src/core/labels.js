// Folha de etiquetas em SVG.
import { esc } from './text.js';

// Folha de etiquetas (3 colunas) para recortar e colar nas peças.
export function labelsSVG(res, fu, un) {
  const items = [];
  res.groups.forEach(function (g) { g.sheets.forEach(function (sh) { sh.pecas.slice().sort(function (a, b) { return a.id - b.id; }).forEach(function (q) { items.push({ q: q, sh: sh, g: g }); }); }); });
  const cols = 3, W = 600, Hh = 260, rows = Math.max(1, Math.ceil(items.length / cols)), tw = cols * W, th = rows * Hh;
  let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + tw + ' ' + th + '" width="' + tw + '" height="' + th + '" font-family="ui-monospace, Menlo, Consolas, monospace"><rect width="' + tw + '" height="' + th + '" fill="#fff"/>';
  items.forEach(function (it, i) {
    const x = (i % cols) * W, y = Math.floor(i / cols) * Hh, q = it.q;
    const nm = (q.nome ? q.nome : 'Peça').slice(0, 26);
    const fita = (q.fc || q.fl) ? 'Fita: C×' + (q.fc || 0) + '  L×' + (q.fl || 0) : '';
    s += '<rect x="' + (x + 6) + '" y="' + (y + 6) + '" width="' + (W - 12) + '" height="' + (Hh - 12) + '" rx="10" fill="#fff" stroke="#14202b" stroke-width="3" stroke-dasharray="10 6"/>';
    s += '<text x="' + (x + 24) + '" y="' + (y + 56) + '" font-size="34" font-weight="700" fill="#14202b">#' + q.id + ' ' + esc(nm) + '</text>';
    s += '<text x="' + (x + 24) + '" y="' + (y + 122) + '" font-size="46" font-weight="700" fill="#14202b">' + fu(q.c) + ' × ' + fu(q.l) + ' ' + un + '</text>';
    s += '<text x="' + (x + 24) + '" y="' + (y + 172) + '" font-size="24" fill="#4b5b69">Chapa ' + it.sh.n + ' · ' + esc(String(it.g.mat).slice(0, 30)) + '</text>';
    if (fita) s += '<text x="' + (x + 24) + '" y="' + (y + 212) + '" font-size="26" fill="#14202b">' + fita + '</text>';
    if (q.proj) s += '<text x="' + (x + 24) + '" y="' + (y + 86) + '" font-size="22" fill="#4b5b69">Projeto: ' + esc(String(q.proj).slice(0, 34)) + '</text>';
    if (q.cf) s += '<text x="' + (x + 24) + '" y="' + (y + 244) + '" font-size="22" fill="#4b5b69">final com fita ' + fu(q.cf) + ' × ' + fu(q.lf) + '</text>';
  });
  s += '</svg>';
  return { svg: s, w: tw, h: th };
}
