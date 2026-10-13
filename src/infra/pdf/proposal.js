// PDF da proposta comercial para o cliente.
import { money } from '../../domain/units.js';
import { valorProposta } from '../../domain/costs.js';
import { novoPdf, latin1 } from './lib.js';
import { PM, PW, pdfTabela } from './common.js';

export async function gerarPdfProposta(state) {
  const doc = novoPdf();
  const P = {}, hoje = new Date(), W = PW - 2 * PM;
  Object.keys(state.prop).forEach((k) => { const v = state.prop[k]; P[k] = typeof v === 'string' ? latin1(v) : v; });
  const dias = parseInt(P.validade, 10) > 0 ? parseInt(P.validade, 10) : 15;
  const ate = new Date(hoje.getTime() + dias * 86400000);
  const ymd = hoje.getFullYear() + String(hoje.getMonth() + 1).padStart(2, '0') + String(hoje.getDate()).padStart(2, '0');

  // faixa do topo
  doc.setFillColor(42, 33, 24); doc.rect(0, 0, PW, 34, 'F');
  doc.setFillColor(176, 112, 42); doc.rect(PM, 34, 22, 1.6, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(255, 255, 255); doc.text(P.marcenaria.trim() || 'Marcenaria', PM, 17);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(224, 210, 190); doc.text(P.contato.trim() || 'Móveis sob medida', PM, 25);
  doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.text('PROPOSTA Nº P-' + ymd, PW - PM, 17, { align: 'right' });

  // cliente, projeto e datas
  let y = 48;
  doc.setTextColor(29, 25, 20); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Proposta comercial', PM, y); y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(109, 101, 91);
  doc.text('Cliente: ' + (P.cliente.trim() || '-'), PM, y); y += 5.5;
  doc.text('Projeto: ' + (state.proj.nome || '-'), PM, y); y += 5.5;
  doc.text('Data: ' + hoje.toLocaleDateString('pt-BR') + '   ·   Válida até ' + ate.toLocaleDateString('pt-BR'), PM, y); y += 10;

  // quebra de página quando o texto não cabe
  const need = (h) => { if (y + h > 280) { doc.addPage(); y = 24; } };
  const bloco = (titulo, txt) => {
    if (!txt || !txt.trim()) return;
    need(14);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(29, 25, 20); doc.text(titulo, PM, y); y += 5.5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(60, 52, 44);
    doc.splitTextToSize(txt.trim(), W).forEach((ln) => { need(6); doc.text(ln, PM, y); y += 5; });
    y += 6;
  };
  bloco('Serviço', P.servico);

  const itens = (P.itens || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (itens.length) {
    need(14);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(29, 25, 20); doc.text('Itens incluídos', PM, y); y += 5.5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(60, 52, 44);
    itens.forEach((it) => {
      const ls = doc.splitTextToSize(it, W - 6); need(ls.length * 5 + 2);
      doc.setFillColor(176, 112, 42); doc.circle(PM + 1.2, y - 1.2, 0.8, 'F'); doc.text(ls, PM + 5, y); y += ls.length * 5 + 1.5;
    });
    y += 5;
  }
  if (P.mostrarMat && state.res) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(29, 25, 20); doc.text('Materiais', PM, y); y += 3;
    y = pdfTabela(doc, y, ['Material', 'Espessura', 'Chapas'], state.res.groups.map((g) => [g.mat, g.esp ? g.esp + ' mm' : '-', g.nNovas + g.nSobras]), { tableWidth: 120 }) + 8;
  }

  // valor total
  if (y > 235) { doc.addPage(); y = 24; }
  const val = valorProposta(state);
  doc.setFillColor(245, 230, 209); doc.roundedRect(PM, y, W, 24, 3, 3, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(109, 80, 40); doc.text('VALOR TOTAL', PM + 6, y + 8);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(29, 25, 20); doc.text(val > 0 ? money(val) : 'A combinar', PM + 6, y + 18.5);
  y += 34;
  bloco('Condições de pagamento', P.pagamento);
  bloco('Prazo de entrega', P.prazo);

  // assinaturas
  if (y > 250) { doc.addPage(); y = 24; }
  y = Math.max(y + 14, 255);
  doc.setDrawColor(120, 110, 100); doc.setLineWidth(0.3);
  doc.line(PM, y, PM + 75, y); doc.line(PW - PM - 75, y, PW - PM, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(109, 101, 91);
  doc.text(P.cliente.trim() || 'Cliente', PM, y + 5); doc.text(P.marcenaria.trim() || 'Marcenaria', PW - PM - 75, y + 5);

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(140, 130, 118); doc.text('Página ' + i + ' de ' + n, PW - PM, 289, { align: 'right' }); }
  return doc.output('blob');
}
