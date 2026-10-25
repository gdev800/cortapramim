// Conta: botão "Entrar" no topo e a janela de login (Google, e-mail e senha, código por e-mail, esqueci a senha).
// Só aparece fora do claude.ai. Sem login o app continua funcionando neste navegador.
import html from './template.html';
import './account.css';
import { validarEmail, validarSenha, validarCodigo, erroNoEndereco, ESPERA_REENVIO_S } from '../../../domain/auth.js';
import { $ } from '../../dom.js';

const TITULO = { entrar: 'Entrar', criar: 'Criar conta', recuperar: 'Esqueci a senha', nova: 'Senha nova', conta: 'Sua conta' };

export default {
  template: () => html,
  mount(ctx) {
    const { bus } = ctx, dlg = $('contaDlg'), btn = $('btnConta');
    if (!ctx.auth) { btn.hidden = true; return; } // claude.ai: sem login próprio
    const auth = ctx.auth;
    let usuario = null, recuperando = false; // recuperando: entrou pelo código e ainda vai trocar a senha

    const msg = (t, kind) => { $('ctMsg').textContent = t || ''; $('ctMsg').className = 'msg' + (kind ? ' ' + kind : ''); };
    function ver(v) {
      dlg.querySelectorAll('[data-v]').forEach((el) => { el.hidden = el.dataset.v !== v; });
      $('contaTit').textContent = TITULO[v]; msg('');
      const foco = dlg.querySelector('[data-v="' + v + '"] input:not([hidden])');
      if (foco && dlg.open) foco.focus();
    }
    function abrir(v) {
      if (!dlg.open) { dlg.showModal(); modo(false); $('ctCodBox').hidden = true; } // sempre começa no modo senha (o código de recuperação já pedido continua na tela)
      ver(v || (usuario ? 'conta' : 'entrar'));
    }
    // evita duplo clique e mostra "aguarde" enquanto fala com o servidor
    async function ocupado(form, fn) {
      const bs = [...form.querySelectorAll('button')].filter((b) => !b.disabled); bs.forEach((b) => { b.disabled = true; });
      msg('Aguarde…');
      try { return await fn(); } finally { bs.forEach((b) => { b.disabled = false; }); }
    }
    function mostrarUsuario() {
      btn.textContent = usuario ? 'Conta' : 'Entrar';
      btn.title = usuario ? 'Conectado como ' + (usuario.email || '') : 'Entrar na sua conta';
      $('ctQuem').textContent = usuario ? usuario.email || '' : '';
    }

    btn.hidden = false;
    btn.addEventListener('click', () => abrir());
    $('contaFecha').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { const ir = e.target.closest('[data-ir]'); if (ir) ver(ir.dataset.ir); });

    function modo(codigo) {
      $('ctModoSenha').setAttribute('aria-pressed', String(!codigo)); $('ctModoCodigo').setAttribute('aria-pressed', String(codigo));
      $('ctFormSenha').hidden = codigo; $('ctFormCodigo').hidden = !codigo; msg('');
    }
    $('ctModoSenha').addEventListener('click', () => modo(false));
    $('ctModoCodigo').addEventListener('click', () => modo(true));

    $('ctGoogle').addEventListener('click', async () => {
      msg('Abrindo o Google…');
      const r = await auth.entrarComGoogle();
      if (r.erro) msg(r.erro, 'err'); // se deu certo, a página vai para o Google e volta logada
    });

    $('ctFormSenha').addEventListener('submit', (e) => { e.preventDefault(); ocupado(e.target, async () => {
      const em = validarEmail($('ctEmail').value); if (em.erro) return msg(em.erro, 'err');
      if (!$('ctSenha').value) return msg('Digite a sua senha.', 'err');
      const r = await auth.entrarComSenha(em.email, $('ctSenha').value);
      if (r.erro) return msg(r.erro, 'err');
      $('ctSenha').value = ''; msg('');
    }); });

    const timers = {}; // um relógio por botão (código de entrar e código de recuperar)
    function contagem(id) {
      id = id || 'ctEnviarCod'; let s = ESPERA_REENVIO_S; const b = $(id); clearInterval(timers[id]);
      const tick = () => { if (s <= 0) { clearInterval(timers[id]); b.disabled = false; b.textContent = 'Reenviar código'; return; } b.disabled = true; b.textContent = 'Reenviar em ' + s + 's'; s--; };
      tick(); timers[id] = setInterval(tick, 1000);
    }
    $('ctFormCodigo').addEventListener('submit', (e) => { e.preventDefault(); ocupado(e.target, async () => {
      const em = validarEmail($('ctEmailC').value); if (em.erro) return msg(em.erro, 'err');
      const r = await auth.enviarCodigo(em.email);
      if (r.erro) return msg(r.erro, 'err');
      $('ctCodBox').hidden = false; msg('Enviamos um código para ' + em.email + '. Ele vale por pouco tempo.', 'ok');
      $('ctCodigo').focus();
    }).then(() => { if (!$('ctCodBox').hidden) contagem(); }); });
    $('ctConfirmarCod').addEventListener('click', () => ocupado($('ctFormCodigo'), async () => {
      const em = validarEmail($('ctEmailC').value); if (em.erro) return msg(em.erro, 'err');
      const c = validarCodigo($('ctCodigo').value); if (c.erro) return msg(c.erro, 'err');
      const r = await auth.confirmarCodigo(em.email, c.codigo);
      if (r.erro) return msg(r.erro, 'err');
      $('ctCodigo').value = '';
    }));

    const senhasIguais = (a, b) => {
      const s = validarSenha($(a).value); if (s.erro) return s;
      if ($(a).value !== $(b).value) return { erro: 'As duas senhas não são iguais.' };
      return s;
    };
    $('ctFormCriar').addEventListener('submit', (e) => { e.preventDefault(); ocupado(e.target, async () => {
      const em = validarEmail($('ctEmailN').value); if (em.erro) return msg(em.erro, 'err');
      const s = senhasIguais('ctSenhaN', 'ctSenhaN2'); if (s.erro) return msg(s.erro, 'err');
      const r = await auth.cadastrar(em.email, s.senha);
      if (r.erro) return msg(r.erro, 'err');
      $('ctSenhaN').value = ''; $('ctSenhaN2').value = '';
      if (r.precisaConfirmar) msg('Conta criada. Abra o e-mail que enviamos para ' + em.email + ' e clique no link para confirmar.', 'ok');
    }); });

    $('ctFormRec').addEventListener('submit', (e) => { e.preventDefault(); ocupado(e.target, async () => {
      const em = validarEmail($('ctEmailR').value); if (em.erro) return msg(em.erro, 'err');
      const r = await auth.recuperarSenha(em.email);
      if (r.erro) return msg(r.erro, 'err');
      // não conta se o e-mail existe ou não (evita descobrir quem tem conta)
      $('ctRecBox').hidden = false;
      msg('Se existir uma conta com ' + em.email + ', o código chega em alguns minutos. Confira também o spam.', 'ok');
      $('ctCodigoR').focus();
    }).then(() => { if (!$('ctRecBox').hidden) contagem('ctEnviarRec'); }); });
    $('ctSalvarRec').addEventListener('click', () => ocupado($('ctFormRec'), async () => {
      const em = validarEmail($('ctEmailR').value); if (em.erro) return msg(em.erro, 'err');
      const c = validarCodigo($('ctCodigoR').value); if (c.erro) return msg(c.erro, 'err');
      const s = senhasIguais('ctSenhaR', 'ctSenhaR2'); if (s.erro) return msg(s.erro, 'err');
      recuperando = true;
      try {
        const r = await auth.confirmarRecuperacao(em.email, c.codigo);
        if (r.erro) return msg(r.erro, 'err');
        const t = await auth.trocarSenha(s.senha);
        if (t.erro) return msg(t.erro, 'err');
      } finally { recuperando = false; }
      ['ctCodigoR', 'ctSenhaR', 'ctSenhaR2'].forEach((id) => { $(id).value = ''; });
      ver('conta'); msg('Senha nova salva. Você já está dentro.', 'ok');
    }));

    $('ctFormNova').addEventListener('submit', (e) => { e.preventDefault(); ocupado(e.target, async () => {
      const s = senhasIguais('ctSenhaX', 'ctSenhaX2'); if (s.erro) return msg(s.erro, 'err');
      const r = await auth.trocarSenha(s.senha);
      if (r.erro) return msg(r.erro, 'err');
      $('ctSenhaX').value = ''; $('ctSenhaX2').value = '';
      ver('conta'); msg('Senha nova salva.', 'ok');
    }); });

    $('ctTrocarSenha').addEventListener('click', () => ver('nova'));
    $('ctSair').addEventListener('click', async () => {
      const r = await auth.sair();
      if (r.erro) return msg(r.erro, 'err');
      dlg.close();
    });

    auth.aoMudar((evento, u) => {
      const antes = usuario; usuario = u; mostrarUsuario();
      bus.emit('auth', { evento, usuario: u });
      if (recuperando) return; // a tela de "esqueci a senha" termina sozinha depois de salvar
      if (evento === 'PASSWORD_RECOVERY') { abrir('nova'); return; } // voltou do e-mail de "esqueci a senha"
      // o título "Sua conta" e o e-mail já dizem que entrou; se já está nela, não apaga o aviso (ex.: "Senha nova salva")
      if (u && !antes && dlg.open && dlg.querySelector('[data-v="conta"]').hidden) ver('conta');
      if (!u && dlg.open && evento === 'SIGNED_OUT') ver('entrar');
    });
    auth.usuarioAtual().then((u) => { if (u && !usuario) { usuario = u; mostrarUsuario(); bus.emit('auth', { evento: 'INITIAL_SESSION', usuario: u }); } });
    mostrarUsuario();

    // Link do e-mail que falhou: avisa e limpa o endereço (senão o aviso volta a cada recarga)
    const erroLink = erroNoEndereco(window.location);
    if (erroLink) {
      abrir('entrar'); msg(erroLink, 'err');
      try { history.replaceState(null, '', window.location.pathname); } catch (e) { /* segue */ }
    }
  },
};
