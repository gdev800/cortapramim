// Backup em arquivo: exportar e importar projetos, sobras e insumos.
import html from './backup.html';
import { montarPacote, nomeArquivoBackup, lerPacote, projetosParaImportar, sobrasParaImportar, insumosParaImportar } from '../../../domain/backup.js';
import { $ } from '../../dom.js';

export default {
  template: () => html,
  mount(ctx) {
    const { state, bus, pers } = ctx;

    function renderEstado() {
      const el = $('bkState'); if (!el) return;
      const bk = pers.ultimoBackup(), chg = pers.ultimaMudanca();
      if (!bk) { el.textContent = '· nunca exportado'; return; }
      el.textContent = '· último em ' + new Date(bk).toLocaleDateString('pt-BR') + (chg && chg > bk + 2000 ? ' · há mudanças depois' : ' · em dia');
    }

    async function exportar() {
      const slot = $('bkSlot'), pacote = montarPacote(state), txt = JSON.stringify(pacote);
      if (state.dl) {
        try {
          await state.dl.save({ filename: nomeArquivoBackup(), data: txt }); pers.marcarBackup(); renderEstado();
          slot.textContent = 'Backup salvo: ' + pacote.projetos.length + ' projeto(s) e ' + state.estoque.length + ' sobra(s).';
        } catch (e) { slot.textContent = e && e.code === 'declined' ? 'Download cancelado.' : 'Não consegui baixar aqui. Tente de novo.'; }
        return;
      }
      slot.innerHTML = '<p class="hint" style="margin-bottom:8px">O download direto não está disponível aqui. Copie o texto abaixo e salve em um arquivo .json.</p>';
      const ta = document.createElement('textarea'); ta.className = 'csv-box'; ta.readOnly = true; ta.value = txt; slot.appendChild(ta); ta.focus(); ta.select();
    }

    async function importar(texto) {
      const slot = $('bkSlot'), r = lerPacote(texto);
      if (r.erro) { slot.textContent = r.erro; return; }
      const d = r.d;
      const projs = projetosParaImportar(d, state.projetos);
      for (const p of projs) await pers.saveProjeto(p);
      const sobras = sobrasParaImportar(d, state.estoque);
      if (sobras.length) { state.estoque.push(...sobras); await pers.saveEstoque(); }
      const ins = insumosParaImportar(d, state.insumos);
      if (ins.length) { state.insumos.push(...ins); pers.saveInsumos(); bus.emit('insumos'); }
      pers.flushProjetosLocal();
      bus.emit('projetos'); bus.emit('estoque'); bus.emit('blocks');
      slot.textContent = 'Backup importado: ' + projs.length + ' projeto(s) novo(s) ou atualizado(s) e ' + sobras.length + ' sobra(s) nova(s). Abra os projetos em "Meus projetos salvos".';
    }

    $('btnBkExp').addEventListener('click', exportar);
    $('btnBkImp').addEventListener('click', () => { $('bkIn').value = ''; $('bkIn').click(); });
    $('bkIn').addEventListener('change', function () {
      const f = this.files && this.files[0]; if (!f) return;
      const rd = new FileReader(); rd.onload = () => importar(String(rd.result || '')); rd.readAsText(f);
    });
    bus.on('touched', renderEstado);
    renderEstado();
  },
};
