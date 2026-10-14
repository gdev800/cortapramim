// Movimentações do estoque (extrato): lista as mais recentes e desfaz a última.
import html from './template.html';
import { textoMovimento, desfazerUltimo } from '../../../domain/history.js';
import { $, esc } from '../../dom.js';

export const MOSTRAR = 50;

export default {
  template: () => html,
  mount(ctx) {
    const { state, bus, pers } = ctx;
    let confirmar = false;
    function render() {
      const h = state.historico || [], ult = h[h.length - 1];
      $('btnMovDesfazer').disabled = !(ult && ult.desfazer);
      $('btnMovDesfazer').textContent = 'Desfazer o último'; confirmar = false;
      if (!h.length) { $('movList').innerHTML = '<p class="hint">Nenhuma movimentação ainda. Elas aparecem quando você cadastra algo no estoque ou atualiza o estoque com um plano aprovado.</p>'; return; }
      $('movList').innerHTML = h.slice(-MOSTRAR).reverse().map((m) => {
        const t = textoMovimento(m);
        return '<div class="srow mov mov-' + esc(m.tipo) + '"><span><b style="font-family:var(--f-body);font-weight:600">' + esc(t.titulo) + '</b><br><span class="hint">' + esc(t.detalhe) + '</span></span><span class="hint">' + esc(t.data) + '</span></div>';
      }).join('');
    }
    $('btnMovDesfazer').addEventListener('click', async () => {
      if (!confirmar) { confirmar = true; $('btnMovDesfazer').textContent = 'Confirmar: desfazer'; setTimeout(() => { if (confirmar) render(); }, 4000); return; }
      const r = desfazerUltimo(state);
      $('movMsg').textContent = r.msg;
      if (r.ok) {
        await pers.saveEstoque(); pers.saveInsumos(); pers.saveHistorico();
        bus.emit('estoque'); bus.emit('insumos'); bus.emit('approved'); ctx.save();
      }
      render();
    });
    bus.on('historico', render); bus.on('estoque', render); bus.on('loaded', render);
    render();
  },
};
