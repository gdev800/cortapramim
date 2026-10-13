// Vitrine do topo da página.
import html from './template.html';
import './hero.css';
import { $, rolarPara } from '../../dom.js';

export default {
  template: () => html,
  mount(ctx) {
    $('heroEx').addEventListener('click', () => {
      ctx.actions.carregarExemplo();
      rolarPara($('montar'));
      ctx.actions.calcular(5);
    });
  },
};
