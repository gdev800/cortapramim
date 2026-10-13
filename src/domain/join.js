// Juntar outro projeto salvo ao trabalho atual, para cortar tudo junto e aproveitar melhor as chapas.
import { newBlock, linhasVazias } from './state.js';
import { trocarUnidade } from './unit-change.js';

/**
 * Traz as chapas do projeto salvo `p` para o trabalho aberto. Cada chapa lembra de qual projeto veio (origem).
 * Medidas são convertidas para a unidade da tela. Não mexe no projeto salvo.
 * @returns {{ok:boolean, msg:string}}
 */
export function juntarProjeto(state, p) {
  const nome = String(p.nome || '').trim() || 'Sem nome';
  if ((p.id || p.projId) && (p.id || p.projId) === state.proj.id) return { ok: false, msg: 'Esse é o projeto que já está aberto.' };
  if (state.blocks.some((b) => b.origem === nome)) return { ok: false, msg: 'O projeto "' + nome + '" já está junto.' };
  const fonte = JSON.parse(JSON.stringify(p.blocks || []));
  if (!fonte.length) return { ok: false, msg: 'Esse projeto não tem chapas.' };
  const tmp = { unit: p.unit === 'mm' ? 'mm' : 'cm', blocks: fonte.map((b) => newBlock(state, { ...b, origem: nome })) };
  trocarUnidade(tmp, state.unit);
  state.blocks = state.blocks.filter((b) => !linhasVazias(b));
  const atual = String(state.proj.nome || '').trim() || 'Projeto atual';
  state.blocks.forEach((b) => { if (!b.origem) b.origem = atual; });
  state.blocks = state.blocks.concat(tmp.blocks);
  state.res = null; state.approved = false; state.estAtual = false;
  return { ok: true, msg: 'Projeto "' + nome + '" junto. Calcule para cortar tudo no mesmo plano.' };
}
