// Proposta para o cliente: formulário e PDF.
import html from './proposal.html';
import { DEFAULT_PROP } from '../../../domain/state.js';
import { slug } from '../../../domain/units.js';
import { gerarPdfProposta } from '../../../infra/pdf/proposal.js';
import { pdfOk } from '../../../infra/pdf/lib.js';
import { entregarPdf, MSG_PDF_INDISPONIVEL } from '../../deliver.js';
import { $ } from '../../dom.js';

export default {
  template: () => html,
  mount(ctx) {
    const { state, bus } = ctx;
    // Cada campo do formulário tem data-p="<chave em state.prop>".
    $('propBox').addEventListener('input', (ev) => {
      const el = ev.target, k = el.dataset.p; if (!k) return;
      state.prop[k] = el.type === 'checkbox' ? el.checked : el.value; ctx.save();
    });
    const sync = () => {
      document.querySelectorAll('#propBox [data-p]').forEach((el) => {
        const v = state.prop[el.dataset.p] ?? DEFAULT_PROP[el.dataset.p];
        if (el.type === 'checkbox') el.checked = !!v; else el.value = v == null ? '' : v;
      });
    };
    bus.on('loaded', sync);

    $('btnProposta').addEventListener('click', async function () {
      const slot = $('propMsg');
      if (!pdfOk()) { slot.textContent = MSG_PDF_INDISPONIVEL; return; }
      this.disabled = true; slot.textContent = 'Montando a proposta…';
      try { await entregarPdf(state, 'proposta-' + slug(state.prop.cliente || state.proj.nome || 'cliente') + '.pdf', await gerarPdfProposta(state), slot); }
      catch (e) { slot.textContent = 'Não consegui gerar a proposta.'; }
      this.disabled = false;
    });
  },
};
