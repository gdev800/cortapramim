// Recomeçar o trabalho: limpar só o plano calculado, ou limpar tudo e começar do zero.
//
// "Tudo" é o trabalho da vez (chapas, peças, ferragens, cliente, plano). O que é da OFICINA fica:
// unidade, ajustes do motor (serra, refilo, tempo...), dados da marcenaria e condições padrão da proposta,
// margem do orçamento, e tudo que mora fora do trabalho (sobras, insumos, histórico, projetos salvos).
// Analogia: limpar a bancada depois de um serviço. As peças vão embora; a serra continua regulada.
import { parseLista } from '../core/index.js';
import { DEFAULT_ORC, DEFAULT_PROP } from './state.js';
import { snapshot } from './snapshot.js';

/** Campos da proposta que são da marcenaria (repetem em todo orçamento), não do cliente. */
export const PROP_DA_OFICINA = ['marcenaria', 'contato', 'pagamento', 'prazo', 'validade', 'mostrarMat'];

/** Quantas peças a chapa tem (mesma conta do contador da tela). */
export function contarPecas(b) {
  if (!b) return 0;
  if (b.mode === 'paste') return parseLista(b.paste || '').rows.reduce((n, r) => n + r.qty, 0);
  return (b.rows || []).reduce((n, r) => {
    if (!String(r.c || '').trim() && !String(r.l || '').trim()) return n;
    const q = parseInt(r.q, 10); return n + (q > 0 ? q : 1);
  }, 0);
}

/** O que existe no trabalho agora: base do texto da confirmação. */
export function resumoDoTrabalho(state) {
  const pecas = state.blocks.reduce((n, b) => n + contarPecas(b), 0);
  const ferragens = state.ferr.filter((f) => String(f.n || '').trim()).length;
  return {
    chapas: state.blocks.filter((b) => contarPecas(b) > 0).length,
    pecas, ferragens,
    temPlano: !!state.res,
    aprovado: !!state.approved,
    estoqueAtualizado: !!state.estAtual,
    projeto: state.proj && state.proj.id ? (state.proj.nome || 'sem nome') : null,
    cliente: String((state.prop && state.prop.cliente) || '').trim(),
    vazio: !pecas && !ferragens && !state.res && !String(state.proj.nome || '').trim(),
  };
}

/** Foto do mesmo trabalho sem o plano calculado (as peças continuam para ajustar e calcular de novo). */
export const fotoSemPlano = (state) => snapshot(state, false);

/** Foto de um trabalho novo, mantendo o que é da oficina. */
export function fotoDoZero(state) {
  const prop = { ...DEFAULT_PROP };
  PROP_DA_OFICINA.forEach((k) => { if (state.prop && k in state.prop) prop[k] = state.prop[k]; });
  return JSON.parse(JSON.stringify({
    unit: state.unit,
    aj: state.aj,
    blocks: [{}],
    ferr: [],
    orc: { ...DEFAULT_ORC, margem: (state.orc && state.orc.margem) || '' },
    nome: '', projId: null, status: 'orcado',
    prop,
  }));
}

/** Guarda o necessário para desfazer: a foto com o plano e as marcas que o restore zera. */
export function guardarParaDesfazer(state) {
  return { foto: snapshot(state, true), aprovado: !!state.approved, estAtual: !!state.estAtual };
}
