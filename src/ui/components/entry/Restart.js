// "Recomeçar": janela de confirmação que mostra o que sai e o que fica, com duas opções
// (limpar só o plano / limpar tudo) e "Desfazer" logo depois, para um clique errado não custar o trabalho.
// Abre pelo "Começar do zero" (lista de peças) e pelo "Recomeçar" (ao lado de "Aprovar plano").
import html from './restart.html';
import { resumoDoTrabalho, fotoSemPlano, fotoDoZero, guardarParaDesfazer } from '../../../domain/recomecar.js';
import { $, rolarPara } from '../../dom.js';

const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);

/** Texto da confirmação, montado com textContent (nada de HTML com dado do usuário). */
function preencher(box, r, unit) {
  box.replaceChildren();
  const p = (txt, cls) => { const el = document.createElement('p'); el.textContent = txt; if (cls) el.className = cls; box.appendChild(el); };
  const sai = [];
  if (r.pecas) sai.push(plural(r.pecas, 'peça', 'peças') + ' em ' + plural(r.chapas, 'chapa', 'chapas'));
  if (r.ferragens) sai.push(plural(r.ferragens, 'ferragem', 'ferragens'));
  if (r.temPlano) sai.push(r.aprovado ? 'o plano calculado (aprovado)' : 'o plano calculado');
  if (r.cliente) sai.push('os dados do cliente na proposta');
  p('"Limpar tudo" apaga deste trabalho: ' + (sai.length ? sai.join(', ') : 'o que foi digitado') + '.');
  if (r.temPlano) p('"Limpar só o plano" mantém as peças para você ajustar e calcular de novo.');
  p('Continuam: a unidade (' + unit + '), os ajustes da serra, os dados da sua marcenaria, as sobras, os insumos e os projetos salvos.', 'hint');
  if (r.projeto) p('O projeto salvo "' + r.projeto + '" continua em "Meus projetos salvos", do jeito que foi salvo.', 'hint');
  if (r.estoqueAtualizado) p('O estoque já foi atualizado com este plano e não volta sozinho. Se precisar, use "Desfazer o último" no Histórico.', 'rec-aviso');
}

export default {
  template: () => html,
  mount(ctx) {
    const { state, bus } = ctx;
    const dlg = $('recDlg');

    function oferecerDesfazer(antes, texto) {
      ctx.msg(texto, 'ok'); // limpa a ação anterior da linha de mensagem
      const ma = $('msgAct'); if (!ma) return;
      const b = document.createElement('button');
      b.type = 'button'; b.id = 'recDesfazer'; b.textContent = 'Desfazer';
      b.addEventListener('click', () => {
        ctx.load(antes.foto);
        // o restore zera estas marcas; sem voltar o estAtual, "Atualizar estoque" daria baixa duas vezes
        state.approved = antes.aprovado; state.estAtual = antes.estAtual;
        bus.emit('approved'); ctx.save();
        ctx.msg('Trabalho restaurado.', 'ok');
      });
      ma.replaceChildren(b); ma.hidden = false;
    }

    function limpar(modo) {
      const antes = guardarParaDesfazer(state);
      dlg.close();
      if (modo === 'plano') {
        ctx.load(fotoSemPlano(state)); ctx.save();
        oferecerDesfazer(antes, 'Plano descartado. As peças continuam: ajuste e calcule de novo.');
      } else {
        ctx.load(fotoDoZero(state)); ctx.save();
        oferecerDesfazer(antes, 'Tudo limpo. Pode começar o próximo trabalho.');
        rolarPara($('t-entrada'));
      }
    }

    function abrir() {
      const r = resumoDoTrabalho(state);
      if (r.vazio) { ctx.msg('Não há nada para limpar: o trabalho já está vazio.'); return; }
      preencher($('recTxt'), r, state.unit);
      $('recPlano').hidden = !r.temPlano;
      dlg.showModal();
    }
    ctx.actions.recomecar = abrir;
    /** Trabalho novo sem a janela (botão "Novo" dos projetos); o "Desfazer" continua valendo. */
    ctx.actions.novoTrabalho = () => {
      if (resumoDoTrabalho(state).vazio) { ctx.msg('O trabalho já está vazio.'); return; }
      limpar('tudo');
    };

    $('recPlano').addEventListener('click', () => limpar('plano'));
    $('recTudo').addEventListener('click', () => limpar('tudo'));
    $('recCancela').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); }); // clique fora fecha
  },
};
