// Aprovar o plano (libera exportar) ou voltar a editar.
import { $, rolarPara } from '../../dom.js';

export default {
  mount(ctx) {
    const { state, bus } = ctx;
    function render() {
      $('btnAprovar').hidden = state.approved; $('btnEditar').hidden = !state.approved;
      $('aprovarTxt').textContent = state.approved ? 'Plano aprovado. Baixe as imagens e as listas abaixo para levar à plataforma de corte.' : 'Gostou do plano? Aprove para liberar as imagens PNG, as etiquetas e a atualização do estoque de sobras.';
    }
    $('btnAprovar').addEventListener('click', () => { state.approved = true; bus.emit('approved'); rolarPara($('exportBox'), 'nearest'); });
    $('btnEditar').addEventListener('click', () => { state.approved = false; bus.emit('approved'); rolarPara($('t-entrada')); });
    bus.on('result', render); bus.on('approved', render); bus.on('loaded', render);
  },
};
