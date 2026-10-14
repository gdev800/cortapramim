// Lista de compras (plano aberto + estoque mínimo) e aviso de itens abaixo do mínimo, no topo do Estoque.
import html from './template.html';
import { abaixoDoMinimo, listaDeCompras, csvCompras } from '../../../domain/restock.js';
import { toStr } from '../../../domain/units.js';
import { gerarPdfCompras } from '../../../infra/pdf/shopping.js';
import { pdfOk } from '../../../infra/pdf/lib.js';
import { entregar, entregarPdf, MSG_PDF_INDISPONIVEL } from '../../deliver.js';
import { $, esc } from '../../dom.js';

export default {
  template: () => html,
  mount(ctx) {
    const { state, bus } = ctx;
    // depois de "Atualizar estoque" o plano já saiu do estoque: não conta de novo
    const lista = () => listaDeCompras(state, $('cmpPlano').checked && state.res && !state.estAtual ? state.res : null);

    function render() {
      const a = abaixoDoMinimo(state);
      $('minAviso').hidden = !a.length;
      $('minAviso').innerHTML = a.map((x) => '<p class="msg warn">' + esc(x.texto) + '</p>').join('');
      const l = lista();
      if (!l.itens.length) { $('cmpLista').innerHTML = '<p class="hint">Nada para comprar agora.</p>'; return; }
      $('cmpLista').innerHTML = '<table><thead><tr><th>Item</th><th>Tenho</th><th>Plano pede</th><th>Mínimo</th><th>Comprar</th><th>Motivo</th></tr></thead><tbody>' +
        l.itens.map((x) => '<tr data-tipo="' + x.tipo + '"><td class="n">' + esc(x.nome) + (x.c ? ' <span class="hint">' + ctx.fu(x.c) + '×' + ctx.fu(x.l) + ' ' + state.unit + '</span>' : '') + '</td><td>' + toStr(x.tenho) + '</td><td>' + (x.precisa ? toStr(x.precisa) : '–') + '</td><td>' + (x.min ? toStr(x.min) : '–') + '</td><td><b>' + toStr(x.comprar) + ' ' + esc(x.un === 'chapa' ? (x.comprar === 1 ? 'chapa' : 'chapas') : x.un) + '</b></td><td class="n hint">' + esc(x.motivo) + '</td></tr>').join('') + '</tbody></table>';
    }
    $('cmpPlano').addEventListener('change', render);
    $('btnCmpCsv').addEventListener('click', async () => {
      const txt = csvCompras(lista(), ctx.fu, state.unit);
      await entregar(state, 'lista-de-compras.csv', txt, $('cmpSlot'), txt);
    });
    $('btnCmpPdf').addEventListener('click', async () => {
      const slot = $('cmpSlot');
      if (!pdfOk()) { slot.textContent = MSG_PDF_INDISPONIVEL; return; }
      try { await entregarPdf(state, 'lista-de-compras.pdf', await gerarPdfCompras(lista(), abaixoDoMinimo(state), ctx.fu, state.unit), slot); } catch (e) { slot.textContent = 'Não consegui gerar o PDF.'; }
    });
    ['insumos', 'result', 'needs', 'approved', 'estoque', 'loaded', 'unit'].forEach((ev) => bus.on(ev, render));
    render();
  },
};
