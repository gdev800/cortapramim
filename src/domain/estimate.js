// Limites do cálculo e estimativa de tempo.
import { pIn } from './units.js';

export const MAX_SERRA_MM = 30;
export const MAX_REFILO_MM = 100;
export const TEMPO_MAX_S = 300;
export const TEMPO_PADRAO_S = 15;

/** Tempo escolhido (texto da tela) em segundos, sempre entre 1 e 300. */
export function tempoSegundos(texto) {
  const tt = parseInt(texto, 10);
  return tt > 0 ? Math.min(tt, TEMPO_MAX_S) : TEMPO_PADRAO_S;
}

/** Ajustes da tela (texto) -> configuração do motor, com limites de segurança. */
export function cfgDoMotor(aj) {
  return {
    K: Math.min(MAX_SERRA_MM, Math.max(0, pIn(aj.K) || 0)),
    minRet: Math.max(0, pIn(aj.minRet) || 0),
    refilo: Math.min(MAX_REFILO_MM, Math.max(0, pIn(aj.refilo) || 0)),
    fases: [2, 3].includes(parseInt(aj.fases, 10)) ? parseInt(aj.fases, 10) : 0, // 0 = livre
    repetir: aj.repetir !== false, // mesmo desenho em várias chapas quando não gasta chapa a mais
  };
}

/** Estimativa para mostrar ao lado do botão. O motor gasta no mínimo uma fatia por chapa. */
export function estimarTempo(groups, tempoTexto) {
  const total = tempoSegundos(tempoTexto) * 1000;
  let tp = 0, nSh = 0;
  groups.forEach((g) => {
    let area = 0; g.pieces.forEach((p) => { area += p.c * p.l; }); tp += g.pieces.length;
    nSh += Math.max(1, Math.ceil(area / (g.SW * g.SH * 0.8)));
  });
  const piso = nSh * (tp / nSh <= 4 ? 120 : 350);
  return { segundos: Math.max(total, piso) / 1000, passaDoTempo: piso > total * 1.3 };
}
