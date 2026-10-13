// Custos e preço de venda.
import { fitaMetros } from '../core/index.js';
import { pIn } from './units.js';

/**
 * @returns {{chapas:number, fita:number, fitaM:number, ferr:number, mao:number, mg:number, custo:number, venda:number}}
 *   venda é 0 quando não há margem informada.
 */
export function custos(res, ferr, orc) {
  let chapas = 0, fita = 0, fitaM = 0;
  res.groups.forEach((g) => {
    chapas += g.nNovas * (g.preco || 0);
    const m = fitaMetros(g); fitaM += m; fita += m * (g.fitaPreco || 0);
  });
  let f = 0;
  ferr.forEach((x) => { const q = pIn(x.q), p = pIn(x.p); if (q > 0 && p > 0) f += q * p; });
  const mao = pIn(orc.mao) || 0, mg = pIn(orc.margem) || 0;
  const custo = chapas + fita + f + mao;
  return { chapas, fita, fitaM, ferr: f, mao, mg, custo, venda: mg > 0 ? custo * (1 + mg / 100) : 0 };
}

/**
 * Custo de chapas e fita repartido por projeto (para cálculos com projetos juntados).
 * A chapa é dividida pela área das peças de cada projeto; a fita é medida peça a peça.
 * Ferragens e mão de obra não entram: são do conjunto.
 * @returns {{nome:string, pecas:number, area:number, chapas:number, fita:number, total:number}[]}  área em m²
 */
export function custoPorProjeto(res) {
  const m = {};
  const de = (nome) => (m[nome] = m[nome] || { nome, pecas: 0, area: 0, chapas: 0, fita: 0, total: 0 });
  res.groups.forEach((g) => {
    let areaG = 0;
    g.sheets.forEach((s) => s.pecas.forEach((q) => { areaG += q.w * q.h; }));
    const custoChapas = g.nNovas * (g.preco || 0);
    g.sheets.forEach((s) => s.pecas.forEach((q) => {
      const r = de(q.proj || 'Sem projeto'), a = q.w * q.h;
      r.pecas += 1; r.area += a / 1e6;
      if (areaG > 0) r.chapas += custoChapas * a / areaG;
      r.fita += ((q.fc || 0) * (q.cf || q.c) + (q.fl || 0) * (q.lf || q.l)) / 1000 * (g.fitaPreco || 0);
    }));
  });
  return Object.values(m).map((r) => ({ ...r, total: r.chapas + r.fita }));
}

/** Valor da proposta: o que o usuário digitou ou, se vazio, o preço de venda (ou o custo) do plano. */
export function valorProposta(state) {
  const man = pIn(state.prop.valor);
  if (man > 0) return man;
  if (state.res) { const c = custos(state.res, state.ferr, state.orc); return c.venda > 0 ? c.venda : c.custo; }
  return 0;
}
