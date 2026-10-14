// Relatório do mês: seletor de mês, cartões, tabela por material, barras mês a mês e exportação CSV/PDF.
import html from './template.html';
import './monthly.css';
import { resumoDoMes, serieMensal, cartoesDoMes, csvMensal, nomeArquivoMes } from '../../../domain/monthly.js';
import { toStr } from '../../../domain/units.js';
import { graficoBarras } from './chart.js';
import { gerarPdfMensal } from '../../../infra/pdf/monthly.js';
import { pdfOk } from '../../../infra/pdf/lib.js';
import { entregar, entregarPdf, MSG_PDF_INDISPONIVEL } from '../../deliver.js';
import { $, esc } from '../../dom.js';

export const MESES_GRAFICO = 6;
const doValor = (v) => { const m = /^(\d{4})-(\d{2})$/.exec(v || ''); return m ? { ano: +m[1], mes: +m[2] } : null; };
const paraValor = (s) => s.ano + '-' + String(s.mes).padStart(2, '0');

export default {
  template: () => html,
  mount(ctx) {
    const { state, bus } = ctx;
    const hoje = new Date();
    let sel = { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
    $('relMes').value = paraValor(sel);

    const dados = () => ({ r: resumoDoMes(state.historico, sel.ano, sel.mes), serie: serieMensal(state.historico, MESES_GRAFICO, sel) });

    function render() {
      const { r, serie } = dados();
      $('relVazio').hidden = r.projetos > 0;
      $('relCards').innerHTML = cartoesDoMes(r).map((c) => '<div class="rel-card" data-k="' + c.k + '"><span class="label">' + esc(c.rotulo) + '</span><b>' + esc(c.valor) + '</b><span class="hint">' + esc(c.sub) + '</span></div>').join('');
      $('relTabela').innerHTML = r.porMaterial.length
        ? '<table><thead><tr><th>Material</th><th>Espessura</th><th>Chapas novas</th><th>Projetos</th></tr></thead><tbody>' +
          r.porMaterial.map((m) => '<tr><td class="n">' + esc(m.nome) + '</td><td>' + (m.esp ? esc(toStr(m.esp)) + ' mm' : '–') + '</td><td>' + esc(toStr(m.chapas)) + '</td><td>' + m.projetos + '</td></tr>').join('') + '</tbody></table>'
        : '';
      $('relGrafico').innerHTML = graficoBarras(serie, $('relMetrica').value, sel);
    }

    $('relMes').addEventListener('change', () => { const v = doValor($('relMes').value); if (v) { sel = v; render(); } });
    $('relMetrica').addEventListener('change', render);
    // clicar numa barra escolhe aquele mês
    $('relGrafico').addEventListener('click', (e) => {
      const g = e.target.closest && e.target.closest('.rel-b'); if (!g) return;
      sel = { ano: +g.dataset.ano, mes: +g.dataset.mes }; $('relMes').value = paraValor(sel); render();
    });
    $('btnRelCsv').addEventListener('click', async () => {
      const { r, serie } = dados(), slot = $('relSlot'), txt = csvMensal(r, serie);
      await entregar(state, nomeArquivoMes(sel.ano, sel.mes, 'csv'), txt, slot, txt);
    });
    $('btnRelPdf').addEventListener('click', async () => {
      const slot = $('relSlot');
      if (!pdfOk()) { slot.textContent = MSG_PDF_INDISPONIVEL; return; }
      const { r, serie } = dados();
      try { await entregarPdf(state, nomeArquivoMes(sel.ano, sel.mes, 'pdf'), await gerarPdfMensal(r, serie), slot); } catch (e) { slot.textContent = 'Não consegui gerar o PDF.'; }
    });
    ['historico', 'estoque', 'loaded'].forEach((ev) => bus.on(ev, render));
    render();
  },
};
