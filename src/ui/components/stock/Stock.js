// Estoque (sobras, fita e ferragens) escondido por padrão: abre com um clique, com o resumo no botão.
import { $ } from '../../dom.js';

export default {
  abre:
    '<details class="estoque" id="sobras"><summary><span class="estoque-t">Estoque: sobras, fita e ferragens</span><span class="estoque-r" id="estoqueResumo"></span></summary>' +
    '<p class="hint estoque-d">Retalhos guardados e materiais que você tem. Quando material, espessura e veio combinam, o plano usa as sobras antes de pedir chapa nova.</p><div class="estoque-in">',
  fecha: '</div></details>',
  mount(ctx) {
    const { state, bus } = ctx;
    const det = $('sobras');
    const n = (k, um, ois) => k + ' ' + (k === 1 ? um : ois);
    const resumo = () => { $('estoqueResumo').textContent = n(state.estoque.length, 'sobra', 'sobras') + ' · ' + n(state.insumos.length, 'item de fita e ferragem', 'itens de fita e ferragens'); };
    ['estoque', 'insumos', 'loaded'].forEach((e) => bus.on(e, resumo));
    resumo();
    // O link "Estoque" da barra do topo abre a seção.
    document.querySelector('.nav-links a[data-sec="sobras"]').addEventListener('click', () => { det.open = true; });
  },
};
