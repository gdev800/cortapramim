// Editar o plano à mão: ouve os botões de "Editar peças" (desenhados pelo Sheets) e a barra Desfazer / Conferir.
import { girar, trocar, mover, desfazer, conferir } from '../../../domain/edit.js';
import { $ } from '../../dom.js';

export default {
  mount(ctx) {
    const { state, bus } = ctx;
    const dizer = (t, kind) => { const e = $('editMsg'); e.textContent = t || ''; e.className = 'hint' + (kind ? ' ' + kind : ''); };
    const barra = () => { $('editBar').hidden = !state.res; $('btnDesfazer').disabled = !(state.hist && state.hist.length); };
    function depois(r) {
      dizer(r.msg, r.ok ? 'ok' : 'warn');
      if (r.ok) { bus.emit('result'); bus.emit('approved'); ctx.save(); }
    }
    $('sheets').addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-ed]'); if (!b || !state.res) return;
      if (b.dataset.ed === 'girar') depois(girar(state, parseInt(b.dataset.id, 10)));
      else if (b.dataset.ed === 'trocar') {
        const box = b.closest('.row');
        depois(trocar(state, parseInt(box.querySelector('[data-ed-a]').value, 10), parseInt(box.querySelector('[data-ed-b]').value, 10)));
      }
    });
    $('sheets').addEventListener('change', (ev) => {
      const s = ev.target.closest('select[data-ed="mover"]'); if (!s || !s.value || !state.res) return;
      depois(mover(state, parseInt(s.dataset.id, 10), parseInt(s.value, 10)));
    });
    $('btnDesfazer').addEventListener('click', () => depois(desfazer(state)));
    $('btnConferir').addEventListener('click', () => { const r = conferir(state); dizer(r.msg, r.ok ? 'ok' : 'warn'); });
    bus.on('result', barra); bus.on('loaded', barra);
  },
};
