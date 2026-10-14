// Estoque de chapas inteiras, fita de borda e ferragens.
import html from './template.html';
import { adicionarInsumo, definirQuantidade, removerInsumo } from '../../../domain/supplies.js';
import { toStr } from '../../../domain/units.js';
import { definirMinimo, minimoDe } from '../../../domain/restock.js';
import { $, esc } from '../../dom.js';
import { fotografar, registrarEntrada, registrarAjuste } from '../../../domain/history.js';

export default {
  template: () => html,
  mount(ctx) {
    const { state, bus } = ctx;

    function render() {
      const el = $('insList');
      if (!state.insumos.length) { el.innerHTML = '<p class="hint">Nada cadastrado ainda. Cadastre o rolo de fita e as ferragens que você tem. O plano mostra o que falta comprar.</p>'; return; }
      const desc = (s) => s.tipo === 'chapa' ? esc(s.nome) + ' · ' + esc(String(s.esp).replace('.', ',')) + ' mm · ' + ctx.fu(s.c) + ' × ' + ctx.fu(s.l) + ' ' + state.unit : esc(s.nome);
      const TAG = { fita: 'fita', ferr: 'ferragem', chapa: 'chapa' };
      el.innerHTML = state.insumos.map((s) =>
        '<div class="srow' + (minimoDe(s) > 0 && s.q < minimoDe(s) ? ' abaixo-min' : '') + '"><span>' + desc(s) + ' <span class="tag">' + (TAG[s.tipo] || s.tipo) + '</span></span><span class="row" style="flex-wrap:nowrap;gap:8px"><input class="qin" data-iq="' + esc(s.id) + '" inputmode="decimal" value="' + esc(toStr(s.q)) + '" aria-label="Quantidade em estoque de ' + esc(s.nome) + '"><span class="hint">' + (s.tipo === 'fita' ? 'm' : 'un') + '</span><span class="hint">mín.</span><input class="qin" data-imin="' + esc(s.id) + '" inputmode="decimal" placeholder="–" value="' + (minimoDe(s) ? esc(toStr(minimoDe(s))) : '') + '" aria-label="Estoque mínimo de ' + esc(s.nome) + '"><button type="button" data-idel="' + esc(s.id) + '" aria-label="Remover">Remover</button></span></div>').join('');
    }
    const mudou = () => { ctx.pers.saveInsumos(); ctx.pers.saveHistorico(); bus.emit('insumos'); bus.emit('historico'); };
    const un = (it) => (it.tipo === 'fita' ? 'm' : 'un');
    const rotulo = (it) => it.tipo === 'chapa' ? it.nome + ' ' + String(it.esp).replace('.', ',') + ' mm ' + ctx.fu(it.c) + '×' + ctx.fu(it.l) + ' ' + state.unit : it.nome;

    $('insList').addEventListener('change', (ev) => {
      if (ev.target.dataset.imin) {
        const r = definirMinimo(state, ev.target.dataset.imin, ev.target.value);
        $('insMsg').textContent = r.erro || '';
        ctx.pers.saveInsumos(); bus.emit('insumos'); return;
      }
      if (!ev.target.dataset.iq) return;
      const it = state.insumos.find((x) => x.id === ev.target.dataset.iq); if (!it) return;
      const antes = fotografar(state), de = it.q;
      definirQuantidade(state, it.id, ev.target.value);
      if (it.q !== de) registrarAjuste(state, { tipoItem: it.tipo, nome: rotulo(it), de, para: it.q, un: un(it), obs: 'corrigido à mão' }, antes);
      mudou();
    });
    $('insList').addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-idel]'); if (!b) return;
      const it = state.insumos.find((x) => x.id === b.dataset.idel), antes = fotografar(state);
      removerInsumo(state, b.dataset.idel);
      if (it) registrarAjuste(state, { tipoItem: it.tipo, nome: rotulo(it), de: it.q, para: 0, un: un(it), obs: 'removido' }, antes);
      mudou();
    });
    $('btnIns').addEventListener('click', () => {
      const antes = fotografar(state);
      const r = adicionarInsumo(state, { tipo: $('insTipo').value, nome: $('insNome').value, q: $('insQ').value, esp: $('insEsp').value, c: $('insC').value, l: $('insL').value });
      if (r.erro) { $('insMsg').textContent = r.erro; return; }
      const it = r.item;
      if (it) registrarEntrada(state, { tipoItem: it.tipo, nome: rotulo(it), q: r.q, un: un(it), obs: r.somou ? 'somado ao que já tinha' : '' }, antes);
      mudou();
      $('insMsg').textContent = r.somou ? 'Quantidade somada ao item existente.' : 'Item guardado.'; $('insNome').value = ''; $('insQ').value = '';
    });

    // chapa: pede espessura e tamanho; o nome é o mesmo "Marca e modelo" da chapa no plano
    const tipo = () => {
      const ch = $('insTipo').value === 'chapa';
      $('insChapa').hidden = !ch;
      $('insNome').placeholder = ch ? 'Ex.: Branco TX Eucatex' : 'Ex.: Fita branca 22mm';
      $('insCl').textContent = 'Comprimento (' + state.unit + ')'; $('insLl').textContent = 'Largura (' + state.unit + ')';
      if (ch && !$('insC').value && !$('insL').value) { $('insC').value = ctx.fu(2750); $('insL').value = ctx.fu(1850); }
    };
    $('insTipo').addEventListener('change', tipo);
    bus.on('unit', (p) => { if (p && p.cv) ['insC', 'insL'].forEach((id) => { $(id).value = p.cv($(id).value); }); tipo(); render(); });
    bus.on('insumos', render); bus.on('loaded', () => { tipo(); render(); });
    tipo();
    render();
  },
};
