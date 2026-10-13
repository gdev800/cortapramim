// Comparar versões do plano: "como está", "tudo pode girar" e "sem usar as sobras".
import { planejar } from '../core/index.js';

export function resumoRes(res) {
  let ap = 0, as = 0, nov = 0, sob = 0, custo = 0, maior = null;
  res.groups.forEach((g) => {
    nov += g.nNovas; sob += g.nSobras; custo += g.nNovas * (g.preco || 0);
    g.sheets.forEach((s) => {
      ap += s.area; as += s.cfg.SW * s.cfg.SH;
      if (s.maiorRetalho && (!maior || s.maiorRetalho.w * s.maiorRetalho.h > maior.w * maior.h)) maior = s.maiorRetalho;
    });
  });
  return { nov, sob, util: as ? ap / as : 0, maior, custo };
}

/** Quais cenários extras fazem sentido para estes grupos. */
export function cenariosPossiveis(groups) {
  return {
    giro: groups.some((g) => !g.rot),
    semsobra: groups.some((g) => g.sobras.length),
  };
}

/** Menos chapas novas; empatando, melhor aproveitamento. */
export function melhorCenario(lista) {
  let melhor = lista[0];
  lista.forEach((c) => { if (c.r.nov < melhor.r.nov || (c.r.nov === melhor.r.nov && c.r.util > melhor.r.util + 1e-9)) melhor = c; });
  return melhor;
}

/**
 * Roda os cenários. onProgress(nome) avisa qual está rodando. `atual` é o plano que já existe (ou null).
 * @returns {Promise<Array<{id:string, nome:string, r:object}>>}
 */
export async function rodarCenarios({ groups, cfg, atual, ms = 4000, onProgress, tick }) {
  const cen = [];
  const pausa = tick || (async () => { await new Promise((r) => setTimeout(r, 0)); });
  const rodar = async (id, nome, mod) => {
    const gs = groups.map((g) => ({ ...g, ...mod(g) }));
    if (onProgress) onProgress(nome);
    const res = await planejar(cfg, gs, ms, pausa);
    cen.push({ id, nome, r: resumoRes(res) });
  };
  const pos = cenariosPossiveis(groups);
  if (atual) cen.push({ id: 'atual', nome: 'Plano atual', r: resumoRes(atual) });
  else await rodar('atual', 'Plano atual', () => ({}));
  if (pos.giro) await rodar('giro', 'Todas as peças podem girar', () => ({ rot: true }));
  if (pos.semsobra) await rodar('semsobra', 'Sem usar as sobras do estoque', () => ({ sobras: [] }));
  return cen;
}
