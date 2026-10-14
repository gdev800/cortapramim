// Login com o Supabase Auth. Cada função devolve { ok } ou { erro } (texto em português), nunca lança.
import { traduzirErro, enderecoDeRetorno } from '../domain/auth.js';

/**
 * @param {object} cliente cliente do Supabase (ou um falso nos testes)
 * @param {Location} [loc] window.location, para o endereço de retorno dos e-mails e do Google
 */
export function criarAuth(cliente, loc) {
  const a = cliente.auth, volta = enderecoDeRetorno(loc);
  const rodar = async (fn, okExtra) => {
    try {
      const { data, error } = await fn();
      if (error) return { erro: traduzirErro(error) };
      return { ok: true, ...(okExtra ? okExtra(data) : {}) };
    } catch (e) { return { erro: traduzirErro(e) }; }
  };
  return {
    async usuarioAtual() {
      try { const { data } = await a.getSession(); return (data && data.session && data.session.user) || null; } catch (e) { return null; }
    },
    /** Avisa a cada mudança: entrou, saiu, token renovado, voltou do e-mail de "esqueci a senha". */
    aoMudar(cb) {
      const { data } = a.onAuthStateChange((evento, sessao) => { setTimeout(() => cb(evento, (sessao && sessao.user) || null), 0); });
      return () => { try { data.subscription.unsubscribe(); } catch (e) { /* já saiu */ } };
    },
    entrarComGoogle: () => rodar(() => a.signInWithOAuth({ provider: 'google', options: { redirectTo: volta } })),
    entrarComSenha: (email, senha) => rodar(() => a.signInWithPassword({ email, password: senha })),
    /** Cadastro: se o projeto pede confirmação por e-mail, volta sem sessão (precisaConfirmar). */
    cadastrar: (email, senha) => rodar(() => a.signUp({ email, password: senha, options: { emailRedirectTo: volta } }),
      (d) => ({ precisaConfirmar: !(d && d.session) })),
    enviarCodigo: (email) => rodar(() => a.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: volta } })),
    confirmarCodigo: (email, codigo) => rodar(() => a.verifyOtp({ email, token: codigo, type: 'email' })),
    recuperarSenha: (email) => rodar(() => a.resetPasswordForEmail(email, { redirectTo: volta })),
    trocarSenha: (senha) => rodar(() => a.updateUser({ password: senha })),
    sair: () => rodar(() => a.signOut()),
  };
}
