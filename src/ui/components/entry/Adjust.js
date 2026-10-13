// Ajustes do corte: serra, refilo, retalho mínimo, tempo e numeração dos cortes.
import html from './adjust.html';
import { DEFAULT_AJ } from '../../../domain/state.js';
import { $ } from '../../dom.js';

export default {
  template: () => html,
  mount(ctx) {
    const { state, bus } = ctx;
    const read = () => {
      state.aj = { K: $('ajK').value, minRet: $('ajMin').value, tempo: $('ajTempo').value, num: $('ajNum').checked, refilo: $('ajRef').value, fitaEsp: $('ajFita').value, fases: $('ajFases').value };
      ctx.save();
    };
    ['ajK', 'ajMin', 'ajTempo', 'ajRef', 'ajFita', 'ajFases'].forEach((id) => $(id).addEventListener('input', read));
    $('ajTempo').addEventListener('input', () => bus.emit('edited'));
    $('ajNum').addEventListener('change', () => { read(); if (state.res) bus.emit('result'); });

    bus.on('loaded', () => {
      const a = { ...DEFAULT_AJ, ...state.aj };
      $('ajK').value = a.K; $('ajMin').value = a.minRet; $('ajTempo').value = a.tempo; $('ajNum').checked = !!a.num; $('ajRef').value = a.refilo || '0'; $('ajFita').value = a.fitaEsp || '0'; $('ajFases').value = a.fases || '0';
    });
  },
};
