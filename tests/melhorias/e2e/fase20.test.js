// Fase 20: login na tela, com um Supabase falso dentro do navegador (sem rede, sem credenciais reais).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from '../../e2e/helpers.js';

// Servidor de login falso: guarda usuários na memória e avisa as mudanças como o Supabase.
function instalarFalso() {
  const usuarios = { 'gilmar@teste.com': { senha: 'serragem123' } }, ouvintes = [], log = [];
  let sessao = null; const CODIGO = '123456';
  const avisar = (ev) => ouvintes.forEach((cb) => cb(ev, sessao));
  const entrar = (email) => { sessao = { user: { id: 'u-' + email, email } }; avisar('SIGNED_IN'); return { data: { session: sessao, user: sessao.user }, error: null }; };
  const erro = (code, message) => ({ data: {}, error: { code, message } });
  window.__fakeLog = log;
  window.__fakeEmit = (ev) => avisar(ev);
  window.__cortaSupabaseFake = { auth: {
    async getSession() { return { data: { session: sessao }, error: null }; },
    onAuthStateChange(cb) { ouvintes.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
    async signInWithPassword({ email, password }) { log.push(['senha', email]); const u = usuarios[email]; return u && u.senha === password ? entrar(email) : erro('invalid_credentials', 'Invalid login credentials'); },
    async signUp({ email, password }) { log.push(['cadastro', email]); if (usuarios[email]) return erro('user_already_exists', 'User already registered'); usuarios[email] = { senha: password }; return { data: { user: { id: 'n' }, session: null }, error: null }; },
    async signInWithOtp({ email }) { log.push(['otp', email]); return { data: {}, error: null }; },
    async verifyOtp({ email, token }) { log.push(['verificar', email, token]); return token === CODIGO ? entrar(email) : erro('otp_expired', 'Token has expired or is invalid'); },
    async resetPasswordForEmail(email) { log.push(['recuperar', email]); return { data: {}, error: null }; },
    async updateUser({ password }) { log.push(['nova', password.length]); return { data: {}, error: null }; },
    async signInWithOAuth(o) { log.push(['oauth', o.provider]); return { data: {}, error: null }; },
    async signOut() { log.push(['sair']); sessao = null; avisar('SIGNED_OUT'); return { error: null }; },
  } };
}

let app, page;
before(async () => {
  app = await abrirApp(); page = app.page;
  await page.addInitScript(instalarFalso);
  await page.reload(); await page.waitForFunction(() => window.__pc && window.__pc.state);
});
after(async () => { await app.fechar(); });

const log = () => page.evaluate(() => window.__fakeLog);
const abrir = async () => { await page.click('#btnConta'); await page.waitForSelector('#contaDlg[open]'); };
const fechar = async () => { if (await page.isVisible('#contaDlg')) await page.click('#contaFecha'); };

test('fora do claude.ai aparece "Entrar"; a janela avisa que sem login os dados ficam no navegador', async () => {
  assert.equal(await page.innerText('#btnConta'), 'Entrar');
  await abrir();
  assert.match(await page.innerText('#contaDlg [data-v="entrar"]'), /Sem entrar, o app continua funcionando/);
});

test('validação antes de chamar o servidor; senha errada mostra erro em português', async () => {
  await page.fill('#ctEmail', 'gilmar'); await page.fill('#ctSenha', 'x'); await page.click('#ctFormSenha button[type="submit"]');
  assert.match(await page.innerText('#ctMsg'), /não parece certo/);
  assert.deepEqual(await log(), []);
  await page.fill('#ctEmail', 'Gilmar@Teste.com'); await page.fill('#ctSenha', 'errada123'); await page.click('#ctFormSenha button[type="submit"]');
  await page.waitForFunction(() => /incorretos/.test(document.getElementById('ctMsg').textContent));
  assert.deepEqual((await log())[0], ['senha', 'gilmar@teste.com']);
});

test('entrar com senha certa: botão vira "Conta", mostra o e-mail; sair volta a "Entrar"', async () => {
  await page.fill('#ctSenha', 'serragem123'); await page.click('#ctFormSenha button[type="submit"]');
  await page.waitForFunction(() => document.getElementById('btnConta').textContent === 'Conta');
  assert.equal(await page.innerText('#ctQuem'), 'gilmar@teste.com');
  assert.match(await page.innerText('#contaDlg [data-v="conta"]'), /continuam guardados só neste navegador/);
  await page.click('#ctSair');
  await page.waitForFunction(() => document.getElementById('btnConta').textContent === 'Entrar');
  assert.equal(await page.isVisible('#contaDlg'), false);
});

test('criar conta: senhas diferentes recusa; e-mail novo pede confirmação; e-mail repetido avisa', async () => {
  await abrir(); await page.click('#contaDlg [data-ir="criar"]');
  assert.equal(await page.innerText('#contaTit'), 'Criar conta');
  await page.fill('#ctEmailN', 'mayara@teste.com'); await page.fill('#ctSenhaN', 'curta'); await page.fill('#ctSenhaN2', 'curta');
  await page.click('#ctFormCriar button[type="submit"]');
  assert.match(await page.innerText('#ctMsg'), /pelo menos 8/);
  await page.fill('#ctSenhaN', 'madeira123'); await page.fill('#ctSenhaN2', 'madeira124'); await page.click('#ctFormCriar button[type="submit"]');
  assert.match(await page.innerText('#ctMsg'), /não são iguais/);
  await page.fill('#ctSenhaN2', 'madeira123'); await page.click('#ctFormCriar button[type="submit"]');
  await page.waitForFunction(() => /clique no link para confirmar/.test(document.getElementById('ctMsg').textContent));
  await page.fill('#ctSenhaN', 'madeira123'); await page.fill('#ctSenhaN2', 'madeira123'); await page.click('#ctFormCriar button[type="submit"]');
  await page.waitForFunction(() => /Já existe uma conta/.test(document.getElementById('ctMsg').textContent));
});

test('código por e-mail: envia, contagem para reenviar, código errado e certo', async () => {
  await page.click('#contaDlg [data-ir="entrar"]'); await page.click('#ctModoCodigo');
  await page.fill('#ctEmailC', 'novo@teste.com'); await page.click('#ctEnviarCod');
  await page.waitForSelector('#ctCodBox:not([hidden])');
  assert.match(await page.innerText('#ctMsg'), /Enviamos um código para novo@teste.com/);
  await page.waitForFunction(() => /Reenviar em \d+s/.test(document.getElementById('ctEnviarCod').textContent));
  assert.equal(await page.isDisabled('#ctEnviarCod'), true);
  await page.fill('#ctCodigo', '12'); await page.click('#ctConfirmarCod');
  assert.match(await page.innerText('#ctMsg'), /código de números/);
  await page.fill('#ctCodigo', '999999'); await page.click('#ctConfirmarCod');
  await page.waitForFunction(() => /expirou/.test(document.getElementById('ctMsg').textContent));
  await page.fill('#ctCodigo', '123 456'); await page.click('#ctConfirmarCod');
  await page.waitForFunction(() => document.getElementById('btnConta').textContent === 'Conta');
  assert.deepEqual((await log()).filter((l) => l[0] === 'verificar').pop(), ['verificar', 'novo@teste.com', '123456']);
  await page.click('#ctSair');
});

test('esqueci a senha: mensagem neutra; voltar do e-mail abre "senha nova" e salva', async () => {
  await abrir(); await page.click('#contaDlg [data-ir="recuperar"]');
  await page.fill('#ctEmailR', 'gilmar@teste.com'); await page.click('#ctFormRec button[type="submit"]');
  await page.waitForFunction(() => /Se existir uma conta/.test(document.getElementById('ctMsg').textContent));
  await fechar();
  await page.evaluate(() => window.__fakeEmit('PASSWORD_RECOVERY'));
  await page.waitForSelector('#contaDlg[open] #ctFormNova:not([hidden])');
  await page.fill('#ctSenhaX', 'novasenha1'); await page.fill('#ctSenhaX2', 'novasenha1'); await page.click('#ctFormNova button[type="submit"]');
  await page.waitForFunction(() => /Senha nova salva/.test(document.getElementById('ctMsg').textContent));
  assert.deepEqual((await log()).pop(), ['nova', 10]);
  await fechar();
});

test('Google chama o provedor certo; o app segue funcionando sem login', async () => {
  await abrir(); await page.click('#ctGoogle');
  await page.waitForFunction(() => window.__fakeLog.some((l) => l[0] === 'oauth'));
  assert.deepEqual((await log()).find((l) => l[0] === 'oauth'), ['oauth', 'google']);
  await fechar();
  assert.ok(await page.evaluate(() => window.__pc.state.blocks.length > 0));
  assert.deepEqual(app.erros, []);
});

test('dentro do claude.ai não há login próprio', async () => {
  await page.addInitScript(() => { window.claude = { use: () => Promise.reject(new Error('sem capacidade')) }; });
  await page.reload(); await page.waitForFunction(() => window.__pc && window.__pc.state);
  assert.equal(await page.isVisible('#btnConta'), false);
  assert.deepEqual(app.erros, []);
});
