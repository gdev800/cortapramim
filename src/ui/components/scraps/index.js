// Estoque de sobras: lista, cadastro manual e PDF.
import html from './template.html';
import { cadastrarSobra } from '../../../domain/scraps.js';
import { gerarPdfEstoque } from '../../../infra/pdf/stock.js';
import { pdfOk } from '../../../infra/pdf/lib.js';
import { entregarPdf, MSG_PDF_INDISPONIVEL } from '../../deliver.js';
import { $, esc } from '../../dom.js';
import { fotografar, registrarEntrada, registrarAjuste } from '../../../domain/history.js';

export default {
  template: () => html,
  mount(ctx) {
    const { state, bus, fu } = ctx;

    function render() {
      const el = $('sobraList');
      if (!state.estoque.length) { el.innerHTML = '<p class="hint">Nenhuma sobra guardada ainda. Depois de aprovar um plano, os retalhos grandes podem ir direto para cá.</p>'; return; }
      el.innerHTML = state.estoque.map((s) =>
        '<div class="srow"><span>' + esc(s.nome || 'Sem nome') + ' · ' + (s.esp ? s.esp + ' mm' : '—') + (s.veio ? ' · com veio' : '') + (s.obs ? ' · ' + esc(s.obs) : '') + '</span><span><b>' + fu(s.c) + ' × ' + fu(s.l) + ' ' + state.unit + '</b> <button type="button" data-sdel="' + esc(s.id) + '" aria-label="Remover sobra">Remover</button></span></div>').join('');
    }
    const rotulos = () => { $('sbCl').textContent = 'Comprimento (' + state.unit + ')'; $('sbLl').textContent = 'Largura (' + state.unit + ')'; };

    $('sobraList').addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-sdel]'); if (!b) return;
      const antes = fotografar(state), sb = state.estoque.find((s) => s.id === b.dataset.sdel);
      state.estoque = state.estoque.filter((s) => s.id !== b.dataset.sdel);
      if (sb) { registrarAjuste(state, { tipoItem: 'sobra', nome: sb.nome + ' ' + fu(sb.c) + '×' + fu(sb.l) + ' ' + state.unit, de: 1, para: 0, un: 'un', obs: 'removida' }, antes); ctx.pers.saveHistorico(); bus.emit('historico'); }
      ctx.pers.saveEstoque(); bus.emit('estoque');
    });
    $('btnSobra').addEventListener('click', () => {
      const antes = fotografar(state);
      const r = cadastrarSobra(state, { nome: $('sbNome').value, esp: $('sbEsp').value, c: $('sbC').value, l: $('sbL').value, q: $('sbQ').value, veio: $('sbVeio').checked });
      if (r.erro) { $('sbMsg').textContent = r.erro; return; }
      registrarEntrada(state, { tipoItem: 'sobra', nome: $('sbNome').value.trim() + ' ' + $('sbC').value + '×' + $('sbL').value + ' ' + state.unit, q: r.n, un: 'un', obs: 'cadastrada à mão' }, antes);
      ctx.pers.saveHistorico(); bus.emit('historico');
      ctx.pers.saveEstoque(); bus.emit('estoque');
      $('sbMsg').textContent = 'Sobra guardada.'; $('sbC').value = ''; $('sbL').value = '';
    });
    $('btnSobraPdf').addEventListener('click', async function () {
      const slot = $('sbMsg');
      if (!pdfOk()) { slot.textContent = MSG_PDF_INDISPONIVEL; return; }
      this.disabled = true; slot.textContent = 'Gerando PDF…';
      try { await entregarPdf(state, 'estoque-de-sobras.pdf', await gerarPdfEstoque(state), slot); } catch (e) { slot.textContent = 'Não consegui gerar o PDF.'; }
      this.disabled = false;
    });

    bus.on('estoque', render); bus.on('loaded', () => { rotulos(); render(); });
    bus.on('unit', (p) => {
      if (p && p.cv) ['sbC', 'sbL'].forEach((id) => { $(id).value = p.cv($(id).value); });
      rotulos(); render();
    });
    rotulos(); render();
  },
};
