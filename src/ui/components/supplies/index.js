// Estoque de fita de borda e ferragens.
import html from './template.html';
import { adicionarInsumo, definirQuantidade, removerInsumo } from '../../../domain/supplies.js';
import { toStr } from '../../../domain/units.js';
import { $, esc } from '../../dom.js';

export default {
  template: () => html,
  mount(ctx) {
    const { state, bus } = ctx;

    function render() {
      const el = $('insList');
      if (!state.insumos.length) { el.innerHTML = '<p class="hint">Nada cadastrado ainda. Cadastre o rolo de fita e as ferragens que você tem. O plano mostra o que falta comprar.</p>'; return; }
      el.innerHTML = state.insumos.map((s) =>
        '<div class="srow"><span>' + esc(s.nome) + ' <span class="tag">' + (s.tipo === 'fita' ? 'fita' : 'ferragem') + '</span></span><span class="row" style="flex-wrap:nowrap;gap:8px"><input class="qin" data-iq="' + esc(s.id) + '" inputmode="decimal" value="' + esc(toStr(s.q)) + '" aria-label="Quantidade em estoque de ' + esc(s.nome) + '"><span class="hint">' + (s.tipo === 'fita' ? 'm' : 'un') + '</span><button type="button" data-idel="' + esc(s.id) + '" aria-label="Remover">Remover</button></span></div>').join('');
    }
    const mudou = () => { ctx.pers.saveInsumos(); bus.emit('insumos'); };

    $('insList').addEventListener('change', (ev) => {
      if (!ev.target.dataset.iq) return;
      definirQuantidade(state, ev.target.dataset.iq, ev.target.value); mudou();
    });
    $('insList').addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-idel]'); if (!b) return;
      removerInsumo(state, b.dataset.idel); mudou();
    });
    $('btnIns').addEventListener('click', () => {
      const r = adicionarInsumo(state, { tipo: $('insTipo').value, nome: $('insNome').value, q: $('insQ').value });
      if (r.erro) { $('insMsg').textContent = r.erro; return; }
      mudou();
      $('insMsg').textContent = r.somou ? 'Quantidade somada ao item existente.' : 'Item guardado.'; $('insNome').value = ''; $('insQ').value = '';
    });

    bus.on('insumos', render); bus.on('loaded', render);
    render();
  },
};
