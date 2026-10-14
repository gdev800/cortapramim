// Guardar no navegador (localStorage). Nunca deve quebrar o app: se o navegador bloquear, simplesmente não guarda.
export const KEYS = {
  draft: 'plano-mdf-v4',
  draftAntigo: 'plano-mdf-v3',
  estoque: 'plano-mdf-estoque',
  projetos: 'plano-mdf-projetos',
  insumos: 'plano-mdf-insumos',
  mudanca: 'plano-mdf-mudanca',
  backup: 'plano-mdf-backup',
  historico: 'plano-mdf-historico',
};

export const lget = (k) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } };
export const lset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento: segue sem guardar */ } };
