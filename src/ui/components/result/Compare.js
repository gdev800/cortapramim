// Comparar versões do plano (girar peças / ignorar sobras).
import { coletar } from '../../../domain/collect.js';
import { cfgDoMotor } from '../../../domain/estimate.js';
import { cenariosPossiveis, melhorCenario, rodarCenarios } from '../../../domain/compare.js';
import { money, pct } from '../../../domain/units.js';
import { $, esc } from '../../dom.js';

export default {
  mount(ctx) {
    const { state, bus, fu } = ctx;
    async function comparar() {
      if (state.running) return;
      const out = $('cmpOut');
      const col = coletar(state);
      if (col.erros.length || !col.groups.length) { out.innerHTML = '<p class="msg err">Corrija a lista de peças antes de comparar.</p>'; return; }
      const cfg = cfgDoMotor({ K: $('ajK').value, minRet: $('ajMin').value, refilo: $('ajRef').value, fases: $('ajFases').value, repetir: $('ajRep').checked });
      const pos = cenariosPossiveis(col.groups);
      state.running = true; $('btnCmp').disabled = true;
      let cen;
      try {
        cen = await rodarCenarios({ groups: col.groups, cfg, atual: state.res, onProgress: (nome) => { out.innerHTML = '<p class="hint">Calculando: ' + esc(nome) + '…</p>'; } });
      } catch (e) {
        out.innerHTML = '<p class="msg err">Não consegui comparar: ' + esc(e && e.message ? e.message : e) + '</p>';
        state.running = false; $('btnCmp').disabled = false; return;
      }
      state.running = false; $('btnCmp').disabled = false;
      if (cen.length < 2) { out.innerHTML = '<p class="hint">Não há outro cenário para comparar. O plano já usa as opções que você definiu.</p>'; return; }
      const melhor = melhorCenario(cen);
      out.innerHTML = '<div class="tbl"><table><thead><tr><th>Cenário</th><th>Chapas novas</th><th>Sobras</th><th>Aproveit.</th><th>Maior retalho</th><th>Chapas (R$)</th><th></th></tr></thead><tbody>' +
        cen.map((c) => '<tr><td class="n"><b>' + esc(c.nome) + '</b>' + (c === melhor ? ' <span class="tag">melhor</span>' : '') + '</td><td>' + c.r.nov + '</td><td>' + c.r.sob + '</td><td>' + pct(c.r.util) + '%</td><td>' + (c.r.maior ? fu(c.r.maior.w) + '×' + fu(c.r.maior.h) : '—') + '</td><td>' + (c.r.custo > 0 ? money(c.r.custo) : '—') + '</td><td>' + (c.id === 'atual' ? '' : '<button type="button" data-cmp="' + c.id + '">Usar este</button>') + '</td></tr>').join('') +
        '</tbody></table></div>' + (pos.giro ? '<p class="hint" style="margin-top:8px">Atenção: "podem girar" ignora o veio. Só use com material liso ou se o veio aceitar peças viradas.</p>' : '');
    }
    $('btnCmp').addEventListener('click', comparar);
    $('cmpOut').addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-cmp]'); if (!b) return;
      if (b.dataset.cmp === 'giro') state.blocks.forEach((x) => { x.veio = false; });
      if (b.dataset.cmp === 'semsobra') state.blocks.forEach((x) => { x.usarSobras = false; });
      bus.emit('blocks'); ctx.save(); $('cmpOut').innerHTML = ''; ctx.actions.calcular();
    });
    bus.on('loaded', () => { $('cmpOut').innerHTML = ''; });
  },
};
