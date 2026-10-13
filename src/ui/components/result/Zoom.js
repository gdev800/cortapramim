// Chapa ampliada: desenho grande com zoom e a lista de todos os retalhos, cada um com "Guardar como sobra".
import { sheetSVG, PAL_SCREEN } from '../../../core/index.js';
import { retalhosDaChapa, guardarRetalho } from '../../../domain/scraps.js';
import { $, esc } from '../../dom.js';

export default {
  mount(ctx) {
    const { state, bus, fu } = ctx;
    let atual = 0, nivel = 1, sel = -1;
    const achar = (n) => { for (const g of state.res.groups) for (const s of g.sheets) if (s.n === n) return { g, s }; return null; };
    const dizer = (t) => { $('zoomMsg').textContent = t || ''; };

    function render() {
      const a = state.res && achar(atual); if (!a) { if ($('zoomDlg').open) $('zoomDlg').close(); return; }
      const { g, s } = a, un = state.unit; let total = 0; state.res.groups.forEach((x) => { total += x.sheets.length; });
      $('zoomTitulo').textContent = 'Chapa ' + s.n + ' de ' + total + ' · ' + g.mat;
      const dr = $('zoomDraw'), sx = dr.scrollLeft, sy = dr.scrollTop;
      dr.innerHTML = sheetSVG(s, PAL_SCREEN, { fu, un, header: false, numbers: !!state.aj.num, todos: true, destaque: sel }, total).svg;
      dr.firstElementChild.style.width = (nivel * 100) + '%';
      dr.scrollLeft = sx; dr.scrollTop = sy;
      const rets = retalhosDaChapa(s);
      $('zoomList').innerHTML = '<div class="label" style="margin-bottom:6px">Retalhos (' + rets.length + ')</div>' + (rets.length ? rets.map((r) =>
        '<div class="srow" data-i="' + r.i + '" aria-selected="' + (sel === r.i) + '"><span><b>R' + (r.i + 1) + '</b> ' + fu(r.w) + ' × ' + fu(r.h) + ' ' + un + (r.util ? '' : ' <span class="tag">pequeno</span>') + '</span>' +
        (r.guardado ? '<button type="button" disabled>Guardada ✓</button>' : '<button type="button" class="primary" data-guardar="' + r.i + '">Guardar como sobra</button>') + '</div>').join('')
        : '<p class="hint">Esta chapa não tem retalhos.</p>');
    }
    function abrir(n) {
      atual = n; nivel = 1; sel = -1; dizer('');
      render();
      if (!$('zoomDlg').open) $('zoomDlg').showModal();
    }

    $('sheets').addEventListener('click', (ev) => { const z = ev.target.closest('[data-zoom]'); if (z && state.res) abrir(parseInt(z.dataset.zoom, 10)); });
    $('zoomDraw').addEventListener('click', (ev) => {
      const r = ev.target.closest('[data-resto]'); if (!r) return;
      sel = parseInt(r.dataset.resto, 10); render();
      const row = $('zoomList').querySelector('[data-i="' + sel + '"]'); if (row) row.scrollIntoView({ block: 'nearest' });
    });
    $('zoomList').addEventListener('click', async (ev) => {
      const b = ev.target.closest('button[data-guardar]');
      if (b) {
        const r = guardarRetalho(state, atual, parseInt(b.dataset.guardar, 10));
        dizer(r.msg);
        if (r.ok) { await ctx.pers.saveEstoque(); bus.emit('estoque'); bus.emit('approved'); ctx.save(); }
        render(); return;
      }
      const row = ev.target.closest('[data-i]'); if (row) { sel = parseInt(row.dataset.i, 10); render(); }
    });
    $('zmMais').addEventListener('click', () => { nivel = Math.min(4, nivel + 0.5); render(); });
    $('zmMenos').addEventListener('click', () => { nivel = Math.max(1, nivel - 0.5); render(); });
    $('zmAjusta').addEventListener('click', () => { nivel = 1; render(); });
    $('zmFecha').addEventListener('click', () => $('zoomDlg').close());
    $('zoomDlg').addEventListener('click', (ev) => { if (ev.target === $('zoomDlg')) $('zoomDlg').close(); });
    bus.on('loaded', () => { if ($('zoomDlg').open) $('zoomDlg').close(); });
  },
};
