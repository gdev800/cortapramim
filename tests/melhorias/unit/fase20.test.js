// Fase 20: login. Validações, tradução de erros e o adaptador do Supabase Auth (com um cliente falso, sem rede).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarEmail, validarSenha, validarCodigo, traduzirErro, enderecoDeRetorno, SENHA_MIN } from '../../../src/domain/auth.js';
import { criarAuth } from '../../../src/infra/auth.js';
import { SUPABASE_URL, SUPABASE_KEY } from '../../../src/infra/supabase/config.js';

test('e-mail: limpa espaços e maiúsculas; recusa vazio e formato errado', () => {
  assert.deepEqual(validarEmail('  Gilmar@Exemplo.COM.br '), { email: 'gilmar@exemplo.com.br' });
  assert.match(validarEmail('').erro, /Digite/);
  ['gilmar', 'gilmar@', '@x.com', 'a b@x.com', 'a@x', 'a@x.c'].forEach((e) => assert.ok(validarEmail(e).erro, e));
});

test('senha: mínimo 8, máximo 72, não só espaços', () => {
  assert.equal(SENHA_MIN, 8);
  assert.match(validarSenha('1234567').erro, /pelo menos 8/);
  assert.deepEqual(validarSenha('12345678'), { senha: '12345678' });
  assert.match(validarSenha('x'.repeat(73)).erro, /no máximo 72/);
  assert.match(validarSenha('         ').erro, /espaços/);
});

test('código do e-mail: 6 a 10 dígitos, aceita espaços no meio', () => {
  assert.deepEqual(validarCodigo('123 456'), { codigo: '123456' });
  ['12345', 'abcdef', '12345678901', ''].forEach((c) => assert.ok(validarCodigo(c).erro, c));
});

test('erros do Supabase viram português (por código, por texto e de rede); nunca texto cru', () => {
  assert.equal(traduzirErro({ code: 'invalid_credentials', message: 'Invalid login credentials' }), 'E-mail ou senha incorretos.');
  assert.equal(traduzirErro({ message: 'Invalid login credentials' }), 'E-mail ou senha incorretos.');
  assert.match(traduzirErro({ code: 'over_email_send_rate_limit' }), /Muitos e-mails/);
  assert.match(traduzirErro({ status: 429, message: 'x' }), /Muitas tentativas/);
  assert.match(traduzirErro({ name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 }), /Sem conexão/);
  assert.match(traduzirErro(new TypeError('Failed to fetch')), /Sem conexão/);
  assert.match(traduzirErro({ code: 'otp_expired' }), /expirou/);
  assert.equal(traduzirErro({ message: 'Something weird happened' }), 'Não deu certo agora. Tente de novo em instantes.');
  assert.equal(traduzirErro(null), '');
});

test('endereço de retorno: mesma página sem # e ?; nada quando aberto como arquivo', () => {
  assert.equal(enderecoDeRetorno({ protocol: 'https:', origin: 'https://gdev800.github.io', pathname: '/cortapramim/' }), 'https://gdev800.github.io/cortapramim/');
  assert.equal(enderecoDeRetorno({ protocol: 'file:', origin: 'null', pathname: '/x.html' }), undefined);
});

test('config: só a chave publicável (nunca a secreta) e o projeto de São Paulo', () => {
  assert.match(SUPABASE_URL, /^https:\/\/[a-z0-9]+\.supabase\.co$/);
  assert.match(SUPABASE_KEY, /^sb_publishable_/);
  assert.doesNotMatch(SUPABASE_KEY, /secret|service_role/);
});

function falso(respostas = {}) {
  const chamadas = [];
  const mk = (nome) => async (...args) => { chamadas.push([nome, ...args]); const r = respostas[nome]; if (r instanceof Error) throw r; return r || { data: {}, error: null }; };
  const auth = {};
  ['signInWithOAuth', 'signInWithPassword', 'signUp', 'signInWithOtp', 'verifyOtp', 'resetPasswordForEmail', 'updateUser', 'signOut', 'getSession'].forEach((n) => { auth[n] = mk(n); });
  let ouvinte = null;
  auth.onAuthStateChange = (cb) => { ouvinte = cb; return { data: { subscription: { unsubscribe() { ouvinte = null; } } } }; };
  return { cliente: { auth }, chamadas, emitir: (e, s) => ouvinte && ouvinte(e, s), ouvindo: () => !!ouvinte };
}
const LOC = { protocol: 'https:', origin: 'https://gdev800.github.io', pathname: '/cortapramim/' };

test('adaptador: chama o Supabase com os parâmetros certos e o endereço de retorno', async () => {
  const f = falso(), a = criarAuth(f.cliente, LOC), volta = 'https://gdev800.github.io/cortapramim/';
  assert.deepEqual(await a.entrarComSenha('a@b.com', 'segredo123'), { ok: true });
  await a.entrarComGoogle(); await a.enviarCodigo('a@b.com'); await a.confirmarCodigo('a@b.com', '123456');
  await a.recuperarSenha('a@b.com'); await a.trocarSenha('novaSenha1'); await a.sair();
  assert.deepEqual(f.chamadas.map((c) => c[0]), ['signInWithPassword', 'signInWithOAuth', 'signInWithOtp', 'verifyOtp', 'resetPasswordForEmail', 'updateUser', 'signOut']);
  assert.deepEqual(f.chamadas[0][1], { email: 'a@b.com', password: 'segredo123' });
  assert.deepEqual(f.chamadas[1][1], { provider: 'google', options: { redirectTo: volta } });
  assert.deepEqual(f.chamadas[2][1], { email: 'a@b.com', options: { shouldCreateUser: true, emailRedirectTo: volta } });
  assert.deepEqual(f.chamadas[3][1], { email: 'a@b.com', token: '123456', type: 'email' });
  assert.deepEqual(f.chamadas[4].slice(1), ['a@b.com', { redirectTo: volta }]);
});

test('adaptador: erro do servidor e exceção viram { erro } em português; cadastro avisa se precisa confirmar', async () => {
  const f = falso({
    signInWithPassword: { data: {}, error: { code: 'invalid_credentials', message: 'Invalid login credentials' } },
    signInWithOtp: new TypeError('Failed to fetch'),
    signUp: { data: { user: { id: 'u' }, session: null }, error: null },
  });
  const a = criarAuth(f.cliente, LOC);
  assert.deepEqual(await a.entrarComSenha('a@b.com', 'x'), { erro: 'E-mail ou senha incorretos.' });
  assert.match((await a.enviarCodigo('a@b.com')).erro, /Sem conexão/);
  assert.deepEqual(await a.cadastrar('a@b.com', '12345678'), { ok: true, precisaConfirmar: true });
  const g = falso({ signUp: { data: { user: { id: 'u' }, session: { user: { id: 'u' } } }, error: null } });
  assert.deepEqual(await criarAuth(g.cliente, LOC).cadastrar('a@b.com', '12345678'), { ok: true, precisaConfirmar: false });
});

test('adaptador: usuário atual e aviso de mudanças (com cancelamento)', async () => {
  const f = falso({ getSession: { data: { session: { user: { id: 'u1', email: 'a@b.com' } } }, error: null } });
  const a = criarAuth(f.cliente, LOC);
  assert.deepEqual(await a.usuarioAtual(), { id: 'u1', email: 'a@b.com' });
  const vistos = []; const parar = a.aoMudar((e, u) => vistos.push([e, u && u.id]));
  f.emitir('SIGNED_IN', { user: { id: 'u1' } }); f.emitir('SIGNED_OUT', null);
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(vistos, [['SIGNED_IN', 'u1'], ['SIGNED_OUT', null]]);
  parar(); assert.equal(f.ouvindo(), false);
  const sem = falso({ getSession: new Error('x') });
  assert.equal(await criarAuth(sem.cliente, LOC).usuarioAtual(), null);
});
