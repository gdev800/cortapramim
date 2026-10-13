// Backup em arquivo (.json): monta o pacote e valida um pacote recebido. Sem DOM e sem gravação.
import { snapshot } from './snapshot.js';
import { insumoValido } from './supplies.js';

export const APP_ID = 'plano-corte-mdf';

export function montarPacote(state) {
  const atual = snapshot(state, true);
  const temAlgo = state.res || state.blocks.some((b) => b.rows.some((r) => r.c || r.l) || b.paste);
  if (temAlgo) { atual.id = state.proj.id || 'atual'; atual.nome = state.proj.nome || 'Trabalho em andamento'; atual.atualizado = Date.now(); }
  return { app: APP_ID, versao: 1, exportadoEm: new Date().toISOString(), estoque: state.estoque, insumos: state.insumos, projetos: state.projetos.slice(), atual };
}

export const nomeArquivoBackup = () => 'backup-plano-de-corte-' + new Date().toISOString().slice(0, 10) + '.json';

/** @returns {{erro:string}|{d:object}} */
export function lerPacote(texto) {
  let d;
  try { d = JSON.parse(texto); } catch (e) { return { erro: 'Esse arquivo não é um backup válido.' }; }
  if (!d || d.app !== APP_ID || !Array.isArray(d.projetos)) return { erro: 'Esse arquivo não é um backup do Plano de Corte.' };
  return { d };
}

/** Projetos do pacote que valem a pena gravar: bem formados e mais novos que os atuais. */
export function projetosParaImportar(d, atuais) {
  const lista = d.projetos.slice();
  if (d.atual && d.atual.id && !lista.some((p) => p.id === d.atual.id) && (d.atual.blocks || []).length) {
    d.atual.nome = (d.atual.nome || 'Trabalho') + ' (do backup)'; lista.push(d.atual);
  }
  return lista.filter((p) => {
    if (!p || !p.id || !Array.isArray(p.blocks)) return false;
    const cur = atuais.find((x) => x.id === p.id);
    return !cur || (p.atualizado || 0) > (cur.atualizado || 0);
  });
}

/** Sobras novas do pacote (por id) e já bem formadas. */
export function sobrasParaImportar(d, atuais) {
  const ids = new Set(atuais.map((s) => s.id)), out = [];
  (d.estoque || []).forEach((s) => { if (s && s.id && !ids.has(s.id) && s.c > 0 && s.l > 0) { out.push(s); ids.add(s.id); } });
  return out;
}

export function insumosParaImportar(d, atuais) {
  const ids = new Set(atuais.map((s) => s.id)), out = [];
  (d.insumos || []).forEach((s) => { if (insumoValido(s) && !ids.has(s.id)) { s.q = Number(s.q); out.push(s); ids.add(s.id); } });
  return out;
}
