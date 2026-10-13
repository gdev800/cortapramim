// Mínimo de chapas novas só pela área das peças (o motor calcula por material em g.minNovas e g.areaNovas).
// Serve para o marceneiro saber se a sobra grande na última chapa é inevitável.
import { toStr } from './units.js';

const ch = (n) => (n === 1 ? ' chapa' : ' chapas');

/**
 * @param {{groups: {nNovas:number, minNovas?:number, areaNovas?:number}[]}} res
 * @returns {{novas:number, minimo:number, area:number, noMinimo:boolean, texto:string}|null} null para planos antigos
 */
export function resumoMinimo(res) {
  if (!res || !res.groups.length || res.groups.some((g) => typeof g.minNovas !== 'number' || typeof g.areaNovas !== 'number')) return null;
  let novas = 0, minimo = 0, area = 0;
  res.groups.forEach((g) => { novas += g.nNovas; minimo += g.minNovas; area += g.areaNovas; });
  if (!novas) return null;
  const a = toStr(Math.round(area * 100) / 100);
  const noMinimo = novas <= minimo;
  let texto;
  if (noMinimo) texto = 'Mínimo possível: as peças somam ' + a + ch(area) + ' de área.';
  else if (minimo - area < 0.05) texto = 'As peças somam ' + a + ' chapas de área: caber em ' + minimo + ' é praticamente impossível.';
  else texto = 'As peças somam ' + a + ' chapas de área: em teoria cabem em ' + minimo + ', mas com cortes retos nem sempre dá.';
  return { novas, minimo, area, noMinimo, texto };
}
