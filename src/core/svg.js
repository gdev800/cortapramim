// Desenho de uma chapa em SVG.
import { V, RETALHO_MIN_LISTA } from './constants.js';
import { esc, f1 } from './text.js';

export const PAL_EXPORT = { paper: '#ffffff', sheet: '#e8dcc4', sheetLine: '#2a2118', piece: '#f1ddb8', pieceLine: '#8a5827', text: '#2a2118', cut: '#c9372c', halo: '#ffffff', dim: '#6b5a46' };
export const PAL_SCREEN = { paper: 'var(--draw)', sheet: 'var(--scrap)', sheetLine: 'var(--ink)', piece: 'var(--piece)', pieceLine: 'var(--piece-line)', text: 'var(--fg)', cut: 'var(--cut)', halo: 'var(--draw)', dim: 'var(--muted)' };

export function sheetSVG(sh, pal, opts, totalChapas) {
  const cfg = sh.cfg, SW = cfg.SW, SH = cfg.SH, fu = opts.fu, un = opts.un;
  const ref = cfg.ref || 0, FW = SW + 2 * ref, FH = SH + 2 * ref;
  const m = Math.round(SW * 0.04), hdr = opts.header ? Math.round(SW * 0.075) : 0;
  const vx = -m - ref, vy = -m - ref - hdr, vw = FW + 2 * m, vh = FH + 2 * m + hdr;
  const fs = SW / 72, lw = SW / 1300, hp = SW / 90;
  let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vx + ' ' + vy + ' ' + vw + ' ' + vh + '"';
  if (opts.px) s += ' width="' + opts.px + '" height="' + Math.round(opts.px * vh / vw) + '"';
  s += ' role="img" aria-label="Chapa ' + sh.n + ' com ' + sh.pecas.length + ' peças e ' + sh.nCortes + ' cortes" font-family="ui-monospace, Menlo, Consolas, monospace">';
  s += '<defs><pattern id="hat' + sh.n + '" width="' + hp + '" height="' + hp + '" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="' + hp + '" style="stroke:' + pal.dim + ';stroke-width:' + lw + '" opacity="0.5"/></pattern></defs>';
  if (!cfg.rot) { const gh = SH / 70; s = s.replace('</defs>', '<pattern id="gr' + sh.n + '" width="' + SW + '" height="' + gh + '" patternUnits="userSpaceOnUse"><path d="M0 ' + (gh * 0.3) + ' Q' + (SW * 0.25) + ' ' + (gh * 0.1) + ' ' + (SW * 0.5) + ' ' + (gh * 0.3) + ' T' + SW + ' ' + (gh * 0.3) + ' M0 ' + (gh * 0.75) + ' Q' + (SW * 0.3) + ' ' + (gh * 0.95) + ' ' + (SW * 0.6) + ' ' + (gh * 0.75) + ' T' + SW + ' ' + (gh * 0.75) + '" style="fill:none;stroke:' + pal.dim + ';stroke-width:' + (SW / 2600) + '" opacity="0.22"/></pattern></defs>'); }
  s += '<rect x="' + vx + '" y="' + vy + '" width="' + vw + '" height="' + vh + '" style="fill:' + pal.paper + '"/>';
  const mr = sh.maiorRetalho;
  if (opts.header) {
    s += '<text x="0" y="' + (-m - ref - hdr * 0.25) + '" font-size="' + (fs * 1.5) + '" font-weight="700" style="fill:' + pal.text + '">Chapa ' + sh.n + ' de ' + totalChapas + ' · ' + esc(sh.mat) + '</text>';
    s += '<text x="0" y="' + (-m - ref + fs * 0.9) + '" font-size="' + (fs * 1.05) + '" style="fill:' + pal.dim + '">' + fu(FW) + ' × ' + fu(FH) + ' ' + un + ' · ' + (sh.sobra ? 'sobra do estoque · ' : '') + (sh.esp ? sh.esp + ' mm · ' : '') + (cfg.rot ? 'sem veio' : 'com veio (sem girar)') + ' · aproveitamento ' + f1(sh.util * 100) + '% · ' + (mr ? 'maior retalho ' + fu(mr.w) + '×' + fu(mr.h) : 'sem retalho útil') + ' · ' + sh.nCortes + ' cortes</text>';
  } else {
    s += '<text x="' + (SW / 2) + '" y="' + (-ref - m * 0.32) + '" font-size="' + fs + '" text-anchor="middle" style="fill:' + pal.dim + '">' + fu(FW) + ' ' + un + '</text>';
  }
  s += '<text transform="translate(' + (-ref - m * 0.35) + ' ' + (SH / 2) + ') rotate(-90)" font-size="' + fs + '" text-anchor="middle" style="fill:' + pal.dim + '">' + fu(FH) + ' ' + un + '</text>';
  if (!cfg.rot) {
    // seta do veio: ao longo do comprimento da chapa
    const ay = SH + ref + m * 0.62, ax1 = SW * 0.42, ax2 = SW * 0.58;
    s += '<g style="stroke:' + pal.dim + ';stroke-width:' + (lw * 1.4) + ';fill:none"><line x1="' + ax1 + '" y1="' + ay + '" x2="' + ax2 + '" y2="' + ay + '"/><path d="M' + (ax2 - fs * 0.8) + ' ' + (ay - fs * 0.45) + ' L' + ax2 + ' ' + ay + ' L' + (ax2 - fs * 0.8) + ' ' + (ay + fs * 0.45) + '"/></g>';
    s += '<text x="' + (ax2 + fs * 0.9) + '" y="' + (ay + fs * 0.34) + '" font-size="' + (fs * 0.85) + '" style="fill:' + pal.dim + '">veio</text>';
  }
  if (ref > 0) {
    s += '<rect x="' + (-ref) + '" y="' + (-ref) + '" width="' + FW + '" height="' + FH + '" style="fill:' + pal.sheet + ';stroke:' + pal.sheetLine + ';stroke-width:' + (lw * 2) + '"/>';
    s += '<rect x="0" y="0" width="' + SW + '" height="' + SH + '" style="fill:none;stroke:' + pal.dim + ';stroke-width:' + lw + ';stroke-dasharray:' + (hp * 0.5) + ' ' + (hp * 0.5) + '"/>';
  } else {
    s += '<rect x="0" y="0" width="' + SW + '" height="' + SH + '" style="fill:' + pal.sheet + ';stroke:' + pal.sheetLine + ';stroke-width:' + (lw * 2) + '"/>';
  }
  // opts.todos (tela ampliada): mostra todos os retalhos, não só os acima do mínimo útil. Sem ela o desenho é o de sempre.
  sh.restos.forEach(function (r, ri) {
    if (!opts.todos ? !r.util : Math.min(r.w, r.h) < RETALHO_MIN_LISTA) return;
    const marca = opts.todos ? ' data-resto="' + ri + '"' : '', sel = !!opts.todos && opts.destaque === ri;
    s += '<rect' + marca + ' x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" style="fill:url(#hat' + sh.n + ');stroke:' + (sel ? '#b0702a' : pal.dim) + ';stroke-width:' + (sel ? lw * 5 : lw) + ';stroke-dasharray:' + (sel ? 'none' : (hp * 1.2) + ' ' + (hp * 0.8)) + (opts.todos ? ';cursor:pointer' : '') + '"/>';
  });
  sh.pecas.forEach(function (q) {
    s += '<rect x="' + q.x + '" y="' + q.y + '" width="' + q.w + '" height="' + q.h + '" style="fill:' + pal.piece + ';stroke:' + pal.pieceLine + ';stroke-width:' + lw + '"/>';
  });
  if (!cfg.rot) s += '<rect x="0" y="0" width="' + SW + '" height="' + SH + '" style="fill:url(#gr' + sh.n + ')"/>';
  sh.pecas.forEach(function (q) {
    const dims = fu(q.w) + '×' + fu(q.h) + (q.girada ? ' ↻' : '');
    const nm = q.nome || '';
    const sz = function (lab, lines) { return Math.min(SW / 62, q.h / (2.4 * lines), q.w / (lab.length * 0.62)); };
    const two = nm && sz(nm.length > dims.length ? nm : dims, 2) >= SW / 200;
    if (two) {
      const size = sz(nm.length > dims.length ? nm : dims, 2);
      const cx = q.x + q.w / 2, cy = q.y + q.h / 2;
      s += '<text x="' + cx + '" y="' + (cy - size * 0.1) + '" font-size="' + size + '" font-weight="700" text-anchor="middle" style="fill:' + pal.text + '">' + esc(nm) + '</text>';
      s += '<text x="' + cx + '" y="' + (cy + size * 1.05) + '" font-size="' + size + '" text-anchor="middle" style="fill:' + pal.text + '">' + dims + '</text>';
    } else {
      const size = sz(dims, 1);
      if (size >= SW / 260) s += '<text x="' + (q.x + q.w / 2) + '" y="' + (q.y + q.h / 2 + size * 0.34) + '" font-size="' + size + '" text-anchor="middle" style="fill:' + pal.text + '">' + dims + '</text>';
    }
  });
  sh.restos.forEach(function (r, ri) {
    if (!opts.todos ? !r.util : Math.min(r.w, r.h) < RETALHO_MIN_LISTA) return;
    const lab = (opts.todos ? 'R' + (ri + 1) + ' ' : 'retalho ') + fu(r.w) + '×' + fu(r.h);
    const vert = !!opts.todos && r.h > r.w * 1.4, aw = vert ? r.h : r.w, ah = vert ? r.w : r.h; // tira em pé: texto deitado
    const size = Math.min(SW / 55, ah / 3, aw / (lab.length * 0.62)), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    if (size >= (opts.todos ? SW / 800 : SW / 260)) s += '<text' + (vert ? ' transform="rotate(-90 ' + cx + ' ' + cy + ')"' : '') + ' x="' + cx + '" y="' + (cy + size * 0.34) + '" font-size="' + size + '" text-anchor="middle" style="fill:' + pal.text + ';paint-order:stroke;stroke:' + pal.halo + ';stroke-width:' + (size * 0.3) + 'px' + (opts.todos ? ';pointer-events:none' : '') + '">' + lab + '</text>';
  });
  sh.cortes.forEach(function (c) {
    if (c.tipo === 'V') s += '<line x1="' + c.pos + '" y1="' + c.ini + '" x2="' + c.pos + '" y2="' + c.fim + '" style="stroke:' + pal.cut + ';stroke-width:' + (lw * 1.6) + '"/>';
    else s += '<line x1="' + c.ini + '" y1="' + c.pos + '" x2="' + c.fim + '" y2="' + c.pos + '" style="stroke:' + pal.cut + ';stroke-width:' + (lw * 1.6) + '"/>';
  });
  if (opts.numbers) {
    const nf = SW / 110, halo = 'paint-order:stroke;stroke:' + pal.halo + ';stroke-width:' + (nf * 0.35) + ';stroke-linejoin:round;';
    sh.cortes.forEach(function (c, i) {
      const tx = c.tipo === 'V' ? c.pos : c.ini + nf * 0.9, ty = c.tipo === 'V' ? c.ini + nf * 1.1 : c.pos - nf * 0.25;
      s += '<text x="' + tx + '" y="' + ty + '" font-size="' + nf + '" font-weight="700" text-anchor="middle" style="' + halo + 'fill:' + pal.cut + '">' + (i + 1) + '</text>';
    });
  }
  s += '</svg>';
  return { svg: s, w: vw, h: vh };
}
