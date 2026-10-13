// Ferragens do projeto, mão de obra e margem (custos).
import html from './ferragens.html';
import { esc } from '../../dom.js';
import { $ } from '../../dom.js';

export default {
  template: () => html,
  mount(ctx) {
    const { state, bus } = ctx;

    function render() {
      $('ferrRows').innerHTML = state.ferr.map((f) =>
        '<div class="frow" data-f="' + f.uid + '"><input data-k="n" placeholder="Item (ex.: Dobradiça 35 mm)" value="' + esc(f.n) + '" aria-label="Item de ferragem"><input data-k="q" inputmode="numeric" placeholder="Qtde" value="' + esc(f.q) + '" aria-label="Quantidade"><input data-k="p" inputmode="decimal" placeholder="R$ un." value="' + esc(f.p) + '" aria-label="Preço unitário"><button type="button" class="del" data-del="' + f.uid + '" aria-label="Remover item">×</button></div>').join('');
    }
    const sync = () => { render(); $('orcMao').value = state.orc.mao; $('orcMargem').value = state.orc.margem; };

    $('ferrRows').addEventListener('input', (ev) => {
      const row = ev.target.closest('.frow'); if (!row) return;
      const f = state.ferr.find((x) => x.uid === parseInt(row.dataset.f, 10)); if (f) f[ev.target.dataset.k] = ev.target.value;
      ctx.save(); bus.emit('needs'); // a lista de compras de ferragens depende desses itens
    });
    $('ferrRows').addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-del]'); if (!b) return;
      state.ferr = state.ferr.filter((f) => f.uid !== parseInt(b.dataset.del, 10)); render(); ctx.save();
    });
    $('btnAddFerr').addEventListener('click', () => {
      state.ferr.push({ uid: ++state.uid, n: '', q: '', p: '' }); render();
      const l = $('ferrRows').querySelectorAll('.frow'); if (l.length) l[l.length - 1].querySelector('input').focus();
      ctx.save();
    });
    $('orcMao').addEventListener('input', function () { state.orc.mao = this.value; ctx.save(); });
    $('orcMargem').addEventListener('input', function () { state.orc.margem = this.value; ctx.save(); });

    bus.on('loaded', sync);
  },
};
