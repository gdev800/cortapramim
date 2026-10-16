// Uma ficha por chapa: desenho, peças e sequência de cortes.
import { sheetSVG, PAL_SCREEN } from '../../../core/index.js';
import { pct } from '../../../domain/units.js';
import { retalhosDaChapa } from '../../../domain/scraps.js';
import { $, esc } from '../../dom.js';
import { gruposDeDesenho, textoDesenho } from '../../../domain/patterns.js';

export default {
  mount(ctx) {
    const { state, bus, fu } = ctx;
    // Painel "Editar peças" de uma chapa: girar, mover para outra chapa do mesmo material e trocar duas peças.
    function editorHTML(g, s) {
      if (state.estAtual) return '';
      if (!s.spec) return '<p class="hint">Plano de uma versão antiga: calcule de novo para poder editar à mão.</p>';
      const ord = (sh) => sh.pecas.slice().sort((a, b) => a.id - b.id);
      const outras = g.sheets.filter((o) => o.n !== s.n);
      const opc = (lista) => lista.map(([q, sh]) => '<option value="' + q.id + '">#' + q.id + ' ' + esc(q.nome || '') + ' (chapa ' + sh.n + ')</option>').join('');
      const linhas = ord(s).map((q) => '<tr><td>' + q.id + '</td><td class="n">' + esc(q.nome || '—') + '</td>' +
        '<td><button type="button" data-ed="girar" data-id="' + q.id + '">↻ Girar</button></td><td>' +
        (outras.length ? '<select data-ed="mover" data-id="' + q.id + '" aria-label="Mover a peça ' + q.id + ' para outra chapa"><option value="">Escolher chapa…</option>' + outras.map((o) => '<option value="' + o.n + '">Chapa ' + o.n + '</option>').join('') + '</select>' : '—') + '</td></tr>').join('');
      const todas = []; g.sheets.forEach((sh) => ord(sh).forEach((q) => todas.push([q, sh])));
      return '<details class="ed" data-ed-sheet="' + s.n + '"><summary>Editar peças' + (s.manual ? ' <span class="tag">editada à mão</span>' : '') + '</summary>' +
        '<div class="tbl"><table><thead><tr><th>#</th><th>Nome</th><th>Girar</th><th>Mover para</th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
        '<div class="row" style="margin-top:10px;align-items:center"><span>Trocar</span><select data-ed-a aria-label="Primeira peça">' + opc(ord(s).map((q) => [q, s])) + '</select><span>com</span><select data-ed-b aria-label="Segunda peça">' + opc(todas) + '</select><button type="button" data-ed="trocar">Trocar</button></div></details>';
    }

    function render() {
      const des = state.res ? gruposDeDesenho(state.res) : new Map();
      const res = state.res; if (!res) return;
      const abertos = new Set(Array.from(document.querySelectorAll('#sheets details.ed[open]')).map((d) => d.dataset.edSheet));
      const un = state.unit; let nCh = 0; res.groups.forEach((g) => { nCh += g.sheets.length; });
      let h = '';
      res.groups.forEach((g) => g.sheets.forEach((s) => {
        const mr = s.maiorRetalho, ref = s.cfg.ref || 0, temF = s.pecas.some((q) => q.cf), temP = s.pecas.some((q) => q.proj);
        const svg = sheetSVG(s, PAL_SCREEN, { fu, un, header: false, numbers: !!state.aj.num }, nCh);
        h += '<article class="sheet" data-n="' + s.n + '"><div class="sheet-h"><div><h3>Chapa ' + s.n + ' de ' + nCh + (s.sobra ? '<span class="tag">sobra do estoque</span>' : '') + (des.get(s.n) ? '<span class="tag" data-desenho>' + esc(textoDesenho(des.get(s.n))) + '</span>' : '') + '</h3><div class="mat">' + esc(g.mat) + (g.esp ? ' · ' + g.esp + ' mm' : '') + ' · ' + fu(s.cfg.SW + 2 * ref) + ' × ' + fu(s.cfg.SH + 2 * ref) + ' ' + un + (g.veio ? ' · com veio' : '') + '</div></div>' +
          '<dl class="stats"><div><dt>Aproveitamento</dt><dd>' + pct(s.util) + '%</dd></div><div><dt>Maior retalho</dt><dd>' + (mr ? fu(mr.w) + '×' + fu(mr.h) : '—') + '</dd></div><div><dt>Peças</dt><dd>' + s.pecas.length + '</dd></div><div><dt>Cortes</dt><dd>' + s.nCortes + '</dd></div>' + (s.cfg.fases ? '<div><dt>Fases</dt><dd>' + s.fases + '</dd></div>' : '') + '</dl></div>' +
          '<div class="draw-wrap" data-zoom="' + s.n + '" title="Clique para ampliar e ver os retalhos" style="cursor:zoom-in">' + svg.svg + '</div>' +
          '<div class="row"><button type="button" data-zoom="' + s.n + '">Ampliar e ver retalhos (' + retalhosDaChapa(s).length + ')</button></div>' + editorHTML(g, s) +
          '<details><summary>Lista de peças</summary><div class="tbl"><table><thead><tr><th>#</th><th>Nome</th><th>C</th><th>L</th><th>X</th><th>Y</th><th>Giro</th><th>Fita C/L</th>' + (temF ? '<th>Final</th>' : '') + (temP ? '<th>Projeto</th>' : '') + '</tr></thead><tbody>' +
          s.pecas.slice().sort((a, b) => a.id - b.id).map((q) => '<tr><td>' + q.id + '</td><td class="n">' + esc(q.nome || '—') + '</td><td>' + fu(q.c) + '</td><td>' + fu(q.l) + '</td><td>' + fu(q.x) + '</td><td>' + fu(q.y) + '</td><td>' + (q.girada ? '↻' : '') + '</td><td>' + ((q.fc || q.fl) ? (q.fc || 0) + '/' + (q.fl || 0) : '') + '</td>' + (temF ? '<td>' + (q.cf ? fu(q.cf) + ' × ' + fu(q.lf) : '') + '</td>' : '') + (temP ? '<td class="n">' + esc(q.proj || '') + '</td>' : '') + '</tr>').join('') +
          '</tbody></table></div></details>' +
          '<details><summary>Sequência de cortes (' + s.nCortes + ')</summary><div class="tbl"><table><thead><tr><th>#</th><th>Direção</th><th>Posição</th><th>De</th><th>Até</th>' + (s.cfg.fases ? '<th>Fase</th>' : '') + '</tr></thead><tbody>' +
          s.cortes.map((cc, i) => '<tr><td>' + (i + 1) + '</td><td>' + (cc.tipo === 'V' ? 'Vertical' : 'Horizontal') + '</td><td>' + fu(cc.pos) + '</td><td>' + fu(cc.ini) + '</td><td>' + fu(cc.fim) + '</td>' + (s.cfg.fases ? '<td>' + cc.fase + '</td>' : '') + '</tr>').join('') +
          '</tbody></table></div></details></article>';
      }));
      $('sheets').innerHTML = h;
      document.querySelectorAll('#sheets details.ed').forEach((d) => { if (abertos.has(d.dataset.edSheet)) d.open = true; });
    }
    bus.on('result', render); bus.on('unit', render);
  },
};
