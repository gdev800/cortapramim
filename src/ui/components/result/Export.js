// Exportar e guardar: PNG, PDFs, etiquetas, CSVs e atualização do estoque.
import { sheetSVG, PAL_EXPORT, labelsSVG, csvCortes, csvPecas } from '../../../core/index.js';
import { pendEstoque, aplicarPlanoNoEstoque } from '../../../domain/scraps.js';
import { baixarInsumos } from '../../../domain/supplies.js';
import { slug } from '../../../domain/units.js';
import { custos } from '../../../domain/costs.js';
import { csvRelatorio } from '../../../domain/report.js';
import { svgToPngBlob } from '../../../infra/raster.js';
import { pdfOk } from '../../../infra/pdf/lib.js';
import { gerarPdfPlano } from '../../../infra/pdf/plan.js';
import { gerarPdfEtiquetas } from '../../../infra/pdf/labels.js';
import { entregar, entregarPdf, emQuadro, MSG_PDF_INDISPONIVEL } from '../../deliver.js';
import { $, esc } from '../../dom.js';

const SLOT = '<div class="slot" style="flex-basis:100%"></div>';

export default {
  mount(ctx) {
    const { state, bus, fu } = ctx;

    function render() {
      const box = $('exportBox');
      box.hidden = !state.approved;
      const res = state.res; if (!state.approved || !res) return;
      const pe = pendEstoque(state);
      let h = '<h2>Exportar e guardar</h2><div class="exports">';
      res.groups.forEach((g) => g.sheets.forEach((s) => {
        h += '<div class="exp-row"><span>Chapa ' + s.n + ' · ' + esc(g.mat) + (s.sobra ? ' (sobra)' : '') + '</span><button type="button" class="primary" data-exp="png" data-n="' + s.n + '">Baixar PNG</button>' + SLOT + '</div>';
      }));
      h += '<div class="exp-row"><span>Relatório completo (PDF)</span><button type="button" class="brass" data-exp="pdf">Baixar PDF</button>' + SLOT + '</div>' +
        '<div class="exp-row"><span>Etiquetas para imprimir e colar (PDF)</span><select id="etqTam" aria-label="Tamanho da etiqueta" class="stsel"><option value="p">Pequena · 24 por folha</option><option value="m" selected>Média · 12 por folha</option><option value="g">Grande · 8 por folha</option></select><button type="button" class="brass" data-exp="etqpdf">Gerar PDF</button><label class="check" style="flex-basis:100%"><input type="checkbox" id="etqMed" checked> Mostrar as medidas</label><label class="check" style="flex-basis:100%"><input type="checkbox" id="etqMapa" checked> Mostrar onde a peça fica na chapa</label>' + SLOT + '</div>' +
        '<div class="exp-row"><span>Etiquetas das peças (PNG)</span><button type="button" data-exp="etq">Baixar</button>' + SLOT + '</div>' +
        '<div class="exp-row"><span>Lista de cortes (CSV)</span><button type="button" data-exp="cortes">Baixar</button>' + SLOT + '</div>' +
        '<div class="exp-row"><span>Lista de peças (CSV)</span><button type="button" data-exp="pecas">Baixar</button>' + SLOT + '</div>' +
        '<div class="exp-row"><span>Relatório de aproveitamento (CSV)</span><button type="button" data-exp="relat">Baixar</button>' + SLOT + '</div>' +
        '<div class="exp-row"><span>' + (state.estAtual ? 'Estoque de sobras atualizado.' : 'Estoque de sobras: ' + pe.usados.length + ' usada(s) saem, ' + pe.novos.length + ' retalho(s) novo(s) entram.') + '</span>' +
        (state.estAtual ? '' : '<button type="button" class="primary" id="btnEstoque">Atualizar estoque</button>') + '</div></div>' +
        (state.dl || !emQuadro() ? '' : '<p class="hint">Se o download for bloqueado nesta visualização, os botões mostram a imagem, o texto ou um link para abrir o arquivo.</p>');
      box.innerHTML = h;
    }

    async function atualizarEstoque() {
      aplicarPlanoNoEstoque(state);
      if (baixarInsumos(state)) { ctx.pers.saveInsumos(); bus.emit('insumos'); }
      await ctx.pers.saveEstoque();
      bus.emit('estoque'); render();
    }

    async function exportar(bt) {
      const slot = bt.parentNode.querySelector('.slot'), kind = bt.dataset.exp, nome = slug(state.proj.nome || 'projeto');
      let total = 0; state.res.groups.forEach((g) => { total += g.sheets.length; });
      if ((kind === 'pdf' || kind === 'etqpdf') && !pdfOk()) { slot.textContent = MSG_PDF_INDISPONIVEL; return; }
      if (kind === 'png') {
        let sh = null, g0 = null;
        state.res.groups.forEach((g) => g.sheets.forEach((s) => { if (s.n === parseInt(bt.dataset.n, 10)) { sh = s; g0 = g; } }));
        slot.textContent = 'Gerando imagem…';
        const r = sheetSVG(sh, PAL_EXPORT, { fu, un: state.unit, header: true, numbers: true, sobras: true, px: 2400 }, total);
        await entregar(state, 'chapa-' + sh.n + '-' + slug(g0.mat) + '.png', await svgToPngBlob(r, 2400), slot, null);
      } else if (kind === 'pdf') {
        slot.textContent = 'Montando o relatório…';
        await entregarPdf(state, 'plano-' + slug(state.proj.nome || 'corte') + '.pdf', await gerarPdfPlano(state), slot);
      } else if (kind === 'etqpdf') {
        slot.textContent = 'Montando as etiquetas…';
        await entregarPdf(state, 'etiquetas-' + nome + '.pdf', await gerarPdfEtiquetas(state, $('etqTam').value, $('etqMed').checked, $('etqMapa').checked), slot);
      } else if (kind === 'etq') {
        slot.textContent = 'Gerando etiquetas…';
        await entregar(state, 'etiquetas-' + nome + '.png', await svgToPngBlob(labelsSVG(state.res, fu, state.unit), 1800), slot, null);
      } else {
        const txt = kind === 'cortes' ? csvCortes(state.res, fu, state.unit)
          : kind === 'relat' ? csvRelatorio(state.res, custos(state.res, state.ferr, state.orc).custo)
          : csvPecas(state.res, fu, state.unit);
        const arq = kind === 'cortes' ? 'lista-de-cortes.csv' : kind === 'relat' ? 'relatorio-de-aproveitamento.csv' : 'lista-de-pecas.csv';
        await entregar(state, arq, txt, slot, txt);
      }
    }

    $('exportBox').addEventListener('click', async (ev) => {
      if (ev.target.id === 'btnEstoque' && state.res && !state.estAtual) { await atualizarEstoque(); return; }
      const bt = ev.target.closest('button[data-exp]'); if (!bt || !state.res) return;
      bt.disabled = true;
      try { await exportar(bt); } catch (e) { const s = bt.parentNode.querySelector('.slot'); if (s) s.textContent = 'Não consegui gerar o arquivo.'; }
      bt.disabled = false;
    });

    ['result', 'approved', 'dl', 'loaded'].forEach((t) => bus.on(t, render));
  },
};
