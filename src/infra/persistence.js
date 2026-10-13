// Guardar e carregar dados do usuário: na conta (quando existe) ou neste navegador.
// A tela não sabe onde os dados ficam. Para trocar por outro banco no futuro, só este arquivo muda.
import { KEYS, lget, lset } from './local.js';

/**
 * @param {object} p
 * @param {object} p.state     estado do app (lê e escreve estoque, projetos, insumos)
 * @param {object} p.backend   { mode, db, uid } vindo de detectarBackend()
 * @param {object} p.notify    { touch(): algo mudou; note(texto): aviso para o usuário }
 */
export function createPersistence({ state, backend, notify }) {
  const cloud = () => backend.mode === 'cloud';
  const doc = (nome) => backend.db.doc('data/users/' + backend.uid + '/' + nome);
  const projCol = () => backend.db.doc('data/users/' + backend.uid + '/meta').collection('projetos');
  const queues = {};

  // Estoque e insumos têm o mesmo jeito: uma lista num documento só.
  function listaDoc(nome, chave, campo, msgErro) {
    queues[nome] = Promise.resolve();
    return {
      save() {
        lset(chave, state[campo]); notify.touch();
        if (!cloud()) return Promise.resolve();
        const snap = state[campo].slice();
        queues[nome] = queues[nome].then(() => doc(nome).set({ items: snap })).catch(() => { if (msgErro) notify.note(msgErro); });
        return queues[nome];
      },
      async load() {
        const local = lget(chave) || [];
        if (cloud()) {
          try {
            const s = await doc(nome).get();
            if (s.exists && Array.isArray(s.data().items)) { state[campo] = s.data().items; lset(chave, state[campo]); return; }
            state[campo] = local; if (local.length) await this.save(); return;
          } catch (e) { /* cai para o local */ }
        }
        state[campo] = local;
      },
    };
  }
  const est = listaDoc('estoque', KEYS.estoque, 'estoque', 'Não consegui salvar na sua conta agora. As sobras ficaram neste navegador.');
  const ins = listaDoc('insumos', KEYS.insumos, 'insumos', '');

  return {
    saveEstoque: () => est.save(), loadEstoque: () => est.load(),
    saveInsumos: () => ins.save(), loadInsumos: () => ins.load(),

    async loadProjetos() {
      const local = lget(KEYS.projetos) || [];
      if (cloud()) {
        try { const q = await projCol().get(); state.projetos = q.docs.map((d) => ({ id: d.id, ...d.data() })); return; } catch (e) { /* local */ }
      }
      state.projetos = local;
    },
    async saveProjeto(p) {
      const i = state.projetos.findIndex((x) => x.id === p.id);
      if (i >= 0) state.projetos[i] = p; else state.projetos.push(p);
      if (cloud()) {
        try { await projCol().doc(p.id).set(p); return; } catch (e) { notify.note('Não consegui salvar na sua conta. O projeto ficou neste navegador.'); }
      }
      lset(KEYS.projetos, state.projetos);
    },
    async delProjeto(id) {
      state.projetos = state.projetos.filter((x) => x.id !== id);
      if (cloud()) { try { await projCol().doc(id).delete(); } catch (e) { /* segue */ } }
      lset(KEYS.projetos, state.projetos);
    },
    /** Grava a lista local de projetos (usado depois de importar um backup). */
    flushProjetosLocal() { lset(KEYS.projetos, state.projetos); },

    // rascunho (o que está na tela agora) e controle do backup
    saveDraft(snap) { lset(KEYS.draft, snap); notify.touch(); },
    loadDraft() { return lget(KEYS.draft) || lget(KEYS.draftAntigo); },
    ultimoBackup: () => lget(KEYS.backup),
    ultimaMudanca: () => lget(KEYS.mudanca),
    marcarBackup() { lset(KEYS.backup, Date.now()); },
    marcarMudanca() { lset(KEYS.mudanca, Date.now()); },
  };
}
