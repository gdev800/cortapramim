// Painel "Projeto": nome, andamento, salvar/novo. Reúne a proposta, a lista de projetos e o backup.
import html from './project-panel.html';
import { STATUS } from '../../../domain/status.js';
import { valorProposta } from '../../../domain/costs.js';
import { snapshot } from '../../../domain/snapshot.js';
import { $ } from '../../dom.js';
import Proposal from './Proposal.js';
import ProjectList from './ProjectList.js';
import Backup from './Backup.js';

const opcoes = () => STATUS.map((s) => '<option value="' + s[0] + '">' + s[1] + '</option>').join('');

export default {
  template(ctx) {
    return html.replace('<!--STATUS_OPTIONS-->', opcoes()).replace('<!--PROPOSAL-->', Proposal.template(ctx))
      .replace('<!--LIST-->', ProjectList.template(ctx)).replace('<!--BACKUP-->', Backup.template(ctx));
  },
  mount(ctx) {
    const { state, bus, pers } = ctx;
    Proposal.mount(ctx); ProjectList.mount(ctx); Backup.mount(ctx);

    const notaPadrao = () => {
      $('storeNote').textContent = ctx.backend.mode === 'cloud'
        ? 'Projetos e sobras ficam guardados na sua conta e aparecem em qualquer aparelho.'
        : 'Projetos e sobras ficam guardados só neste navegador.';
    };
    const sync = () => { $('projNome').value = state.proj.nome; $('projStatus').value = state.status; };

    $('projNome').addEventListener('input', function () { state.proj.nome = this.value; ctx.save(); });
    $('projStatus').addEventListener('change', function () { state.status = this.value; ctx.save(); });

    $('btnSalvarProj').addEventListener('click', async () => {
      const nome = $('projNome').value.trim() || 'Projeto sem nome';
      state.proj.nome = nome; $('projNome').value = nome;
      if (!state.proj.id) state.proj.id = 'p' + Date.now().toString(36);
      const snap = snapshot(state, true);
      if (snap.res && JSON.stringify(snap.res).length > 170000) delete snap.res; // documentos grandes demais não cabem no banco
      Object.assign(snap, { id: state.proj.id, nome, atualizado: Date.now(), status: state.status, valor: valorProposta(state) });
      await pers.saveProjeto(snap); ctx.save(); bus.emit('projetos');
      ctx.msg('Projeto "' + nome + '" salvo.', 'ok');
    });
    $('btnNovoProj').addEventListener('click', () => { ctx.load({ blocks: [{}] }); ctx.msg(''); ctx.save(); });

    bus.on('loaded', sync);
    bus.on('storage', notaPadrao);
    bus.on('note', (t) => { $('storeNote').textContent = t; });
    notaPadrao();
  },
};
