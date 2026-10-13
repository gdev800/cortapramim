// Unidades, números e textos. Tudo aqui é função pura.
// Convenção do projeto: o motor trabalha SEMPRE em milímetros. A unidade da tela ("cm" ou "mm") só muda como os números são mostrados e digitados.

/** Tamanhos de chapa mais comuns: [chave "LxA" em mm, rótulo]. */
export const SIZES = [['2750x1850', '2750 × 1850 mm'], ['2750x1840', '2750 × 1840 mm'], ['2440x1850', '2440 × 1850 mm'], ['2440x1220', '2440 × 1220 mm']];

/** Quantos milímetros vale 1 unidade da tela. */
export const fac = (unit) => (unit === 'cm' ? 10 : 1);

/** Lê um número digitado ("54,3" ou "54.3"). Vazio ou inválido vira NaN. */
export const pIn = (s) => {
  const t = String(s == null ? '' : s).trim().replace(',', '.');
  return t === '' ? NaN : Number(t);
};

/** Número para mostrar: 2 casas no máximo, vírgula decimal. */
export const toStr = (v) => String(Math.round(v * 100) / 100).replace('.', ',');

/** Texto para comparar nomes sem se importar com maiúsculas e espaços nas pontas. */
export const norm = (s) => String(s || '').trim().toLowerCase();

export const money = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Nome de arquivo seguro. */
export const slug = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chapa';

/** Porcentagem com 1 casa e vírgula: 0.799 -> "79,9". */
export const pct = (frac) => (Math.round(frac * 1000) / 10).toString().replace('.', ',');

/** Formatadores presos a uma unidade da tela. fu(mm) mostra um comprimento na unidade escolhida. */
export function fmtFor(unit) {
  const f = fac(unit);
  return { unit, fac: f, fu: (mm) => toStr(mm / f), fromMm: (mm) => toStr(mm / f) };
}
