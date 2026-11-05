// O que a plataforma onde o app roda oferece: baixar arquivos e guardar na conta do usuário.
// Fora da plataforma (ou se algo falhar) o app continua funcionando só com o navegador.

/** Pede a capacidade de download. Chama onReady(dl) quando disponível. */
export function detectarDownloads(onReady) {
  try {
    if (window.claude && typeof window.claude.use === 'function') {
      window.claude.use('downloads').then((d) => onReady(d || null)).catch(() => {});
    }
  } catch (e) { /* sem download direto */ }
}

/** Banco da conta do usuário. @returns {Promise<{mode:'cloud'|'local', db:any, uid:any}>} */
export async function detectarBackend() {
  const backend = { mode: 'local', db: null, uid: null };
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return backend; // elemento HTML com id="claude" não conta
    const db = await window.claude.use('db'), user = await window.claude.use('user');
    if (db && user) {
      const id = await user.id();
      if (id) { backend.db = db; backend.uid = id; backend.mode = 'cloud'; }
    }
  } catch (e) { /* fica local */ }
  return backend;
}
