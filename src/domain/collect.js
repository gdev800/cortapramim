// Transforma o que foi digitado (texto da tela) em dados para o motor de corte (milímetros).
import { parseLista } from '../core/index.js';
import { fac, pIn } from './units.js';
import { sobrasDoBloco } from './scraps.js';

export const MAX_POR_LINHA = 999;
export const MAX_TOTAL = 1500;

/**
 * @returns {{groups: object[], erros: string[], avisos: string[]}}
 *   groups: um grupo por chapa, com as peças expandidas (uma entrada por peça física).
 */
export function coletar(state) {
  const erros = [], avisos = [], groups = [], metas = [];
  let id = 0, totalQ = 0;
  const F = fac(state.unit);

  state.blocks.forEach((b, bi) => {
    const nome = b.nome.trim() || 'Chapa ' + (bi + 1);
    const rows = [];

    if (b.mode === 'paste') {
      const p = parseLista(b.paste);
      p.rows.forEach((r) => rows.push({ qty: r.qty, c: r.c * F, l: r.l * F, nome: r.nome, fc: r.fc || 0, fl: r.fl || 0, livre: !!r.livre }));
      if (p.ignorados.length) avisos.push(nome + ': ' + p.ignorados.length + ' linha(s) não reconhecida(s): "' + p.ignorados[0] + '"' + (p.ignorados.length > 1 ? ' …' : ''));
    } else {
      b.rows.forEach((r, i) => {
        const q = r.q.trim(), c = pIn(r.c), l = pIn(r.l);
        if (!q && !r.c.trim() && !r.l.trim()) return;
        const qty = q === '' ? 1 : parseInt(q, 10);
        if (!(qty > 0) || !(c > 0) || !(l > 0)) { erros.push(nome + ', linha ' + (i + 1) + ': preencha quantidade, C e L com números.'); return; }
        rows.push({ qty, c: c * F, l: l * F, nome: r.n.trim(), fc: parseInt(r.fc, 10) || 0, fl: parseInt(r.fl, 10) || 0, livre: !!r.livre });
      });
    }
    if (!rows.length) return;

    rows.forEach((r) => { totalQ += r.qty; });
    if (rows.some((r) => r.qty > MAX_POR_LINHA) || totalQ > MAX_TOTAL) {
      erros.push(nome + ': quantidade grande demais (máximo ' + MAX_POR_LINHA + ' por linha e ' + MAX_TOTAL + ' peças no total). Confira os números.');
      return;
    }
    const sw = pIn(b.sw) * F, sh = pIn(b.sh) * F;
    if (!(sw > 0) || !(sh > 0)) { erros.push(nome + ': informe o tamanho da chapa.'); return; }

    // Espessura da fita (mm): se ligada, as medidas digitadas são finais e o corte desconta a fita de cada lado.
    const fe = Math.min(5, Math.max(0, pIn(state.aj && state.aj.fitaEsp) || 0));
    const r2 = (v) => Math.round(v * 100) / 100;
    let fitaGrande = false;
    const pieces = [];
    rows.forEach((r) => {
      const desc = fe > 0 && (r.fc || r.fl);
      const cCorte = desc ? r2(r.c - (r.fl || 0) * fe) : r2(r.c);
      const lCorte = desc ? r2(r.l - (r.fc || 0) * fe) : r2(r.l);
      if (!(cCorte > 0) || !(lCorte > 0)) { fitaGrande = true; return; }
      for (let i = 0; i < r.qty; i++) {
        const p = { id: ++id, c: cCorte, l: lCorte, nome: r.nome, fc: r.fc, fl: r.fl, livre: r.livre };
        if (desc) { p.cf = r2(r.c); p.lf = r2(r.l); }
        if (b.origem) p.proj = b.origem;
        pieces.push(p);
      }
    });
    if (fitaGrande) { erros.push(nome + ': a espessura da fita é maior que alguma peça. Confira as medidas.'); return; }
    const est = parseInt(b.estoque, 10), pr = pIn(b.preco), ft = pIn(b.fita);
    metas.push({ origem: b.origem || '', chave: [nome.toLowerCase(), pIn(b.esp), sw, sh, b.veio ? 1 : 0].join('|') });
    groups.push({
      nome, esp: pIn(b.esp) > 0 ? pIn(b.esp) : 0, SW: Math.round(sw * 100) / 100, SH: Math.round(sh * 100) / 100, rot: !b.veio,
      estoque: est > 0 ? est : 0, preco: pr > 0 ? pr : 0, fitaPreco: ft > 0 ? ft : 0, fitaNome: (b.fitaNome || '').trim(), pieces,
      sobras: sobrasDoBloco(state, b).map((s) => ({ id: s.id, c: s.c, l: s.l, nome: s.nome })),
    });
  });
  return { groups: juntarIguais(groups, metas), erros, avisos };
}

/** Chapas de projetos juntados (b.origem) com o mesmo nome, espessura, tamanho e veio viram uma só: as peças dividem as mesmas chapas. */
function juntarIguais(groups, metas) {
  const out = [], vistos = {};
  groups.forEach((g, i) => {
    const m = metas[i];
    if (!m.origem) { out.push(g); return; }
    const alvo = vistos[m.chave];
    if (!alvo) { vistos[m.chave] = g; out.push(g); return; }
    alvo.pieces = alvo.pieces.concat(g.pieces);
    alvo.estoque = Math.max(alvo.estoque, g.estoque);
    // preço e fita: vale o primeiro informado
    ['preco', 'fitaPreco', 'fitaNome'].forEach((k) => { if (!alvo[k]) alvo[k] = g[k]; });
    g.sobras.forEach((s) => { if (!alvo.sobras.some((x) => x.id === s.id)) alvo.sobras.push(s); });
  });
  return out;
}
