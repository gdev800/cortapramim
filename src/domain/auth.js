// Regras do login, sem DOM e sem rede: validar o que foi digitado e traduzir os erros do Supabase.
export const SENHA_MIN = 8;
export const SENHA_MAX = 72; // limite do bcrypt usado pelo Supabase
export const ESPERA_REENVIO_S = 60;

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** E-mail limpo (sem espaços, minúsculo) ou erro. */
export function validarEmail(v) {
  const e = String(v || '').trim().toLowerCase();
  if (!e) return { erro: 'Digite o seu e-mail.' };
  if (e.length > 254 || !RE_EMAIL.test(e)) return { erro: 'Esse e-mail não parece certo. Confira e tente de novo.' };
  return { email: e };
}

export function validarSenha(v) {
  const s = String(v || '');
  if (s.length < SENHA_MIN) return { erro: 'A senha precisa ter pelo menos ' + SENHA_MIN + ' caracteres.' };
  if (s.length > SENHA_MAX) return { erro: 'A senha pode ter no máximo ' + SENHA_MAX + ' caracteres.' };
  if (!s.trim()) return { erro: 'A senha não pode ser só espaços.' };
  return { senha: s };
}

/** Código do e-mail: só números, de 6 a 10 dígitos (o Supabase manda 6 por padrão). */
export function validarCodigo(v) {
  const c = String(v || '').replace(/\s+/g, '');
  if (!/^\d{6,10}$/.test(c)) return { erro: 'Digite o código de números que chegou no e-mail.' };
  return { codigo: c };
}

const ERROS = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme o seu e-mail pelo link que enviamos antes de entrar.',
  user_already_exists: 'Já existe uma conta com esse e-mail. Use "Entrar" ou "Esqueci a senha".',
  email_exists: 'Já existe uma conta com esse e-mail. Use "Entrar" ou "Esqueci a senha".',
  weak_password: 'Essa senha é fraca. Use uma mais longa, misturando letras e números.',
  same_password: 'A nova senha precisa ser diferente da atual.',
  otp_expired: 'O código expirou ou já foi usado. Peça um novo.',
  over_email_send_rate_limit: 'Muitos e-mails em pouco tempo. Espere alguns minutos e tente de novo.',
  over_request_rate_limit: 'Muitas tentativas em pouco tempo. Espere alguns minutos e tente de novo.',
  email_address_invalid: 'Esse e-mail não pode ser usado. Confira se está certo.',
  signup_disabled: 'O cadastro de novas contas está fechado no momento.',
  email_provider_disabled: 'O login por e-mail está desligado no momento.',
  provider_disabled: 'Esse jeito de entrar ainda não foi configurado.',
  validation_failed: 'Algum dado está faltando ou inválido. Confira e tente de novo.',
  session_expired: 'Sua sessão expirou. Entre de novo.',
  session_not_found: 'Sua sessão expirou. Entre de novo.',
};

/** Mensagem em português para um erro do Supabase (ou de rede). Nunca devolve o texto cru em inglês. */
export function traduzirErro(err) {
  if (!err) return '';
  const code = err.code || err.error_code || '';
  if (ERROS[code]) return ERROS[code];
  const msg = String(err.message || '').toLowerCase();
  if (err.name === 'AuthRetryableFetchError' || err.status === 0 || /failed to fetch|network|load failed/.test(msg)) {
    return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
  }
  if (/invalid login credentials/.test(msg)) return ERROS.invalid_credentials;
  if (/email not confirmed/.test(msg)) return ERROS.email_not_confirmed;
  if (/already registered|already been registered/.test(msg)) return ERROS.user_already_exists;
  if (/token has expired|is invalid/.test(msg)) return ERROS.otp_expired;
  if (/rate limit/.test(msg)) return ERROS.over_request_rate_limit;
  if (err.status === 429) return ERROS.over_request_rate_limit;
  return 'Não deu certo agora. Tente de novo em instantes.';
}

/** Endereço para onde o e-mail/Google devolvem o usuário: a mesma página, sem # nem ?. */
export function enderecoDeRetorno(loc) {
  if (!loc || !/^https?:$/.test(loc.protocol)) return undefined;
  return loc.origin + loc.pathname;
}
