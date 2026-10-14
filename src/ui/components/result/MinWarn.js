// Aviso no resultado: o que fica abaixo do estoque mínimo depois deste plano.
import { avisosDoPlano } from '../../../domain/restock.js';
import { $, esc } from '../../dom.js';

export default {
  mount(ctx) {
    const { state, bus } = ctx;
    function render() {
      const box = $('avisoMin'), a = state.res && !state.estAtual ? avisosDoPlano(state, state.res) : [];
      if (!a.length) { box.hidden = true; box.innerHTML = ''; return; }
      box.innerHTML = '<div class="label" style="margin-bottom:6px">Abaixo do estoque mínimo</div>' + a.map((t) => '<p class="msg warn">' + esc(t) + '</p>').join('') +
        '<p class="hint">A lista de compras completa fica no Estoque.</p>';
      box.hidden = false;
    }
    ['result', 'insumos', 'needs', 'approved', 'loaded'].forEach((t) => bus.on(t, render));
  },
};
