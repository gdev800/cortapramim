// Entregar um arquivo gerado: baixa direto quando a plataforma permite; senão mostra o conteúdo para o usuário salvar.

export async function entregar(state, nome, data, slot, texto) {
  if (state.dl) {
    try { await state.dl.save({ filename: nome, data }); slot.textContent = 'Pronto.'; }
    catch (e) { slot.textContent = e && e.code === 'declined' ? 'Download cancelado.' : 'Não consegui baixar aqui. Tente de novo.'; }
    return;
  }
  slot.innerHTML = '';
  if (texto != null) {
    const ta = document.createElement('textarea'); ta.className = 'csv-box'; ta.readOnly = true; ta.value = texto; slot.appendChild(ta); ta.focus(); ta.select();
  } else {
    const url = URL.createObjectURL(data); const im = document.createElement('img'); im.src = url; im.className = 'png-fallback'; im.alt = nome; slot.appendChild(im);
    const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'Segure ou clique com o botão direito na imagem para salvar.'; slot.appendChild(p);
  }
}

export async function entregarPdf(state, nome, blob, slot) {
  if (state.dl) {
    try { await state.dl.save({ filename: nome, data: blob }); slot.textContent = 'Pronto.'; }
    catch (e) { slot.textContent = e && e.code === 'declined' ? 'Download cancelado.' : 'Não consegui baixar aqui. Tente de novo.'; }
  } else slot.textContent = 'O download direto não está disponível nesta visualização.';
}

export const MSG_PDF_INDISPONIVEL = 'O gerador de PDF não carregou. Verifique a conexão e recarregue a página.';
