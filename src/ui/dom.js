// Pequenos atalhos de DOM usados por todos os componentes.
export { esc } from '../core/index.js';

export const $ = (id) => document.getElementById(id);

/** Lê o valor de um campo de data-attribute: data-k="nome" -> "nome". */
export const num = (v) => parseInt(v, 10);

/** Rola até um elemento com animação suave. */
export const rolarPara = (el, block = 'start') => { if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block }); };
