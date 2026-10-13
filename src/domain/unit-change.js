// Troca de unidade (cm <-> mm): converte o que está digitado.
import { parseLista, flagsTxt } from '../core/index.js';
import { fac, pIn, toStr } from './units.js';

/**
 * Converte todas as medidas digitadas para a nova unidade.
 * @returns {{ratio:number, cv:(s:string)=>string}|null}  null se a unidade não mudou. cv converte um texto avulso (ex.: campos fora do estado).
 */
export function trocarUnidade(state, u) {
  if (u === state.unit) return null;
  const old = fac(state.unit); state.unit = u; const r = old / fac(u);
  const cv = (s) => { const v = pIn(s); return isNaN(v) ? s : toStr(v * r); };
  state.blocks.forEach((b) => {
    b.sw = cv(b.sw); b.sh = cv(b.sh);
    b.rows.forEach((x) => { x.c = cv(x.c); x.l = cv(x.l); });
    if (b.mode === 'paste') {
      const p = parseLista(b.paste);
      b.paste = p.rows.map((x) => x.qty + ' = ' + toStr(x.c * r) + ' x ' + toStr(x.l * r) + (x.nome ? ' = ' + x.nome : '') + flagsTxt(x)).join('\n');
    }
  });
  return { ratio: r, cv };
}
