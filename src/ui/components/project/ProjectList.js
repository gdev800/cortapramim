// Lista dos projetos salvos, com filtro por andamento.
import html from './project-list.html';
import { STATUS, resumoAndamento } from '../../../domain/status.js';
import { money } from '../../../domain/units.js';
import { juntarProjeto } from '../../../domain/join.js';
import { $, esc } from '../../dom.js';

export default {
  template: () => html,
  mount(ctx) {
    const { state, bus, pers } = ctx;
    const pendDel = {};

    function render() {
      const lista = state.projetos.slice().sort((a, b) => (b.atualizado || 0) - (a.atualizado || 0));
      $('projCount').textContent = lista.length ? '(' + lista.length + ')' : '';
      const filtro = state.statusFiltro;
      const vis = lista.filter((p) => filtro === 'todos' || (p.status || 'orcado') === filtro);
      const { n: andam, valor } = resumoAndamento(lista);

      let h = '<div class="seg sm" role="group" aria-label="Filtrar por status" style="flex-wrap:wrap;margin-bottom:10px"><button type="button" data-pf="todos" aria-pressed="' + (filtro === 'todos') + '">Todos</button>' +
        STATUS.map((s) => '<button type="button" data-pf="' + s[0] + '" aria-pressed="' + (filtro === s[0]) + '">' + s[1] + '</button>').join('') + '</div>';
      if (andam) h += '<p class="hint" style="margin-bottom:6px">Em andamento (aprovado, cortado ou montado): ' + andam + (andam === 1 ? ' projeto' : ' projetos') + (valor > 0 ? ' · ' + money(valor) : '') + '</p>';
      h += vis.length ? vis.map((p) =>
        '<div class="srow"><span>' + esc(p.nome || 'Sem nome') + ' <span class="hint">' + (p.atualizado ? new Date(p.atualizado).toLocaleDateString('pt-BR') : '') + (p.valor > 0 ? ' · ' + money(p.valor) : '') + '</span></span>' +
        '<span class="row" style="flex-wrap:nowrap;gap:8px"><select class="stsel" data-pst="' + esc(p.id) + '" aria-label="Status de ' + esc(p.nome || 'projeto') + '">' +
        STATUS.map((s) => '<option value="' + s[0] + '"' + ((p.status || 'orcado') === s[0] ? ' selected' : '') + '>' + s[1] + '</option>').join('') +
        '</select><button type="button" data-open="' + esc(p.id) + '">Abrir</button><button type="button" data-join="' + esc(p.id) + '" title="Traz as chapas deste projeto para o trabalho aberto e corta tudo junto">Juntar</button><button type="button" data-pdel="' + esc(p.id) + '">Excluir</button></span></div>').join('')
        : '<p class="hint">' + (lista.length ? 'Nenhum projeto com esse status.' : 'Nenhum projeto salvo ainda.') + '</p>';
      $('projList').innerHTML = h;
    }

    $('projList').addEventListener('click', async (ev) => {
      const f = ev.target.closest('button[data-pf]');
      if (f) { state.statusFiltro = f.dataset.pf; render(); return; }
      const j = ev.target.closest('button[data-join]');
      if (j) {
        const p = state.projetos.find((x) => x.id === j.dataset.join); if (!p) return;
        const r = juntarProjeto(state, p);
        if (r.ok) { bus.emit('blocks'); bus.emit('edited'); ctx.save(); }
        ctx.msg(r.msg, r.ok ? 'ok' : 'warn'); return;
      }
      const o = ev.target.closest('button[data-open]'), d = ev.target.closest('button[data-pdel]');
      if (o) {
        const p = state.projetos.find((x) => x.id === o.dataset.open);
        if (p) { ctx.load({ ...p, projId: p.id }); ctx.save(); ctx.msg('Projeto "' + (p.nome || '') + '" aberto.', 'ok'); }
      } else if (d) {
        const id = d.dataset.pdel; // pede confirmação com um segundo clique
        if (!pendDel[id]) { pendDel[id] = true; d.textContent = 'Confirmar exclusão'; setTimeout(() => { pendDel[id] = false; if (d.isConnected) d.textContent = 'Excluir'; }, 3500); return; }
        await pers.delProjeto(id); render();
      }
    });
    $('projList').addEventListener('change', async (ev) => {
      const el = ev.target; if (!el.dataset.pst) return;
      const p = state.projetos.find((x) => x.id === el.dataset.pst); if (!p) return;
      p.status = el.value; await pers.saveProjeto(p);
      if (state.proj.id === p.id) { state.status = p.status; $('projStatus').value = p.status; ctx.save(); }
      render();
    });

    bus.on('projetos', render); bus.on('loaded', render);
    render();
  },
};
