// Chapas com o mesmo desenho de corte (a serra repete a sequência). Puro, sem DOM.
import { assinaturaDesenho } from '../core/repeat.js';

/**
 * @returns {Map<number, {chapas:number[], ordem:number}>} para cada chapa (n): as chapas com o mesmo desenho
 * (só entra quem tem pelo menos uma igual) e a posição dela no grupo.
 */
export function gruposDeDesenho(res) {
  const por = new Map();
  res.groups.forEach((g) => g.sheets.forEach((s) => {
    const k = assinaturaDesenho(s); if (!k) return;
    if (!por.has(k)) por.set(k, []); por.get(k).push(s.n);
  }));
  const out = new Map();
  por.forEach((ns) => { if (ns.length > 1) ns.forEach((n, i) => out.set(n, { chapas: ns, ordem: i + 1 })); });
  return out;
}

/** Quantos desenhos diferentes o plano tem (chapas iguais contam uma vez). */
export function contarDesenhos(res) {
  const ks = new Set(); let n = 0;
  res.groups.forEach((g) => g.sheets.forEach((s) => { const k = assinaturaDesenho(s); if (k) ks.add(k); else n++; }));
  return ks.size + n;
}

/** "1 a 4" quando seguidas, senão "1, 3 e 5". */
export function faixa(ns) {
  const seguidas = ns.every((n, i) => i === 0 || n === ns[i - 1] + 1);
  if (seguidas) return ns[0] + ' a ' + ns[ns.length - 1];
  return ns.slice(0, -1).join(', ') + ' e ' + ns[ns.length - 1];
}

/** Texto curto para o título da chapa. */
export function textoDesenho(info) {
  return info ? 'mesmo desenho das chapas ' + faixa(info.chapas) + ' (' + info.chapas.length + '×)' : '';
}
