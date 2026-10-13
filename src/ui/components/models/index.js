// "Comece por um modelo": escolher o móvel, informar medidas e adicionar as peças ao projeto.
// As regras de cada móvel ficam em src/domain/models/. Aqui só há tela.
import html from './template.html';
import './models.css';
import { MODELOS, modeloPorId, abrirModelo, gerarModelo, adicionarModelo } from '../../../domain/models/index.js';
import { pIn, toStr } from '../../../domain/units.js';
import { ICON } from './icons.js';
import { $, esc, rolarPara } from '../../dom.js';

export default {
  template: () => html,
  mount(ctx) {
    const { state, bus } = ctx;
    const modelo = () => (state.model ? modeloPorId(state.model.id) : null);

    function renderCards() {
      $('modelCards').innerHTML = MODELOS.map((m) =>
        '<button type="button" class="mcard" data-m="' + m.id + '" aria-pressed="' + (!!state.model && state.model.id === m.id) + '"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[m.id] + '</svg><b>' + m.nome + '</b><small>' + m.desc + '</small></button>').join('');
    }

    function renderForm() {
      const m = modelo(), box = $('modelForm');
      if (!m) { box.hidden = true; return; }
      const v = state.model.v, un = state.unit, F = ctx.F();
      let h = '<div class="grid">';
      m.campos.forEach((c) => {
        if (c.t === 'bool') h += '<label class="check" style="align-self:end;min-height:46px"><input type="checkbox" data-mk="' + c.k + '"' + (v[c.k] ? ' checked' : '') + '> ' + c.l + '</label>';
        else h += '<div class="field"><label for="mk_' + c.k + '">' + c.l + (c.t === 'dim' ? ' (' + un + ')' : '') + '</label><input id="mk_' + c.k + '" data-mk="' + c.k + '" inputmode="' + (c.t === 'int' ? 'numeric' : 'decimal') + '" value="' + (c.opt && !v[c.k] ? '' : (c.t === 'dim' ? toStr(v[c.k] / F) : v[c.k])) + '"' + (c.opt ? ' placeholder="Automático"' : '') + '></div>';
      });
      h += '</div><div class="grid">' +
        '<div class="field"><label for="mdEsp">Espessura do MDF do corpo (mm)</label><input id="mdEsp" list="dlEsp" inputmode="decimal" value="' + esc(state.model.esp) + '"></div>' +
        '<div class="field" style="grid-column: span 2"><label for="mdCorpo">Material do corpo e das portas</label><input id="mdCorpo" list="dlMarcas" value="' + esc(state.model.corpo) + '"></div>' +
        '<div class="field" style="grid-column: span 2"><label for="mdFundo">Material do fundo (6 mm)</label><input id="mdFundo" list="dlMarcas" value="' + esc(state.model.fundoNome) + '"></div>' +
        '<div class="field"><label for="mdPref">Nome do móvel (opcional)</label><input id="mdPref" placeholder="Ex.: Quarto" value="' + esc(state.model.pref) + '"></div></div>' +
        '<label class="check"><input id="mdVeio" type="checkbox"' + (state.model.veio ? ' checked' : '') + '> Material do corpo com veio (peças não giram)</label>' +
        '<div id="mdPrev"></div>' +
        '<div class="row"><button type="button" id="btnModeloAdd" class="brass big">Adicionar ao projeto</button><button type="button" id="btnModeloFechar">Fechar</button></div>' +
        '<p class="hint">As peças entram na lista da chapa e você pode editar qualquer medida. As folgas são padrões comuns: 4 mm no fundo, 3 mm entre portas, recuo de prateleira informado acima. Ajuste ao seu método de montagem.</p>';
      box.innerHTML = h; box.hidden = false; renderPrev();
    }

    function renderPrev() {
      const el = $('mdPrev'); if (!el) return;
      const r = gerarModelo(state.model);
      if (r.erro) { el.innerHTML = '<p class="msg err">' + r.erro + '</p>'; $('btnModeloAdd').disabled = true; return; }
      $('btnModeloAdd').disabled = false;
      let n = 0, a = 0; r.pecas.forEach((p) => { n += p.q; a += p.q * p.c * p.l; });
      el.innerHTML = '<div class="label">Peças geradas · ' + n + ' no total · ' + (Math.round(a / 1e4) / 100).toString().replace('.', ',') + ' m² de peças</div><div class="tbl"><table><thead><tr><th>Qtde</th><th>C × L (' + state.unit + ')</th><th>Peça</th><th>Chapa</th></tr></thead><tbody>' +
        r.pecas.map((p) => '<tr><td>' + p.q + '</td><td>' + ctx.fu(p.c) + ' × ' + ctx.fu(p.l) + '</td><td class="n">' + esc(p.n) + ((p.fc || p.fl) ? ' <span class="hint">· fita</span>' : '') + '</td><td class="n">' + (p.mat === 'fundo' ? '6 mm' : esc(state.model.esp) + ' mm') + '</td></tr>').join('') + '</tbody></table></div>';
    }

    $('modelCards').addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-m]'); if (!b) return;
      state.model = abrirModelo(modeloPorId(b.dataset.m), state.model);
      renderCards(); renderForm(); bus.emit('edited');
    });

    $('modelForm').addEventListener('input', (ev) => {
      const el = ev.target, m = modelo(); if (!m) return;
      if (el.dataset.mk) {
        const c = m.campos.find((x) => x.k === el.dataset.mk);
        if (c.t === 'bool') state.model.v[c.k] = el.checked;
        else if (c.t === 'int') state.model.v[c.k] = Math.max(c.min || 0, Math.min(c.max || 99, parseInt(el.value, 10) || 0));
        else { const x = pIn(el.value); state.model.v[c.k] = isNaN(x) ? (c.opt ? 0 : NaN) : x * ctx.F(); }
      } else if (el.id === 'mdEsp') state.model.esp = el.value;
      else if (el.id === 'mdCorpo') state.model.corpo = el.value;
      else if (el.id === 'mdFundo') state.model.fundoNome = el.value;
      else if (el.id === 'mdPref') state.model.pref = el.value;
      else if (el.id === 'mdVeio') state.model.veio = el.checked;
      renderPrev();
    });

    $('modelForm').addEventListener('click', (ev) => {
      if (ev.target.id === 'btnModeloAdd') {
        const r = adicionarModelo(state); if (r.erro) return;
        bus.emit('result'); bus.emit('blocks'); ctx.save();
        rolarPara($('t-entrada'));
        ctx.msg(r.nome + ' adicionado: ' + r.tipos + ' tipos de peça. Confira e clique em "Calcular plano".', 'ok');
      } else if (ev.target.id === 'btnModeloFechar') { state.model = null; renderCards(); renderForm(); }
      bus.emit('edited');
    });

    // A unidade é a do projeto inteiro; este seletor é só um segundo botão para o mesmo ajuste.
    const syncUn = () => { $('mdUnCm').setAttribute('aria-pressed', String(state.unit === 'cm')); $('mdUnMm').setAttribute('aria-pressed', String(state.unit === 'mm')); };
    $('mdUnCm').addEventListener('click', () => ctx.actions.setUnit('cm'));
    $('mdUnMm').addEventListener('click', () => ctx.actions.setUnit('mm'));
    bus.on('unit', () => { syncUn(); renderForm(); });
    bus.on('loaded', syncUn);
    syncUn();
    renderCards();
  },
};
