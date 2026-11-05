// jsPDF e a tabela (jspdf-autotable) embutidos no build, com versão fixa no package.json.
// Antes vinham de CDN: uma cópia adulterada no CDN rodaria com acesso a tudo da página.
import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

applyPlugin(jsPDF); // habilita doc.autoTable(), usado em common.js

/** Mantido para os componentes: com a biblioteca embutida, o PDF está sempre disponível. */
export const pdfOk = () => typeof jsPDF === 'function';

/** Documento A4 em milímetros, comprimido (sem compress o PDF fica gigante). */
export const novoPdf = () => new jsPDF({ unit: 'mm', format: 'a4', compress: true });

/** A fonte padrão do PDF só tem caracteres Latin-1. Remove o resto para não sair lixo. */
// eslint-disable-next-line no-control-regex -- de propósito: a regex procura caracteres de controle para removê-los
export const latin1 = (s) => String(s == null ? '' : s).replace(/[^\u0000-ÿ]/g, '');
