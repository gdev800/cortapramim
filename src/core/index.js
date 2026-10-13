// Porta de entrada do motor de corte. Nada aqui conhece a tela (sem DOM).
export { parseLista, extraiFlags, flagsTxt } from './parse.js';
export { naoCabem } from './validate.js';
export { planejar, minimoChapas } from './planner.js';
export { fasesDoPlano } from './phases.js';
export { montarChapa } from './sheet.js';
export { girarPeca, trocarPecas, moverPeca, podeGirar } from './edit.js';
export { fitaMetros } from './edge-banding.js';
export { labelsSVG } from './labels.js';
export { sheetSVG, PAL_EXPORT, PAL_SCREEN } from './svg.js';
export { csvCortes, csvPecas } from './csv.js';
export { esc, f1 } from './text.js';
