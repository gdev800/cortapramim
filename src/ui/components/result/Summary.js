// Números do plano: cartões, lista de compras de chapas e custos.
import { custos } from '../../../domain/costs.js';
import { money, toStr, pct } from '../../../domain/units.js';
import { economiaSobras } from '../../../domain/scraps.js';
import { relatorioPlano, linhasRelatorio, linhasRelatorioMat, linhasPorProjeto, CAB_RELAT_MAT, CAB_RELAT_PROJ } from '../../../domain/report.js';
import { $, esc } from '../../dom.js';

export default {
  mount(ctx) {
    const { state, bus, fu } = ctx;
    function render() {
      const res = state.res; if (!res) return;
      const un = state.unit;
      let nCh = 0, areaP = 0, areaS = 0, nPecas = 0, maior = null, nSob = 0;
      res.groups.forEach((g) => {
        nCh += g.sheets.length; nPecas += g.nPecas; nSob += g.nSobras;
        g.sheets.forEach((s) => { areaP += s.area; areaS += s.cfg.SW * s.cfg.SH; if (s.maiorRetalho && (!maior || s.maiorRetalho.w * s.maiorRetalho.h > maior.w * maior.h)) maior = s.maiorRetalho; });
      });
      const c = custos(res, state.ferr, state.orc);
      let t = '<div class="tile main"><b>' + (nCh - nSob) + '</b><span>' + ((nCh - nSob) === 1 ? 'chapa nova' : 'chapas novas') + (nSob ? ' + ' + nSob + (nSob === 1 ? ' sobra' : ' sobras') : '') + '</span></div>' +
        '<div class="tile"><b>' + (areaS ? pct(areaP / areaS) : '0') + '%</b><span>aproveitamento</span></div>' +
        '<div class="tile"><b>' + (maior ? fu(maior.w) + '×' + fu(maior.h) : '—') + '</b><span>' + (maior ? 'maior retalho (' + un + ')' : 'sem retalho útil') + '</span></div>' +
        '<div class="tile"><b>' + nPecas + '</b><span>peças</span></div>';
      const eco = economiaSobras(res);
      if (eco.nSobras) t += '<div class="tile"><b>' + (Math.round(eco.chapasEq * 100) / 100).toLocaleString('pt-BR') + '</b><span>de chapa nova evitada com ' + eco.nSobras + (eco.nSobras === 1 ? ' sobra' : ' sobras') + ' (' + eco.nPecas + (eco.nPecas === 1 ? ' peça' : ' peças') + ')' + (eco.valor > 0 ? ' · ≈ ' + money(eco.valor) : '') + '</span></div>';
      if (c.fitaM > 0) t += '<div class="tile"><b>' + toStr(c.fitaM) + ' m</b><span>de fita de borda</span></div>';
      $('tiles').innerHTML = t;

      let sh = '<div class="tbl"><table><thead><tr><th>Chapa</th><th>Esp.</th><th>Tamanho (' + un + ')</th><th>Veio</th><th>Novas</th><th>Sobras</th><th>Tenho</th><th>Comprar</th><th>Aproveit.</th></tr></thead><tbody>';
      res.groups.forEach((g) => {
        let ap = 0, as = 0; g.sheets.forEach((s) => { ap += s.area; as += s.cfg.SW * s.cfg.SH; });
        const comprar = Math.max(0, g.nNovas - (g.estoque || 0));
        sh += '<tr><td class="n">' + esc(g.mat) + '</td><td>' + (g.esp ? g.esp + ' mm' : '—') + '</td><td>' + fu(g.cfg.SW + 2 * (g.cfg.ref || 0)) + ' × ' + fu(g.cfg.SH + 2 * (g.cfg.ref || 0)) + '</td><td>' + (g.veio ? 'sim' : 'não') + '</td><td>' + g.nNovas + '</td><td>' + g.nSobras + '</td><td>' + (g.estoque || '—') + '</td><td><b>' + comprar + '</b></td><td>' + pct(ap / as) + '%</td></tr>';
      });
      sh += '</tbody></table></div>';
      $('shop').innerHTML = '<div class="label" style="margin-bottom:6px">Lista de compras</div>' + sh;

      const box = $('custos');
      if (c.custo > 0) {
        let rows = '';
        const add = (n, v) => { if (v > 0) rows += '<tr><td>' + n + '</td><td>' + money(v) + '</td></tr>'; };
        add('Chapas novas', c.chapas); add('Fita de borda (' + toStr(c.fitaM) + ' m)', c.fita); add('Ferragens', c.ferr); add('Mão de obra', c.mao);
        rows += '<tr class="tot"><td>Custo total</td><td>' + money(c.custo) + '</td></tr>';
        if (c.venda > 0) rows += '<tr class="tot"><td>Preço de venda (margem ' + toStr(c.mg) + '%)</td><td>' + money(c.venda) + '</td></tr>';
        box.innerHTML = '<div class="label" style="margin-bottom:6px">Custos</div><div class="tbl"><table class="cost"><tbody>' + rows + '</tbody></table></div><p class="hint" style="margin-top:6px">Sobras do estoque não entram no custo.</p>';
        box.hidden = false;
      } else box.hidden = true;

      const rel = relatorioPlano(res);
      let rh = '<div class="label" style="margin-bottom:6px">Relatório de aproveitamento</div><div class="tbl"><table class="cost"><tbody>' +
        linhasRelatorio(rel, c.custo).map((l) => '<tr><td>' + esc(l[0]) + '</td><td>' + esc(l[1]) + '</td></tr>').join('') + '</tbody></table></div>';
      if (rel.grupos.length > 1) {
        rh += '<div class="tbl" style="margin-top:10px"><table><thead><tr>' + CAB_RELAT_MAT.map((x) => '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' +
          linhasRelatorioMat(rel).map((l) => '<tr>' + l.map((x, i) => '<td' + (i === 0 ? ' class="n"' : '') + '>' + esc(String(x)) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
      }
      const pp = linhasPorProjeto(res);
      if (pp.length) {
        rh += '<div class="label" style="margin:14px 0 6px">Por projeto</div><div class="tbl"><table><thead><tr>' + CAB_RELAT_PROJ.map((x) => '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' +
          pp.map((l) => '<tr>' + l.map((x, i) => '<td' + (i === 0 ? ' class="n"' : '') + '>' + esc(String(x)) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
          '<p class="hint" style="margin-top:6px">A chapa é dividida pela área das peças de cada projeto. Ferragens e mão de obra ficam fora.</p>';
      }
      $('relat').innerHTML = rh;
    }
    bus.on('result', render); bus.on('unit', render);
  },
};
