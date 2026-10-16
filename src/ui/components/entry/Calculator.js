// Botão "Calcular plano": valida, estima o tempo, roda o motor com barra de progresso e publica o resultado.
import html from './calculator.html';
import { planejar, naoCabem } from '../../../core/index.js';
import { coletar } from '../../../domain/collect.js';
import { cfgDoMotor, estimarTempo, tempoSegundos } from '../../../domain/estimate.js';
import { caberiamGiradas, marcarLivre } from '../../../domain/rotation.js';
import { $ } from '../../dom.js';

export default {
  template: () => html,
  mount(ctx) {
    const { state, bus, fu } = ctx;

    // mensagem principal (limpa também a ação oferecida junto, ex.: "deixar girar")
    bus.on('msg', ({ text, kind }) => {
      const ma = $('msgAct'); if (ma) { ma.hidden = true; ma.innerHTML = ''; }
      const m = $('msg'); m.textContent = text || ''; m.className = 'msg' + (kind ? ' ' + kind : '');
    });

    // estimativa de tempo ao lado do botão
    let estT = null;
    function estimar() {
      clearTimeout(estT);
      estT = setTimeout(() => {
        const el = $('estTempo'); if (!el || state.running) return;
        let col; try { col = coletar(state); } catch (e) { el.textContent = ''; return; }
        if (col.erros.length || !col.groups.length) { el.textContent = ''; return; }
        const e = estimarTempo(col.groups, $('ajTempo').value);
        el.textContent = 'Deve levar uns ' + Math.round(e.segundos) + ' s' + (e.passaDoTempo ? ' (são muitas chapas, passa do tempo escolhido)' : '') + '.';
      }, 400);
    }
    bus.on('edited', estimar); bus.on('blocks', estimar); bus.on('loaded', estimar);

    const setProg = (f, txt) => {
      $('progFill').style.width = Math.round(f * 100) + '%';
      $('progBar').setAttribute('aria-valuenow', String(Math.round(f * 100)));
      $('progTxt').textContent = txt;
    };

    async function calcular(tempoOverride, silencioso) {
      if (state.running) return;
      const col = coletar(state);
      if (col.erros.length) { ctx.msg(col.erros.join(' '), 'err'); return; }
      if (!col.groups.length) { ctx.msg('Adicione ao menos uma peça.', 'err'); return; }
      const cfg = cfgDoMotor({ K: $('ajK').value, minRet: $('ajMin').value, refilo: $('ajRef').value, fases: $('ajFases').value, repetir: $('ajRep').checked });
      const ref = cfg.refilo;
      const bad = naoCabem(col.groups.map((g) => ({ ...g, SW: g.SW - 2 * ref, SH: g.SH - 2 * ref })));
      if (bad.length) {
        const b = bad[0], gira = caberiamGiradas(bad);
        ctx.msg('A peça ' + fu(b.p.c) + ' × ' + fu(b.p.l) + (b.p.nome ? ' (' + b.p.nome + ')' : '') + ' não cabe na chapa ' + b.g.nome + ' (' + fu(b.g.SW + 2 * ref) + ' × ' + fu(b.g.SH + 2 * ref) + ' ' + state.unit + (ref ? ', com refilo' : '') + ').' + (gira.length ? ' Com o veio, C precisa ir ao longo do comprimento da chapa. Girada ela cabe.' : (b.g.rot ? '' : ' Confira as medidas.')) + (bad.length > 1 ? ' Mais ' + (bad.length - 1) + ' peça(s) também não cabem.' : ''), 'err');
        if (gira.length) {
          const ma = $('msgAct');
          ma.innerHTML = '<button type="button" class="brass" id="btnLivre">Deixar ' + (gira.length === 1 ? 'essa peça girar' : 'essas ' + gira.length + ' peças girarem') + ' e calcular</button>'; ma.hidden = false;
          $('btnLivre').onclick = () => { marcarLivre(state, gira); bus.emit('blocks'); ctx.save(); calcular(); };
        }
        return;
      }
      const total = (tempoOverride || tempoSegundos($('ajTempo').value)) * 1000;
      state.running = true; state.cancel = false; state.approved = false; state.estAtual = false;
      $('btnCalc').disabled = true; $('btnCancel').hidden = false; $('prog').hidden = false; setProg(0, 'Preparando…');
      ctx.msg(col.avisos.join(' '), col.avisos.length ? 'warn' : '');
      try {
        const res = await planejar(cfg, col.groups, total, async (f, cur, n, etapa) => {
          if (state.cancel) throw new Error('cancelado');
          setProg(f, etapa || ('Otimizando chapa ' + cur + ' de ' + n + '…'));
          await new Promise((r) => setTimeout(r, 0));
        });
        state.res = res; state.cfgUsed = cfg; state.hist = [];
        bus.emit('result');
        const bad2 = [];
        res.groups.forEach((g) => g.sheets.forEach((s) => { if (!s.ok) bad2.push(s.n); }));
        if (bad2.length) ctx.msg('Atenção: a verificação falhou na chapa ' + bad2.join(', ') + '. Não use esse plano.', 'err');
        else if (!col.avisos.length) ctx.msg('Plano pronto. Verificação de limites e sobreposição: OK.', 'ok');
        if (!silencioso) { const t = $('t-res'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      } catch (e) {
        if (e && e.message === 'cancelado') ctx.msg('Cálculo cancelado.', 'warn'); else ctx.msg('Erro: ' + (e && e.message ? e.message : e), 'err');
      }
      state.running = false; $('btnCalc').disabled = false; $('btnCancel').hidden = true; $('prog').hidden = true;
    }
    ctx.actions.calcular = calcular;
    $('btnCalc').addEventListener('click', () => calcular());
    $('btnCancel').addEventListener('click', () => { state.cancel = true; });
  },
};
