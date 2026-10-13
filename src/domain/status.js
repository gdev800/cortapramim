// Andamento dos projetos.
export const STATUS = [['orcado', 'Orçado'], ['aprovado', 'Aprovado'], ['cortado', 'Cortado'], ['montado', 'Montado'], ['entregue', 'Entregue']];
export const EM_ANDAMENTO = ['aprovado', 'cortado', 'montado'];

export const stNome = (id) => { const s = STATUS.find((x) => x[0] === id); return s ? s[1] : 'Orçado'; };

/** Resumo para a lista: quantos projetos estão em andamento e quanto valem. */
export function resumoAndamento(lista) {
  let n = 0, valor = 0;
  lista.forEach((p) => { if (EM_ANDAMENTO.includes(p.status || 'orcado')) { n++; valor += p.valor || 0; } });
  return { n, valor };
}
