// Editor das chapas e das peças. Cada chapa pode ser digitada "como no caderno" ou colada de uma planilha.
// Todos os campos têm data-k (campo da chapa) ou data-f (campo da linha); os botões têm data-act.
import { parseLista, flagsTxt } from '../../../core/index.js';
import { SIZES, pIn, toStr, norm } from '../../../domain/units.js';
import { newRow, newBlock, tamKey } from '../../../domain/state.js';
import { sobrasDoBloco, sobrasDescartadas } from '../../../domain/scraps.js';
import { xlsxParaTexto } from '../../../infra/xlsx.js';
import { $, esc } from '../../dom.js';
import { numeroDeAjuda } from './hints.js';

export default {
  template: () => '',   // o HTML do contêiner vem de blocks.html, montado pelo EntryPanel
  mount(ctx) {
    const { state, bus } = ctx;
    const { fu } = ctx;
    const blkEl = (uid) => document.querySelector('.blk[data-b="' + uid + '"]');
    const blkOf = (el) => { const e = el.closest('.blk'); if (!e) return null; const u = parseInt(e.dataset.b, 10); return state.blocks.find((b) => b.uid === u); };

    // ---------- desenho ----------
    function rowHTML(r, i) {
      const flags = (r.fc !== '0' || r.fl !== '0' || r.livre);
      const sel = (f, v) => '<select data-f="' + f + '">' + ['0', '1', '2'].map((o) => '<option value="' + o + '"' + (v === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select>';
      return '<div class="nrow" data-r="' + r.uid + '">' +
        '<input data-f="q" inputmode="numeric" placeholder="Qtde" aria-label="Quantidade, peça ' + (i + 1) + '" value="' + esc(r.q) + '">' +
        '<span class="g" aria-hidden="true">=</span>' +
        '<input data-f="c" inputmode="decimal" placeholder="C" aria-label="Comprimento C, peça ' + (i + 1) + '" value="' + esc(r.c) + '">' +
        '<span class="g" aria-hidden="true">×</span>' +
        '<input data-f="l" inputmode="decimal" placeholder="L" aria-label="Largura L, peça ' + (i + 1) + '" value="' + esc(r.l) + '">' +
        '<span class="g" aria-hidden="true">=</span>' +
        '<input class="nm" data-f="n" placeholder="Nome (opcional): Fundo, Porta…" aria-label="Nome da peça ' + (i + 1) + '" value="' + esc(r.n) + '">' +
        '<button type="button" class="ob' + (flags ? ' on' : '') + '" data-act="opts" aria-expanded="' + (r.open ? 'true' : 'false') + '" aria-label="Fita de borda e giro, peça ' + (i + 1) + '" title="Fita de borda e giro">⋯</button>' +
        '<button type="button" class="del" data-act="del-row" aria-label="Remover peça ' + (i + 1) + '">×</button>' +
        (r.open ? '<div class="opts"><label>Fita nos lados C (0 a 2)' + sel('fc', r.fc) + '</label><label>Fita nos lados L (0 a 2)' + sel('fl', r.fl) + '</label><label class="check"><input type="checkbox" data-f="livre"' + (r.livre ? ' checked' : '') + '> Esta peça pode girar (sem veio)</label></div>' : '') +
        '</div>';
    }
    const rowsHTML = (b) => '<div class="nrow-head" aria-hidden="true"><span>Qtde</span><span></span><span>C</span><span></span><span>L</span><span></span><span>Nome</span><span></span><span></span></div>' + b.rows.map(rowHTML).join('');

    function countText(b) {
      if (b.mode === 'paste') {
        const p = parseLista(b.paste); let n = 0; p.rows.forEach((r) => { n += r.qty; });
        return n + (n === 1 ? ' peça' : ' peças') + ' reconhecidas' + (p.ignorados.length ? ' · ' + p.ignorados.length + (p.ignorados.length === 1 ? ' linha ignorada' : ' linhas ignoradas') : '');
      }
      let n = 0; b.rows.forEach((r) => { if (r.c.trim() || r.l.trim()) { const q = parseInt(r.q, 10); n += q > 0 ? q : 1; } });
      return n + (n === 1 ? ' peça' : ' peças');
    }

    function sobInfo(b) {
      const s = sobrasDoBloco(state, b), desc = b.usarSobras ? sobrasDescartadas(state, b) : [];
      if (!s.length && !desc.length && b.usarSobras) return '';
      const maior = s.slice().sort((a, c) => c.c * c.l - a.c * a.l)[0];
      const aviso = desc.length
        ? '<p class="hint sobwarn" role="status"><b>' + (desc.length === 1 ? '1 sobra parecida não será usada' : desc.length + ' sobras parecidas não serão usadas') + ':</b> ' +
          desc.slice(0, 3).map((d) => esc(d.sobra.nome) + ' ' + fu(d.sobra.c) + '×' + fu(d.sobra.l) + ' (' + d.motivos.join('; ') + ')').join(' · ') + (desc.length > 3 ? ' · e mais ' + (desc.length - 3) : '') + '. Ajuste o nome ou a espessura da chapa para usá-la.</p>'
        : '';
      return '<label class="check sobinfo"><input type="checkbox" data-k="usarSobras"' + (b.usarSobras ? ' checked' : '') + '> Usar minhas sobras primeiro' + (s.length ? ' <span class="tag">' + s.length + (s.length === 1 ? ' compatível' : ' compatíveis') + ' · maior ' + fu(maior.c) + '×' + fu(maior.l) + '</span>' : '') + '</label>' + aviso;
    }

    function blockHTML(b, i) {
      const k = tamKey(state, b), un = state.unit;
      let h = '<section class="blk" data-b="' + b.uid + '" aria-label="Chapa ' + (i + 1) + '">' +
        '<div class="blk-h"><h3>Chapa ' + (i + 1) + (b.origem ? ' <span class="tag">projeto: ' + esc(b.origem) + '</span>' : '') + '</h3>' + (state.blocks.length > 1 ? '<button type="button" data-act="del-blk">Remover chapa</button>' : '') + '</div>' +
        '<div class="grid">' +
        '<div class="field" style="grid-column: span 2"><label>Marca e modelo</label><input data-k="nome" list="dlMarcas" placeholder="Ex.: Branco TX Eucatex" value="' + esc(b.nome) + '"></div>' +
        '<div class="field"><label>Espessura (mm)</label><input data-k="esp" list="dlEsp" inputmode="decimal" value="' + esc(b.esp) + '"></div>' +
        '</div><div class="grid">' +
        '<div class="field"><label>Tamanho da chapa</label><select data-k="tam">' + SIZES.map((s) => '<option value="' + s[0] + '"' + (s[0] === k ? ' selected' : '') + '>' + s[1] + '</option>').join('') + '<option value="custom"' + (k === 'custom' ? ' selected' : '') + '>Outro tamanho…</option></select></div>' +
        '<div class="field"><label>Comprimento (' + un + ')</label><input data-k="sw" inputmode="decimal" value="' + esc(b.sw) + '"></div>' +
        '<div class="field"><label>Largura (' + un + ')</label><input data-k="sh" inputmode="decimal" value="' + esc(b.sh) + '"></div>' +
        '</div>' +
        '<label class="check"><input type="checkbox" data-k="veio"' + (b.veio ? ' checked' : '') + '> Chapa com veio ou textura (não gira as peças)</label>' +
        '<p class="hint" style="margin-top:-6px">' + (b.veio ? 'C de cada peça fica ao longo do comprimento da chapa, no sentido do veio. Em peças que podem girar, use o botão ⋯ da linha.' : 'Sem veio: o programa pode girar as peças 90° para aproveitar melhor.') + ' Confira o tamanho real com o fornecedor.</p>' +
        (b.veio ? '<p class="msg warn veiowarn" role="status"><b>Com veio, o aproveitamento é menor.</b> As peças não giram e sobram mais retalhos. Marque só se a chapa tem ranhura ou textura que precisa seguir o mesmo sentido. Chapa lisa: desmarque.</p>' : '') +
        '<div class="sobslot">' + sobInfo(b) + '</div>' +
        '<details class="opt"><summary>Estoque e preço (opcional)</summary><div class="grid" style="margin-top:10px">' +
        '<div class="field"><label>Chapas novas que tenho</label><input data-k="estoque" inputmode="numeric" placeholder="Vazio = comprar tudo" value="' + esc(b.estoque) + '"></div>' +
        '<div class="field"><label>Preço por chapa (R$)</label><input data-k="preco" inputmode="decimal" placeholder="Opcional" value="' + esc(b.preco) + '"></div>' +
        '<div class="field"><label>Fita de borda (R$ por metro)</label><input data-k="fita" inputmode="decimal" placeholder="Opcional" value="' + esc(b.fita) + '"></div>' +
        '<div class="field"><label>Fita usada (nome)</label><input data-k="fitaNome" placeholder="Ex.: Fita branca 22mm" value="' + esc(b.fitaNome) + '"></div></div></details>' +
        '<div class="blk-pecas"><div class="row between"><h4 style="margin:0;font-family:var(--f-display);font-size:1.15rem;font-weight:600">Peças desta chapa</h4>' +
        '<div class="seg sm" role="group" aria-label="Como informar as peças"><button type="button" data-act="mode-form" aria-pressed="' + (b.mode === 'form') + '">Digitar</button><button type="button" data-act="mode-paste" aria-pressed="' + (b.mode === 'paste') + '">Colar planilha</button></div></div>';
      if (b.mode === 'form') {
        h += '<p class="hint">Como no caderno: quantidade = comprimento × largura = nome. Em ' + un + '.</p><div class="rows">' + rowsHTML(b) + '</div>' +
          '<div class="row"><button type="button" class="primary" data-act="add-row">+ Peça</button><button type="button" data-act="clear">Limpar</button><span class="hint cnt">' + countText(b) + '</span></div>';
      } else {
        h += '<div class="field"><label class="lbl">Colunas: Qtde, C, L, Nome (em ' + un + ')</label>' +
          '<textarea data-k="paste" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="2\t54,3\t49\tFundo&#10;4\t12\t35\tPrateleira&#10;ou: 2 = 54,3 x 49 = Fundo">' + esc(b.paste) + '</textarea>' +
          '<small>' + numeroDeAjuda + '</small></div>' +
          '<div class="row"><button type="button" data-act="file">Abrir arquivo CSV ou TXT</button><button type="button" data-act="clear">Limpar</button><span class="pastehint cnt">' + countText(b) + '</span></div>';
      }
      return h + '</div></section>';
    }

    function render() {
      $('blocks').innerHTML = state.blocks.map(blockHTML).join('');
      bus.emit('edited');
    }
    const renderRowsOf = (b) => { const el = blkEl(b.uid); if (!el) return; el.querySelector('.rows').innerHTML = rowsHTML(b); el.querySelector('.cnt').textContent = countText(b); };
    const refreshSob = (b) => { const el = blkEl(b.uid); if (el) el.querySelector('.sobslot').innerHTML = sobInfo(b); };
    function addRow(b, focus) {
      const r = newRow(state); b.rows.push(r); renderRowsOf(b);
      if (focus) { const el = blkEl(b.uid).querySelector('[data-r="' + r.uid + '"] [data-f="q"]'); if (el) el.focus(); }
      ctx.save();
    }
    const rowsToText = (b) => b.rows.filter((r) => r.c.trim() && r.l.trim())
      .map((r) => (r.q.trim() || '1') + ' = ' + r.c.trim() + ' x ' + r.l.trim() + (r.n.trim() ? ' = ' + r.n.trim() : '') + flagsTxt({ fc: parseInt(r.fc, 10) || 0, fl: parseInt(r.fl, 10) || 0, livre: r.livre })).join('\n');

    // ---------- eventos ----------
    const box = $('blocks');
    box.addEventListener('input', (ev) => {
      const el = ev.target, b = blkOf(el); if (!b) return;
      if (el.dataset.f) {
        const rowEl = el.closest('.nrow'); const r = b.rows.find((x) => x.uid === parseInt(rowEl.dataset.r, 10));
        if (r) { r[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value; const ob = rowEl.querySelector('.ob'); if (ob) ob.classList.toggle('on', r.fc !== '0' || r.fl !== '0' || r.livre); }
        blkEl(b.uid).querySelector('.cnt').textContent = countText(b);
      } else if (el.dataset.k) {
        const k = el.dataset.k;
        if (k === 'veio') { b.veio = el.checked; render(); }
        else if (k === 'usarSobras') { b.usarSobras = el.checked; refreshSob(b); }
        else if (k === 'tam') {
          if (el.value !== 'custom') {
            const p = el.value.split('x'); b.sw = ctx.fu(Number(p[0])); b.sh = ctx.fu(Number(p[1]));
            const bl = blkEl(b.uid); bl.querySelector('[data-k="sw"]').value = b.sw; bl.querySelector('[data-k="sh"]').value = b.sh;
          }
        } else {
          b[k] = el.value;
          if (k === 'sw' || k === 'sh') blkEl(b.uid).querySelector('[data-k="tam"]').value = tamKey(state, b);
          if (k === 'nome' || k === 'esp') refreshSob(b);
          if (k === 'paste') blkEl(b.uid).querySelector('.cnt').textContent = countText(b);
        }
      }
      ctx.save(); bus.emit('edited');
    });

    box.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' || !ev.target.dataset.f || ev.target.tagName !== 'INPUT' || ev.target.type === 'checkbox') return;
      ev.preventDefault();
      const b = blkOf(ev.target); const ins = Array.prototype.slice.call(blkEl(b.uid).querySelectorAll('.nrow > input'));
      const k = ins.indexOf(ev.target);
      if (k >= 0 && k < ins.length - 1) ins[k + 1].focus(); else addRow(b, true);
    });

    box.addEventListener('click', (ev) => {
      const bt = ev.target.closest('button[data-act]'); if (!bt) return;
      const b = blkOf(bt), act = bt.dataset.act; if (!b) return;
      const rowId = () => parseInt(bt.closest('.nrow').dataset.r, 10);
      if (act === 'add-row') addRow(b, true);
      else if (act === 'opts') { const r = b.rows.find((x) => x.uid === rowId()); r.open = !r.open; renderRowsOf(b); ctx.save(); }
      else if (act === 'del-row') {
        const id = rowId(); b.rows = b.rows.filter((r) => r.uid !== id); if (!b.rows.length) b.rows.push(newRow(state));
        renderRowsOf(b); ctx.save();
      }
      else if (act === 'clear') { b.rows = [newRow(state)]; b.paste = ''; render(); ctx.save(); }
      else if (act === 'del-blk') { state.blocks = state.blocks.filter((x) => x !== b); render(); ctx.save(); }
      else if (act === 'mode-paste') { if (b.mode !== 'paste') { b.paste = rowsToText(b); b.mode = 'paste'; render(); ctx.save(); } }
      else if (act === 'mode-form') {
        if (b.mode !== 'form') {
          const p = parseLista(b.paste);
          if (p.rows.length) b.rows = p.rows.map((r) => newRow(state, { q: r.qty, c: toStr(r.c), l: toStr(r.l), n: r.nome, fc: r.fc, fl: r.fl, livre: r.livre }));
          b.mode = 'form'; render(); ctx.save();
        }
      }
      else if (act === 'file') { state.fileFor = b.uid; $('fileIn').value = ''; $('fileIn').click(); }
      bus.emit('edited');
    });

    // Arquivo aberto: CSV/TXT entram como texto; Excel é convertido para texto de colunas.
    $('fileIn').addEventListener('change', function () {
      const f = this.files && this.files[0]; const b = state.blocks.find((x) => x.uid === state.fileFor);
      if (!f || !b) return;
      const rd = new FileReader(); const isX = /\.xlsx?$/i.test(f.name);
      rd.onload = () => {
        try { b.paste = isX ? xlsxParaTexto(rd.result) : String(rd.result || ''); } catch (e) { ctx.msg(e && e.message ? e.message : 'Não consegui ler a planilha.', 'err'); return; }
        if (isX && !b.paste) { ctx.msg('Não achei peças na planilha. Use colunas Qtde, C, L e Nome.', 'warn'); return; }
        b.mode = 'paste'; render(); ctx.save(); if (isX) ctx.msg('Planilha lida. Confira a lista abaixo.', 'ok');
      };
      if (isX) rd.readAsArrayBuffer(f); else rd.readAsText(f);
    });

    bus.on('loaded', render); bus.on('unit', render); bus.on('blocks', render); bus.on('estoque', render);
  },
};
