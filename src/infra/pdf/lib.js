// Acesso à biblioteca jsPDF, carregada pela página (window.jspdf).
export const pdfOk = () => !!(window.jspdf && window.jspdf.jsPDF);

/** Documento A4 em milímetros, comprimido (sem compress o PDF fica gigante). */
export const novoPdf = () => new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });

/** A fonte padrão do PDF só tem caracteres Latin-1. Remove o resto para não sair lixo. */
export const latin1 = (s) => String(s == null ? '' : s).replace(/[^\u0000-ÿ]/g, '');
