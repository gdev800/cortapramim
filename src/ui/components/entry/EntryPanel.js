// Painel "Chapas e peças": reúne unidade, editor de chapas, ferragens, ajustes e o botão de calcular.
import unitsHtml from './units.html';
import blocksHtml from './blocks.html';
import addRowHtml from './add-row.html';
import './blocks.css';
import { EXEMPLO } from '../../../domain/snapshot.js';
import { newBlock } from '../../../domain/state.js';
import { trocarUnidade } from '../../../domain/unit-change.js';
import { $ } from '../../dom.js';
import Blocks from './Blocks.js';
import Ferragens from './Ferragens.js';
import Adjust from './Adjust.js';
import Calculator from './Calculator.js';
import Restart from './Restart.js';

export default {
  template: (ctx) =>
    '<section class="panel" aria-labelledby="t-entrada">\n' + unitsHtml + blocksHtml + addRowHtml + Ferragens.template(ctx) + Adjust.template(ctx) + Calculator.template(ctx) + Restart.template(ctx) + '  </section>',
  mount(ctx) {
    const { state, bus } = ctx;
    Blocks.mount(ctx); Ferragens.mount(ctx); Adjust.mount(ctx); Calculator.mount(ctx); Restart.mount(ctx);

    const syncUnit = () => {
      $('unCm').setAttribute('aria-pressed', String(state.unit === 'cm'));
      $('unMm').setAttribute('aria-pressed', String(state.unit === 'mm'));
    };
    function setUnit(u) {
      const r = trocarUnidade(state, u); if (!r) return;
      syncUnit(); bus.emit('unit', r); ctx.save();
    }
    ctx.actions.setUnit = setUnit;
    $('unCm').addEventListener('click', () => setUnit('cm'));
    $('unMm').addEventListener('click', () => setUnit('mm'));
    bus.on('loaded', syncUnit);

    ctx.actions.carregarExemplo = () => { ctx.load(EXEMPLO); ctx.save(); };
    $('btnAddBlk').addEventListener('click', () => { state.blocks.push(newBlock(state)); bus.emit('blocks'); ctx.save(); });
    // antes limpava na hora e também voltava unidade e ajustes da serra ao padrão; agora confirma e mantém o que é da oficina
    $('btnLimpar').addEventListener('click', () => ctx.actions.recomecar());
    $('btnExemplo').addEventListener('click', () => { ctx.actions.carregarExemplo(); ctx.msg('Exemplo genérico carregado. Troque pelos seus dados.'); });
  },
};
