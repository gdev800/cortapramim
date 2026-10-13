// Peças que quase todo móvel tem. Medidas em mm. C é o sentido do veio.
export const r1 = (x) => Math.round(x * 10) / 10;

/** Fundo de 6 mm. Se for largo demais para uma chapa, divide em partes iguais. */
export function fundoPecas(L, A) {
  const k = Math.max(1, Math.ceil((L - 4) / 1800)), w = r1((L - 4) / k);
  return [{ mat: 'fundo', q: k, c: r1(A - 4), l: w, n: k > 1 ? 'Fundo (' + k + ' partes)' : 'Fundo' }];
}

/** Portas de sobreposição: 2 mm de folga nas pontas e 3 mm entre portas. */
export function portasPecas(n, A, L) {
  const w = r1((L - 2 - 3 * (n - 1)) / n);
  return [{ mat: 'corpo', q: n, c: r1(A - 4), l: w, n: 'Porta', fc: 2, fl: 2 }];
}
