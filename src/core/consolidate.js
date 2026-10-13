// Depois de otimizar cada chapa, tenta passar peças das últimas chapas para espaços livres das anteriores.
// Só vale se o espaço livre ficar mais concentrado (a última chapa esvazia e vira retalho maior ou deixa de ser comprada).
import { moverPeca } from './edit.js';

const livre = (s) => 1 - s.area / (s.cfg.SW * s.cfg.SH);
const q = (s) => livre(s) * livre(s);

const uso = (s) => s.area / (s.cfg.SW * s.cfg.SH);

/**
 * Tenta tirar uma chapa do plano passando todas as peças dela para as outras (as mais cheias primeiro).
 * Só vale se todas as peças acharem lugar; senão o plano fica como estava.
 * @returns {object[]|null} a lista nova, sem a chapa, ou null se não deu.
 */
function esvaziar(lista, alvo) {
  let src = alvo;
  const outras = lista.filter((s) => s !== alvo && !s.sobra && s.spec).map((s) => s);
  if (!outras.length) return null;
  const ordem = src.pecas.slice().sort((a, b) => b.w * b.h - a.w * a.h).map((p) => p.id);
  for (let k = 0; k < ordem.length; k++) {
    let achou = false;
    outras.sort((a, b) => uso(b) - uso(a));
    for (let i = 0; i < outras.length && !achou; i++) {
      const r = moverPeca(src, ordem[k], outras[i]);
      if (r.erro) continue;
      outras[i] = r.to; r.to.manual = false; src = r.from; achou = true;
      if (!src) break;
    }
    if (!achou) return null;
    if (!src) break;
  }
  if (src) return null;
  const novos = new Map(outras.map((s) => [s.n, s]));
  return lista.filter((s) => s !== alvo).map((s) => novos.get(s.n) || s);
}

/** @param {object[]} sheets chapas de um mesmo material. @returns {object[]} as mesmas chapas, com peças movidas e chapas vazias removidas. */
export function consolidar(sheets) {
  let lista = sheets.slice();
  for (let rodada = 0; rodada < 20; rodada++) {
    lista = concentrar(lista);
    // chapas menos usadas primeiro: se uma delas couber toda nas outras, o plano perde uma chapa
    const candidatas = lista.filter((s) => !s.sobra && s.spec).sort((a, b) => uso(a) - uso(b)).slice(0, 3);
    let saiu = false;
    for (let c = 0; c < candidatas.length && !saiu; c++) {
      const nova = esvaziar(lista, candidatas[c]);
      if (nova) { lista = nova; saiu = true; }
    }
    if (!saiu) break;
  }
  return lista;
}

function concentrar(sheets) {
  const lista = sheets.slice();
  for (let guarda = 0; guarda < 200; guarda++) {
    let mexeu = false;
    for (let j = lista.length - 1; j > 0 && !mexeu; j--) {
      const src = lista[j];
      if (src.sobra || !src.spec) continue;
      const pecas = src.pecas.slice().sort((a, b) => b.w * b.h - a.w * a.h);
      for (let k = 0; k < pecas.length && !mexeu; k++) {
        for (let i = 0; i < j && !mexeu; i++) {
          const dst = lista[i];
          if (dst.sobra || !dst.spec) continue;
          const r = moverPeca(src, pecas[k].id, dst);
          if (r.erro) continue;
          const antes = q(src) + q(dst), depois = (r.from ? q(r.from) : 1) + q(r.to);
          if (depois <= antes + 1e-9) continue;
          r.to.manual = false; lista[i] = r.to;
          if (r.from) { r.from.manual = false; lista[j] = r.from; } else lista.splice(j, 1);
          mexeu = true;
        }
      }
    }
    if (!mexeu) break;
  }
  return lista;
}
