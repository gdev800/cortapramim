// "Fita e ferragens": o que o plano consome contra o que há em estoque.
import { necessidades } from '../../../domain/supplies.js';
import { toStr } from '../../../domain/units.js';
import { $, esc } from '../../dom.js';

export default {
  mount(ctx) {
    const { state, bus } = ctx;
    function render() {
      const box = $('insCompra'); const n = state.res ? necessidades(state, state.res) : [];
      if (!n.length) { box.hidden = true; return; }
      box.innerHTML = '<div class="label" style="margin-bottom:6px">Fita e ferragens</div><div class="tbl"><table><thead><tr><th>Item</th><th>Precisa</th><th>Tenho</th><th>Comprar</th></tr></thead><tbody>' +
        n.map((x) => { const c = Math.max(0, Math.round((x.precisa - x.tenho) * 10) / 10); return '<tr><td class="n">' + esc(x.nome) + '</td><td>' + toStr(x.precisa) + ' ' + x.un + '</td><td>' + (x.achou ? toStr(x.tenho) + ' ' + x.un : '—') + '</td><td><b>' + toStr(c) + ' ' + x.un + '</b></td></tr>'; }).join('') +
        '</tbody></table></div><p class="hint" style="margin-top:6px">A fita já inclui 10% de perda. O estoque é comparado pelo nome igual ao cadastrado.</p>';
      box.hidden = false;
    }
    ['result', 'insumos', 'needs'].forEach((t) => bus.on(t, render));
  },
};
