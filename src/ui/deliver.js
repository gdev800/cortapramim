// Entregar um arquivo gerado.
// 1) Plataforma com download (claude.ai com a capacidade "downloads"): usa ela.
// 2) Navegador comum (GitHub Pages, arquivo aberto no computador): baixa direto por um link com "download".
// 3) Dentro de um quadro que bloqueia downloads: além de tentar, mostra a imagem, o texto ou um link para abrir o PDF.

/** Está dentro de um quadro (iframe)? Ali o navegador pode bloquear o download sem avisar. */
export function emQuadro() {
  try { return window.self !== window.top; } catch (e) { return true; }
}

function comoBlob(data, nome) {
  if (data instanceof Blob) return data;
  const csv = /\.csv$/i.test(nome);
  const tipo = csv ? 'text/csv;charset=utf-8' : /\.json$/i.test(nome) ? 'application/json' : 'text/plain;charset=utf-8';
  return new Blob([csv ? '﻿' + data : data], { type: tipo }); // BOM: o Excel abre os acentos certo
}

/** Baixa pelo navegador. @returns {string} endereço temporário do arquivo (para o link de reserva) */
export function baixarNoNavegador(nome, data) {
  const url = URL.createObjectURL(comoBlob(data, nome));
  const a = document.createElement('a');
  a.href = url; a.download = nome; a.rel = 'noopener'; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 120000);
  return url;
}

async function pelaPlataforma(state, nome, data, slot) {
  try { await state.dl.save({ filename: nome, data }); slot.textContent = 'Pronto.'; return true; }
  catch (e) {
    if (e && e.code === 'declined') { slot.textContent = 'Download cancelado.'; return true; }
    if (e && e.code === 'rate_limited') { slot.textContent = 'Já tem uma confirmação de download aberta. Responda ela e clique de novo.'; return true; }
    return false; // falhou: tenta pelo navegador
  }
}

function reserva(slot, nome, texto, url) {
  slot.innerHTML = '';
  const p = document.createElement('p'); p.className = 'hint';
  if (texto != null) {
    const ta = document.createElement('textarea'); ta.className = 'csv-box'; ta.readOnly = true; ta.value = texto; slot.appendChild(ta); ta.focus(); ta.select();
    p.textContent = 'Se o arquivo não baixou, copie o texto acima.';
  } else if (/\.png$/i.test(nome)) {
    const im = document.createElement('img'); im.src = url; im.className = 'png-fallback'; im.alt = nome; slot.appendChild(im);
    p.textContent = 'Se não baixou, segure ou clique com o botão direito na imagem para salvar.';
  } else {
    const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.download = nome; a.textContent = 'abrir ' + nome;
    p.append('Se não baixou: ', a, '.');
  }
  slot.appendChild(p);
}

export async function entregar(state, nome, data, slot, texto) {
  if (state.dl && await pelaPlataforma(state, nome, data, slot)) return;
  const url = baixarNoNavegador(nome, data);
  if (emQuadro()) reserva(slot, nome, texto, url);
  else slot.textContent = 'Baixado: ' + nome;
}

export async function entregarPdf(state, nome, blob, slot) {
  return entregar(state, nome, blob, slot, null);
}

export const MSG_PDF_INDISPONIVEL = 'O gerador de PDF não carregou. Verifique a conexão e recarregue a página.';
