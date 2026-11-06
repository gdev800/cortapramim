# Parte 13 — Página de apresentação e conta para baixar e salvar (fase 25)

> **Especificação validada em 06/11/2026.** Tudo abaixo foi implementado num protótipo descartável sobre o commit
> `b5789d9` ("Recomeçar com confirmação") e testado nas condições do CI (fonte do Ubuntu, 3 arquivos e2e em paralelo):
> lint limpo, `npm audit` sem falhas, **170 unitários** e **94 e2e** (82 antigos + 12 novos), com a conta obrigatória
> **desligada** e de novo **ligada** (simulando o dia de ligar). O código deste documento é o código que passou.
> O mesmo conteúdo está em [`parte-13.patch`](parte-13.patch).

## 0. Como usar este documento (leia antes de começar)

Para quem vai implementar (pessoa ou agente):

1. Siga as regras do projeto: skill `cortapramim-fase` (pasta real `~/workstation/cortapramim`, autor dos commits
   `Gabriel Luz <gdev800@users.noreply.github.com>`, **nunca dar push**, suíte inteira verde antes de cada commit).
2. **Caminho rápido (recomendado):** na raiz do repositório, `git apply --3way --check docs/plano/specs/parte-13.patch`.
   Se não acusar conflito, rode `git apply --3way docs/plano/specs/parte-13.patch`, vá para a seção 6 (Verificação) e,
   passando tudo, para a seção 5, Etapa H (documentação), e faça o commit.
3. **Se o patch não aplicar** (o código mudou depois de `b5789d9`), faça à mão pelas etapas A a H da seção 5, na ordem.
   Os arquivos novos estão completos aqui; as alterações estão em diff, com contexto para achar o lugar.
4. **Não invente.** Textos da tela, IDs, nomes de funções, chaves do navegador e nomes de eventos são exatamente os deste
   documento. Se algo aqui não bater com o código, **pare e pergunte ao Gabriel**: não "adapte" por conta própria.
5. Um commit por etapa é o ideal; no mínimo, um commit no fim com a suíte verde.

## 1. O que muda e por quê

- **Primeira visita ao site** abre uma **página de apresentação** (`#/inicio`): o que o sistema faz, como funciona,
  benefícios, uma prova com projeto real e perguntas frequentes. Botões: **Criar conta grátis**, **Entrar** e
  **Experimentar sem conta**. Quem já usou o app neste navegador (ou está logado) abre direto no app (`#/app`).
- **Conta obrigatória para baixar, salvar e usar o estoque**: montar a lista, calcular e aprovar continuam livres
  (é o "test drive"); na hora de levar o resultado (PDF, etiquetas, CSV, salvar projeto, estoque) a janela de conta
  abre com o motivo. Depois de entrar, a ação pedida acontece sozinha.
- **A conta obrigatória vem DESLIGADA** (`EXIGIR_CONTA_NO_SITE = false`). Ela só é ligada depois dos pré-requisitos
  da seção 8 (SMTP, Supabase sem pausar, dados na nuvem, termo e privacidade). Até lá, a página de apresentação já
  funciona e diz "Pode usar sem conta".
- **O artefato do claude.ai não muda**: sem página de apresentação, sem conta obrigatória, vitrine no topo como hoje.

Por que não bloquear a entrada: quem não vê o sistema funcionando não cria conta. A conta é pedida no momento em que
o plano vira valor (baixar e salvar). Analogia: a loja deixa fazer o test drive; para levar o carro, assina.

## 2. Comportamento esperado

| Situação | Site, conta desligada (hoje) | Site, conta ligada (depois da seção 8) | Artefato do claude.ai |
|---|---|---|---|
| Primeira visita, sem `#/...` no endereço | Apresentação | Apresentação | App (com vitrine) |
| Já entrou no app neste navegador (chave `cortapramim-ja-usou`) | App | App | App |
| Logado e sem `#/...` no endereço | App (vai assim que o login é confirmado) | App | — |
| `#/inicio` no endereço | Apresentação | Apresentação | App (`#/inicio` não existe) |
| `#/app` no endereço | App | App | App |
| Âncoras (`#montar`, `#t-res`, `#sobras`, `#topo`) e `#error=...` do Supabase | Não são rota: fica onde está | idem | idem |
| "Voltar" do navegador até o endereço sem `#` | Decide de novo (já usou → app) | idem | — |
| Calcular, aprovar, comparar, recomeçar, modelos, backup | Livre | Livre | Livre |
| Baixar PDF/PNG/CSV/etiquetas, salvar projeto, estoque, proposta, compras, relatório | Livre | Pede conta (lista na Etapa E) | Livre |
| Texto da apresentação abaixo dos botões | "Pode usar sem conta: o que você monta fica guardado neste navegador." | "Sem conta você monta e calcula planos para conhecer. Para baixar os arquivos, salvar projetos e usar o estoque, crie sua conta grátis." | — |
| Login indisponível (Supabase não carregou: `ctx.auth` nulo) | Apresentação só com "Experimentar sem conta" | Conta obrigatória **não liga** (senão travaria o app) | — |

Regras que não podem quebrar:
- O roteador **lê** o endereço ao abrir, mas **não escreve** nele. Só um clique (botão ou link) muda o `#`.
  (O teste da fase 20 confere que o endereço fica vazio depois do link de erro do Supabase.)
- Todos os componentes continuam montados nas duas páginas; o CSS esconde o que não é da página atual.
- A conta obrigatória é uma **trava de tela, não de segurança** (quem entende de código contorna). Limite de plano
  pago, quando existir, tem que ser conferido no servidor (Supabase).

## 3. Fora do escopo (não fazer nesta parte)

- Dividir o app em várias páginas (`#/montar`, `#/resultado`, `#/estoque`): é o **R26**. Esta parte cria o roteador
  com `inicio` e `app`; o R26 acrescenta rotas em `ROTAS` (`src/domain/rotas.js`).
- Guardar os dados na conta (Parte 9 / R15), termo de uso e privacidade (R20 a R22), SMTP e plano do Supabase.
- Ligar `EXIGIR_CONTA_NO_SITE`. Isso é a seção 8, numa etapa separada, quando os pré-requisitos estiverem prontos.
- Mudar o visual do app, o motor de corte ou qualquer texto fora dos listados aqui.

## 4. Arquivos

| Arquivo | O que é |
|---|---|
| `src/domain/recursos.js` (novo) | Regra pura: quais recursos ligam em cada versão (site/artefato) |
| `src/ui/recursos.js` (novo) | Lê a versão do build e o override dos testes; **`EXIGIR_CONTA_NO_SITE = false`** |
| `src/domain/rotas.js` (novo) | Regra pura das rotas: `ROTAS`, `rotaDoEndereco`, `rotaInicial` |
| `src/ui/router.js` (novo) | Troca de página por `#/`, `<body data-pagina>`, evento `rota` |
| `src/ui/components/shared/bancada.html` (novo) | Ilustração da bancada, tirada do Hero para ser usada nos dois lugares |
| `src/ui/components/inicio/` (novo: `index.js`, `template.html`, `inicio.css`) | Página de apresentação |
| `src/ui/components/conta-obrigatoria/` (novo: `index.js`, `acoes.js`) | O "porteiro" e a lista de ações que pedem conta |
| `scripts/build.mjs` | `define: { __CORTA_SITE__ }` e `<meta name="description">` no site |
| `eslint.config.js` | `__CORTA_SITE__` como global de leitura |
| `src/infra/local.js` | Chave nova `jaUsou: 'cortapramim-ja-usou'` |
| `src/ui/bus.js` | Documenta os eventos `auth` e `rota` |
| `src/ui/app.js` | Liga recursos, página de apresentação, roteador e porteiro |
| `src/ui/components/hero/index.js` e `template.html` | Usa a ilustração compartilhada |
| `src/ui/components/account/` (`index.js`, `template.html`, `account.css`) | `abrirConta`, `fecharConta`, aviso no topo, texto "sem conta" |
| `src/ui/components/nav/template.html` | Link "Abrir o app" (só aparece na apresentação) |
| `tests/e2e/helpers.js` | `DIST` com `#/app`, `DIST_INICIO`, opção `recursos` |
| `tests/e2e/supabase-falso.js` (novo) e `tests/e2e/fases/fase20.test.js` | Supabase falso compartilhado |
| `tests/unit/fases/fase25.test.js`, `tests/e2e/fases/fase25-apresentacao.test.js`, `tests/e2e/fases/fase25-conta.test.js` (novos) | Testes da parte |

## 5. Etapas
### Etapa A — Recursos e versão do build

O build passa a dizer ao código se é o site ou o artefato. `__CORTA_SITE__` é trocado pelo esbuild por `true`/`false`;
fora do build (Node, testes unitários) ele não existe, por isso o `typeof`.

**`src/domain/recursos.js`** (arquivo novo, conteúdo completo):

```js
// Quais recursos ficam ligados em cada versão do app (Parte 13). Função pura: quem lê o build e a janela é ui/recursos.js.
//
// - paginaInicial: página de apresentação em "#/inicio" antes do app. Só no site (o artefato do claude.ai abre direto no app).
// - exigirConta:   baixar arquivos, salvar projetos e usar o estoque pedem login. Só no site, e só quando ligado de propósito.
//
// `override` existe para os testes automáticos (window.__cortaRecursos). Só vale booleano de verdade, e nunca liga nada
// fora do site: no artefato do claude.ai não há login próprio, então exigir conta travaria o app.

/**
 * @param {{ noSite: boolean, override?: any, exigirContaPadrao: boolean }} p
 * @returns {{ paginaInicial: boolean, exigirConta: boolean }}
 */
export function resolverRecursos({ noSite, override, exigirContaPadrao }) {
  const o = override && typeof override === 'object' && !Array.isArray(override) ? override : {};
  const escolher = (k, padrao) => (typeof o[k] === 'boolean' ? o[k] : padrao);
  return {
    paginaInicial: noSite === true && escolher('paginaInicial', true),
    exigirConta: noSite === true && escolher('exigirConta', exigirContaPadrao === true),
  };
}
```
**`src/ui/recursos.js`** (arquivo novo, conteúdo completo):

```js
// Lê de onde o app foi construído (site ou artefato) e devolve os recursos ligados. Regra em domain/recursos.js.
import { resolverRecursos } from '../domain/recursos.js';

/**
 * Exigir conta no site. Ligue (true) SÓ depois dos pré-requisitos da Parte 13
 * (docs/plano/specs/parte-13-apresentacao-e-conta.md, seção "Ligar a conta obrigatória").
 */
export const EXIGIR_CONTA_NO_SITE = false;

// O build troca __CORTA_SITE__ por true (site) ou false (artefato). Fora do build (Node, testes unitários) não existe.
const NO_SITE = typeof __CORTA_SITE__ !== 'undefined' && __CORTA_SITE__ === true;

export function recursos() {
  // um elemento HTML com id="__cortaRecursos" também aparece em window (DOM clobbering): só objeto comum conta
  const o = typeof window !== 'undefined' ? window.__cortaRecursos : undefined;
  const override = o && typeof o === 'object' && !(typeof Node !== 'undefined' && o instanceof Node) ? o : undefined;
  return resolverRecursos({ noSite: NO_SITE, override, exigirContaPadrao: EXIGIR_CONTA_NO_SITE });
}
```
**`scripts/build.mjs`** (alteração, diff em relação ao `b5789d9`):

```diff
diff --git a/scripts/build.mjs b/scripts/build.mjs
index 4382df2..0859fab 100644
--- a/scripts/build.mjs
+++ b/scripts/build.mjs
@@ -21,6 +21,8 @@ const r = await build({
   external: ['html2canvas', 'dompurify', 'canvg'],
   // compacta por padrão (a biblioteca do Supabase triplicava o arquivo); --dev gera legível para depurar
   minify: !process.argv.includes('--dev'), keepNames: true,
+  // Parte 13: o código sabe se é o site (página inicial e conta) ou o artefato do claude.ai (ui/recursos.js)
+  define: { __CORTA_SITE__: artefato ? 'false' : 'true' },
   logLevel: 'warning',
 });
 const saida = (ext) => r.outputFiles.find((f) => f.path.endsWith(ext)).text;
@@ -57,5 +59,6 @@ function cabecalhoDoSite(script) {
   return '<!doctype html>\n<html lang="pt-BR">\n<meta charset="utf-8">\n' +
     '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
     `<meta http-equiv="Content-Security-Policy" content="${csp}">\n` +
-    '<meta name="referrer" content="strict-origin-when-cross-origin">\n';
+    '<meta name="referrer" content="strict-origin-when-cross-origin">\n' +
+    '<meta name="description" content="Plano de corte de MDF para marcenaria: menos chapas, sobras que voltam para o estoque, etiquetas e PDF prontos para a serra.">\n';
 }
```
**`eslint.config.js`** (alteração, diff em relação ao `b5789d9`):

```diff
diff --git a/eslint.config.js b/eslint.config.js
index 12db629..328c2a6 100644
--- a/eslint.config.js
+++ b/eslint.config.js
@@ -13,7 +13,7 @@ export default [
   js.configs.recommended,
   {
     files: ['src/**/*.js'],
-    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.browser } },
+    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.browser, __CORTA_SITE__: 'readonly' } }, // __CORTA_SITE__: definido pelo build
     plugins: { 'no-unsanitized': nounsanitized },
     rules: {
       'no-unsanitized/property': ['error', { escape: { methods: ESCAPAM } }],
```

**Pronto quando:** `npm run lint` limpo e `npm run build` e `npm run build:artefato` geram os dois arquivos.

### Etapa B — Rotas e roteador

**`src/domain/rotas.js`** (arquivo novo, conteúdo completo):

```js
// Rotas do app por "#/" no endereço (Parte 13). Funções puras; quem mexe na tela é ui/router.js.
//
// Só endereço que começa com "#/" é rota. O resto do "#" continua como antes:
//   - âncoras da página ("#montar", "#t-res", "#sobras", "#topo");
//   - retorno do Supabase com erro ("#error=...&error_code=...", tratado em domain/auth.js).
// A navegação em páginas (R26) vai dividir "app" em "montar", "resultado", "estoque": acrescentar em ROTAS.

export const ROTAS = ['inicio', 'app'];

/** "#/app" -> "app"; "#/inicio?x" -> "inicio"; qualquer outra coisa -> null. */
export function rotaDoEndereco(hash) {
  const m = /^#\/([a-z]+)(?:[/?]|$)/.exec(String(hash == null ? '' : hash));
  return m && ROTAS.includes(m[1]) ? m[1] : null;
}

/**
 * Página ao abrir o app.
 * - Sem página inicial (artefato do claude.ai): sempre "app".
 * - Rota escrita no endereço: ela.
 * - Já usou o app neste navegador (ou clicou num botão da apresentação): "app".
 * - Primeira visita: "inicio".
 * Quem já está logado vai para o app quando o login é confirmado (ui/router.js), sem esperar aqui.
 */
export function rotaInicial({ hash, paginaInicial, jaUsou }) {
  if (!paginaInicial) return 'app';
  return rotaDoEndereco(hash) || (jaUsou ? 'app' : 'inicio');
}
```
**`src/ui/router.js`** (arquivo novo, conteúdo completo):

```js
// Troca de página por "#/" no endereço (Parte 13). A página atual fica em <body data-pagina="...">; o CSS
// (components/inicio/inicio.css) esconde o que não é dela. Todos os componentes continuam montados.
//
// Regra importante: ao abrir, o roteador LÊ o endereço mas não ESCREVE nele. Só um clique de navegação muda o "#".
// (O link de erro do Supabase, "#error=...", é lido e limpo pela conta; o teste da fase 20 confere o endereço vazio.)
import { rotaDoEndereco, rotaInicial } from '../domain/rotas.js';
import { KEYS, lget, lset } from '../infra/local.js';

/** @returns {{ irPara(rota: string): void, atual(): string }} */
export function criarRoteador(ctx, { paginaInicial }) {
  let atual = null;

  function mostrar(rota) {
    if (rota === atual) return;
    atual = rota;
    document.body.dataset.pagina = rota;
    if (rota === 'app') lset(KEYS.jaUsou, true); // da próxima vez abre direto no app
    window.scrollTo(0, 0);
    ctx.bus.emit('rota', { rota });
  }

  /** Navega mudando o endereço (o botão "voltar" do navegador funciona). */
  function irPara(rota) {
    if (!paginaInicial) rota = 'app';
    if (location.hash !== '#/' + rota) location.hash = '#/' + rota; // dispara hashchange -> mostrar
    else mostrar(rota);
  }

  const decidir = () => rotaInicial({ hash: location.hash, paginaInicial, jaUsou: lget(KEYS.jaUsou) === true });

  window.addEventListener('hashchange', () => {
    if (!paginaInicial) return;
    const r = rotaDoEndereco(location.hash);
    if (r) { mostrar(r); return; }
    // "voltar" até o endereço sem "#": decide de novo (quem já usou vai para o app)
    if (!location.hash || location.hash === '#' || location.hash === '#/') mostrar(decidir());
    // "#montar", "#error=..." e outras âncoras não são rota: fica onde está
  });

  // quem já está logado não precisa da apresentação (a menos que tenha pedido "#/inicio")
  ctx.bus.on('auth', ({ usuario }) => {
    if (usuario && atual === 'inicio' && !rotaDoEndereco(location.hash)) mostrar('app');
  });

  mostrar(decidir());
  return { irPara, atual: () => atual };
}
```
**`src/infra/local.js`** (alteração, diff em relação ao `b5789d9`):

```diff
diff --git a/src/infra/local.js b/src/infra/local.js
index f58df62..bb15602 100644
--- a/src/infra/local.js
+++ b/src/infra/local.js
@@ -9,6 +9,7 @@ export const KEYS = {
   mudanca: 'plano-mdf-mudanca',
   backup: 'plano-mdf-backup',
   historico: 'plano-mdf-historico',
+  jaUsou: 'cortapramim-ja-usou', // Parte 13: já entrou no app neste navegador (pula a página de apresentação)
 };
 
 export const lget = (k) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } };
```
**`src/ui/bus.js`** (alteração, diff em relação ao `b5789d9`):

```diff
diff --git a/src/ui/bus.js b/src/ui/bus.js
index 1e35a38..bfaad7f 100644
--- a/src/ui/bus.js
+++ b/src/ui/bus.js
@@ -14,6 +14,8 @@
 //   note      aviso sobre onde os dados ficam (payload texto)
 //   storage   o modo de armazenamento mudou
 //   dl        a capacidade de download ficou disponível
+//   auth      o login mudou (payload { evento, usuario }; usuario null = saiu)
+//   rota      a página mudou (payload { rota: 'inicio' | 'app' })
 export function createBus() {
   const subs = {};
   return {
```

Cuidados (todos já tratados no código acima; não mudar):
- `hashchange` com âncora (`#montar`) ou `#error=...` **não troca de página**.
- "Voltar" até o endereço sem `#` **decide de novo** (`decidir()`); sem isso, quem já usou ficava preso na apresentação.
- `mostrar('app')` grava `cortapramim-ja-usou = true` (via `lset`, que guarda JSON: o valor lido é o booleano `true`).

### Etapa C — Ilustração compartilhada e página de apresentação

1. Crie `src/ui/components/shared/bancada.html` com **o bloco `<div class="bench" ...>` inteiro** que hoje está em
   `src/ui/components/hero/template.html` (da linha `    <div class="bench" role="img" ...>` até o `    </div>` que
   vem logo antes de `  </section>`), sem mudar nada dentro dele. No Hero, esse bloco vira a linha `<!--BANCADA-->`.
   Os ids do SVG (`wood`, `vig`, `sh`, `hatch`) não conflitam: Hero e apresentação nunca aparecem juntos.
**`src/ui/components/hero/index.js`** (alteração, diff em relação ao `b5789d9`):

```diff
diff --git a/src/ui/components/hero/index.js b/src/ui/components/hero/index.js
index 3921005..d514c89 100644
--- a/src/ui/components/hero/index.js
+++ b/src/ui/components/hero/index.js
@@ -1,10 +1,11 @@
 // Vitrine do topo da página.
 import html from './template.html';
+import bancada from '../shared/bancada.html';
 import './hero.css';
 import { $, rolarPara } from '../../dom.js';
 
 export default {
-  template: () => html,
+  template: () => html.replace('<!--BANCADA-->', () => bancada), // a mesma ilustração da página de apresentação
   mount(ctx) {
     $('heroEx').addEventListener('click', () => {
       ctx.actions.carregarExemplo();
```

Resultado esperado em `hero/template.html` (só o fim muda):

```html
  <section class="hero" aria-labelledby="h1">
    <div>
      <div class="eyebrow">Plano de corte para marcenaria</div>
      <h1 id="h1">Menos chapas. <em>Sobras que voltam</em> para o estoque.</h1>
      <p class="sub">Digite as peças como no caderno ou cole a planilha. O sistema respeita o veio, usa seus retalhos primeiro e entrega o plano pronto para a plataforma de corte.</p>
      <div class="cta">
        <a class="btnlink primary big" href="#montar">Montar um plano</a>
        <button type="button" id="heroEx" class="big">Ver um exemplo</button>
      </div>
    </div>
<!--BANCADA-->
  </section>
```

2. Página de apresentação. **O texto é final**: não reescreva, não acrescente números ou promessas.

**`src/ui/components/inicio/template.html`** (arquivo novo, conteúdo completo):

```html
<div id="inicio" class="wrap inicio">
  <section class="hero" aria-labelledby="inTit">
    <div>
      <div class="eyebrow">Plano de corte para marcenaria</div>
      <h1 id="inTit">Menos chapas. <em>Sobras que voltam</em> para o estoque.</h1>
      <p class="sub">Digite as peças como no caderno ou cole a planilha. O Corta pra Mim monta o plano de corte, respeita o veio, usa seus retalhos primeiro e entrega PDF, etiquetas e listas prontas para a serra ou para a plataforma de corte.</p>
      <div class="cta">
        <button type="button" id="inCriar" class="primary big">Criar conta grátis</button>
        <button type="button" id="inEntrar" class="big">Entrar</button>
        <button type="button" id="inAbrir" class="primary big" hidden>Abrir o app</button>
      </div>
      <p class="in-aviso"><span id="inAvisoConta"></span> <button type="button" id="inExperimentar" class="in-link">Experimentar sem conta</button></p>
    </div>
<!--BANCADA-->
  </section>

  <div class="sec-h" id="inComo"><div class="eyebrow">Como funciona</div><h2>Do caderno para a serra em três passos.</h2></div>
  <ol class="in-passos">
    <li><b>Digite ou cole as peças</b><p>Quantidade, comprimento, largura e fita, chapa por chapa. Aceita lista colada do Excel, arquivo CSV ou planilha .xlsx.</p></li>
    <li><b>Calcule e confira</b><p>O sistema testa muitos arranjos e desenha cada chapa, com a sequência dos cortes e as sobras que valem guardar.</p></li>
    <li><b>Aprove e leve para o corte</b><p>PDF do plano, etiquetas para colar nas peças, imagem de cada chapa e listas em CSV.</p></li>
  </ol>

  <div class="sec-h"><div class="eyebrow">O que você ganha</div><h2>Feito para o dia a dia da marcenaria.</h2></div>
<!--BENTO-->
  <section class="bento in-bento2" aria-label="Mais recursos">
    <article><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h16v26l-4-2-4 2-4-2-4 2z"/><path d="M12 10h8M12 15h8M12 20h5"/></svg><h3>Orçamento e proposta</h3><p>Custo de chapa, fita e ferragens, preço de venda com a sua margem e proposta em PDF para o cliente.</p></article>
    <article><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="16" width="11" height="11" rx="1.5"/><rect x="17" y="16" width="11" height="11" rx="1.5"/><rect x="10.5" y="4" width="11" height="11" rx="1.5"/></svg><h3>Estoque e histórico</h3><p>Sobras, chapas, fita e ferragens guardadas, aviso de estoque mínimo e o resumo do que saiu no mês.</p></article>
  </section>

  <section class="in-prova" aria-label="Teste com projeto real">
    <p class="in-num">16 chapas</p>
    <p>Num projeto real de 289 peças em 4 materiais, o Corta pra Mim usou o mesmo número de chapas que um otimizador comercial.</p>
  </section>

  <div class="sec-h"><div class="eyebrow">Perguntas</div><h2>Antes de começar.</h2></div>
  <div class="in-faq">
    <details><summary>Precisa instalar alguma coisa?</summary><p>Não. Funciona no navegador do computador, do tablet ou do celular.</p></details>
    <details><summary>Quanto custa?</summary><p>Criar a conta é grátis.</p></details>
    <details><summary>Onde ficam os meus dados?</summary><p id="inFaqDados">Hoje, os projetos e o estoque ficam guardados no navegador em que você usa o app. Para levar para outro computador, use o backup do próprio app.</p></details>
    <details><summary>Serve para a minha serra?</summary><p>Serve para esquadrejadeira ou para mandar a lista a uma plataforma de corte. Você informa a espessura da serra e o refilo, e a sequência dos cortes vem desenhada.</p></details>
    <details><summary>E se eu digitar uma medida errada?</summary><p>O sistema avisa medida inválida e peça maior que a chapa. Mesmo assim, confira as medidas antes de cortar: erro de corte não tem volta.</p></details>
  </div>

  <footer class="foot">Confira sempre as medidas reais da chapa com o fornecedor antes de cortar. · <a href="#/app">Abrir o app</a></footer>
</div>
```
**`src/ui/components/inicio/inicio.css`** (arquivo novo, conteúdo completo):

```css
/* Parte 13: páginas. <body data-pagina="inicio|app"> (ui/router.js) decide o que aparece. */
body[data-pagina="inicio"] #topo,
body[data-pagina="inicio"] #dock { display: none !important; }
body[data-pagina="app"] #inicio { display: none; }
/* na apresentação, a barra do topo mostra só a marca, "Abrir o app" e "Entrar" */
body[data-pagina="inicio"] .nav-links a[data-sec],
body[data-pagina="inicio"] #navStore { display: none; }
body:not([data-pagina="inicio"]) #navApp { display: none; }

/* título só para leitor de tela (o app, no site, não tem mais a vitrine com o h1) */
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

.inicio .in-aviso { margin-top: 16px; color: var(--muted); font-size: 0.95rem; line-height: 1.45; max-width: 46ch; }
.in-link { background: none; border: 0; padding: 0; min-height: 0; color: var(--fg); font: inherit; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }

.in-passos { list-style: none; counter-reset: passo; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 0; padding: 0; }
.in-passos li { counter-increment: passo; background: var(--surface); border-radius: 24px; padding: 22px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 8px; }
.in-passos li::before { content: counter(passo); font-family: var(--f-display); font-weight: 800; font-size: 1.6rem; color: var(--brass); }
.in-passos b { font-size: 1.08rem; }
.in-passos p { color: var(--muted); font-size: 0.93rem; line-height: 1.45; margin: 0; }
.in-bento2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

.in-prova { background: var(--brass-soft); border-radius: 24px; padding: 22px 26px; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; }
.in-prova p { margin: 0; max-width: 60ch; line-height: 1.45; }
.in-prova .in-num { font-family: var(--f-display); font-weight: 800; font-size: clamp(1.8rem, 4vw, 2.4rem); letter-spacing: -0.02em; }

.in-faq { display: flex; flex-direction: column; gap: 10px; }
.in-faq details { background: var(--surface); border-radius: 18px; padding: 14px 20px; box-shadow: var(--shadow); }
.in-faq summary { cursor: pointer; font-weight: 600; }
.in-faq p { color: var(--muted); margin: 10px 0 2px; line-height: 1.45; }

@media (max-width: 860px) { .in-passos { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 520px) { .in-bento2 { grid-template-columns: minmax(0, 1fr); } }
```
**`src/ui/components/inicio/index.js`** (arquivo novo, conteúdo completo):

```js
// Página de apresentação ("#/inicio", só no site): o que o sistema faz, como funciona, benefícios e perguntas.
// Botões: criar conta, entrar, experimentar sem conta. Todos levam ao app (e marcam "já usou", ver ui/router.js).
import html from './template.html';
import './inicio.css';
import bancada from '../shared/bancada.html';
import Bento from '../bento/index.js';
import { $ } from '../../dom.js';
import { recursos } from '../../recursos.js';

export default {
  template: () => html.replace('<!--BANCADA-->', () => bancada).replace('<!--BENTO-->', () => Bento.template()),
  mount(ctx) {
    if (!$('inicio')) return; // artefato do claude.ai: não tem a página
    const temConta = !!ctx.auth; // sem login disponível (ex.: Supabase não carregou), só "Experimentar"
    const exige = temConta && recursos().exigirConta;

    $('inAvisoConta').textContent = exige
      ? 'Sem conta você monta e calcula planos para conhecer. Para baixar os arquivos, salvar projetos e usar o estoque, crie sua conta grátis.'
      : 'Pode usar sem conta: o que você monta fica guardado neste navegador.';

    let logado = false;
    const sync = () => {
      $('inCriar').hidden = !temConta || logado;
      $('inEntrar').hidden = !temConta || logado;
      $('inAbrir').hidden = !logado;
    };
    ctx.bus.on('auth', ({ usuario }) => { logado = !!usuario; sync(); });
    sync();

    const irApp = () => ctx.actions.irPara('app');
    $('inExperimentar').addEventListener('click', irApp);
    $('inAbrir').addEventListener('click', irApp);
    $('inCriar').addEventListener('click', () => { irApp(); ctx.actions.abrirConta('criar'); });
    $('inEntrar').addEventListener('click', () => { irApp(); ctx.actions.abrirConta('entrar'); });
  },
};
```

Sobre o texto (por que está assim):
- "16 chapas … 289 peças em 4 materiais … mesmo número de chapas que um otimizador comercial": é o resultado registrado
  em `docs/plano/IMPLEMENTADO.md` ("Extra — Chapas repetidas"). Não citar o nome do concorrente na página.
- "Criar a conta é grátis": é o que vale hoje. Não prometer "grátis para sempre".
- Pergunta "Onde ficam os meus dados?" (`#inFaqDados`): verdade de hoje (navegador). **Trocar quando a Parte 9 entrar**
  (seção 8).
- "O sistema avisa medida inválida e peça maior que a chapa": é o que existe. Não citar "unidade trocada" (é o R7, ainda não feito).

### Etapa D — Janela de conta: abrir com motivo, fechar e texto "sem conta"

**`src/ui/components/account/template.html`** (alteração, diff em relação ao `b5789d9`):

```diff
diff --git a/src/ui/components/account/template.html b/src/ui/components/account/template.html
index 0e5e9c8..b973f49 100644
--- a/src/ui/components/account/template.html
+++ b/src/ui/components/account/template.html
@@ -1,8 +1,9 @@
 <dialog id="contaDlg" class="conta" aria-labelledby="contaTit">
   <div class="row between"><h2 id="contaTit">Entrar</h2><button type="button" id="contaFecha" aria-label="Fechar">Fechar</button></div>
+  <p id="ctAviso" class="conta-aviso" role="status" hidden></p>
 
   <div data-v="entrar">
-    <p class="hint">Sem entrar, o app continua funcionando: os dados ficam só neste navegador.</p>
+    <p class="hint" id="ctSemConta">Sem entrar, o app continua funcionando: os dados ficam só neste navegador.</p>
     <button type="button" id="ctGoogle" class="conta-google">Entrar com Google</button>
     <div class="conta-ou"><span>ou com e-mail</span></div>
     <div class="seg sm" role="group" aria-label="Como entrar">
```
**`src/ui/components/account/account.css`** (alteração, diff em relação ao `b5789d9`):

```diff
diff --git a/src/ui/components/account/account.css b/src/ui/components/account/account.css
index 8183a63..308bef1 100644
--- a/src/ui/components/account/account.css
+++ b/src/ui/components/account/account.css
@@ -15,3 +15,7 @@ dialog.conta .msg.ok, dialog.conta .msg.err { padding: 10px 14px; border-radius:
 dialog.conta .msg.ok { background: color-mix(in srgb, var(--ok) 14%, transparent); }
 dialog.conta .msg.err { background: color-mix(in srgb, var(--err) 14%, transparent); }
 dialog.conta [data-v="conta"] .row { margin-top: 12px; gap: 10px; }
+
+/* Parte 13: motivo de pedir a conta ("Para baixar o PDF do plano, entre ou crie sua conta grátis.") */
+dialog.conta .conta-aviso { margin: 12px 0 0; padding: 10px 14px; border-radius: 14px; background: var(--brass-soft); font-weight: 600; line-height: 1.4; }
+dialog.conta .conta-aviso[hidden] { display: none; }
```
**`src/ui/components/account/index.js`** (alteração, diff em relação ao `b5789d9`):

```diff
diff --git a/src/ui/components/account/index.js b/src/ui/components/account/index.js
index 7982e20..621bd79 100644
--- a/src/ui/components/account/index.js
+++ b/src/ui/components/account/index.js
@@ -4,6 +4,7 @@ import html from './template.html';
 import './account.css';
 import { validarEmail, validarSenha, validarCodigo, erroNoEndereco, ESPERA_REENVIO_S } from '../../../domain/auth.js';
 import { $ } from '../../dom.js';
+import { recursos } from '../../recursos.js';
 
 const TITULO = { entrar: 'Entrar', criar: 'Criar conta', recuperar: 'Esqueci a senha', nova: 'Senha nova', conta: 'Sua conta' };
 
@@ -40,6 +41,15 @@ export default {
 
     btn.hidden = false;
     btn.addEventListener('click', () => abrir());
+
+    // Parte 13: a página de apresentação e a conta obrigatória abrem a janela por aqui, com ou sem um aviso no topo
+    ctx.actions.abrirConta = (v, aviso) => {
+      abrir(v);
+      $('ctAviso').textContent = aviso || ''; $('ctAviso').hidden = !aviso;
+    };
+    ctx.actions.fecharConta = () => { if (dlg.open) dlg.close(); };
+    dlg.addEventListener('close', () => { $('ctAviso').hidden = true; $('ctAviso').textContent = ''; });
+    if (recursos().exigirConta) $('ctSemConta').textContent = 'Sem conta você monta e calcula planos. Para baixar, salvar projetos e usar o estoque, entre ou crie sua conta grátis.';
     $('contaFecha').addEventListener('click', () => dlg.close());
     dlg.addEventListener('click', (e) => { const ir = e.target.closest('[data-ir]'); if (ir) ver(ir.dataset.ir); });
```

- `ctx.actions.abrirConta(view, aviso)`: `view` é `'entrar'` ou `'criar'` (as mesmas de `TITULO`); `aviso` é opcional.
- O aviso some sempre que a janela fecha (evento `close`), então abrir pelo botão "Entrar" da barra nunca mostra aviso velho.
- Sem login disponível (`ctx.auth` nulo) o componente sai antes (`return` já existente) e essas ações **não existem**;
  por isso a apresentação esconde "Criar conta" e "Entrar" nesse caso e o porteiro não liga.

**`src/ui/components/nav/template.html`** (alteração, diff em relação ao `b5789d9`):

```diff
diff --git a/src/ui/components/nav/template.html b/src/ui/components/nav/template.html
index 67e851e..9bbf686 100644
--- a/src/ui/components/nav/template.html
+++ b/src/ui/components/nav/template.html
@@ -8,6 +8,7 @@
       <a href="#montar" data-sec="montar">Montar plano</a>
       <a href="#t-res" data-sec="resultado" id="navRes" aria-disabled="true" title="Calcule o plano para ver o resultado">Resultado</a>
       <a href="#sobras" data-sec="sobras">Estoque</a>
+      <a href="#/app" id="navApp">Abrir o app</a>
       <span class="pill" id="navStore" title="Onde seus dados ficam guardados"><i></i><span id="navStoreTxt">Neste navegador</span></span>
       <button type="button" id="btnConta" class="nav-conta" hidden>Entrar</button>
     </nav>
```

O link `#navApp` aparece só na apresentação (regra em `inicio.css`).

### Etapa E — Conta obrigatória (o "porteiro")

Um único ouvinte de clique na **fase de captura** do `document` (o 3º argumento `true`), que roda antes dos componentes.
Assim nenhum componente precisa ser alterado. **Validado no navegador:** com ele, o PDF não baixa, o projeto não salva e
a sobra do zoom não entra no estoque; liberado, a mesma ação funciona (inclusive botões criados depois, por `innerHTML`).

**`src/ui/components/conta-obrigatoria/acoes.js`** (arquivo novo, conteúdo completo):

```js
// Ações que pedem conta quando a conta obrigatória está ligada (Parte 13).
// `nome` completa as frases "Para <nome>, entre ou crie sua conta grátis." e "Agora é só <nome> de novo."
// Ficam LIVRES (não estão aqui): montar a lista, calcular, aprovar, comparar versões, editar o plano, recomeçar,
// modelos de móvel, juntar projetos e o backup (exportar e importar: os dados são da pessoa).
export const ACOES_COM_CONTA = [
  { seletor: '#exportBox button[data-exp="png"]', nome: 'baixar a imagem da chapa' },
  { seletor: '#exportBox button[data-exp="pdf"]', nome: 'baixar o PDF do plano' },
  { seletor: '#exportBox button[data-exp="etqpdf"]', nome: 'gerar as etiquetas em PDF' },
  { seletor: '#exportBox button[data-exp="etq"]', nome: 'baixar as etiquetas' },
  { seletor: '#exportBox button[data-exp="cortes"]', nome: 'baixar a lista de cortes' },
  { seletor: '#exportBox button[data-exp="pecas"]', nome: 'baixar a lista de peças' },
  { seletor: '#exportBox button[data-exp="relat"]', nome: 'baixar o relatório' },
  { seletor: '#btnEstoque', nome: 'atualizar o estoque' },
  { seletor: '#btnSalvarProj', nome: 'salvar o projeto' },
  { seletor: '#btnProposta', nome: 'baixar a proposta' },
  { seletor: '#btnSobra', nome: 'guardar sobras no estoque' },
  { seletor: '#btnSobraPdf', nome: 'baixar o estoque em PDF' },
  { seletor: '#zoomList button[data-guardar]', nome: 'guardar a sobra no estoque' },
  { seletor: '#btnIns', nome: 'guardar itens no estoque' },
  { seletor: '#btnCmpCsv', nome: 'baixar a lista de compras' },
  { seletor: '#btnCmpPdf', nome: 'baixar a lista de compras' },
  { seletor: '#btnRelCsv', nome: 'baixar o relatório do mês' },
  { seletor: '#btnRelPdf', nome: 'baixar o relatório do mês' },
];

/** O botão protegido que recebeu o clique (o clique pode cair num ícone ou texto dentro dele). */
export function acaoDoElemento(alvo) {
  if (!alvo || typeof alvo.closest !== 'function') return null;
  for (const a of ACOES_COM_CONTA) {
    const el = alvo.closest(a.seletor);
    if (el) return { el, nome: a.nome };
  }
  return null;
}
```
**`src/ui/components/conta-obrigatoria/index.js`** (arquivo novo, conteúdo completo):

```js
// Conta obrigatória para baixar, salvar e usar o estoque (Parte 13). Só no site e só se ligada (ui/recursos.js).
//
// Um "porteiro" só: escuta os cliques na fase de captura do documento, que vem ANTES dos componentes.
// Sem login: barra o clique, abre a janela de conta com o motivo e lembra o botão. Entrou: clica no botão por você.
// Analogia: a catraca da obra. Ninguém precisa mexer em cada máquina; quem passa pela catraca usa todas.
//
// Atenção: é uma trava de tela, não de segurança. Quem entende de código contorna. Limite de plano pago,
// quando existir, tem que ser conferido no servidor (Supabase), não aqui.
import { recursos } from '../../recursos.js';
import { acaoDoElemento } from './acoes.js';

const CHAVE = 'cortapramim-acao-pendente'; // sessionStorage: sobrevive à ida e volta do login com Google

const lembrar = (nome) => { try { sessionStorage.setItem(CHAVE, nome); } catch (e) { /* sem armazenamento */ } };
const lembrado = () => { try { const v = sessionStorage.getItem(CHAVE); sessionStorage.removeItem(CHAVE); return v; } catch (e) { return null; } };

export default {
  template: () => '',
  mount(ctx) {
    if (!ctx.auth || !recursos().exigirConta) return;
    let usuario = null, pendente = null;

    document.addEventListener('click', (ev) => {
      if (usuario) return;
      const achou = acaoDoElemento(ev.target);
      if (!achou) return;
      ev.preventDefault(); ev.stopImmediatePropagation();
      pendente = achou.el; lembrar(achou.nome);
      ctx.actions.abrirConta('entrar', 'Para ' + achou.nome + ', entre ou crie sua conta grátis. O que você montou continua aqui.');
    }, true);

    ctx.bus.on('auth', ({ usuario: u }) => {
      usuario = u || null;
      if (!usuario) return;
      const nome = lembrado();
      if (pendente && pendente.isConnected) { // entrou sem sair da página (senha, código): faz o que foi pedido
        const el = pendente; pendente = null;
        ctx.actions.fecharConta();
        setTimeout(() => el.click(), 0);
        return;
      }
      pendente = null;
      if (nome) ctx.msg('Pronto, você entrou. Agora é só ' + nome + ' de novo.', 'ok'); // voltou do Google
    });
  },
};
```

Regras:
- Para proteger um botão novo no futuro: acrescente uma linha em `ACOES_COM_CONTA`. `nome` começa com verbo no
  infinitivo (baixar, gerar, atualizar, salvar, guardar) e não termina com pontuação (o teste unitário cobra).
- **Ficam livres** (o teste unitário cobra que não estejam na lista): `#btnCalc`, `#btnAprovar`, `#btnCmp`, `#btnRecomecar`,
  `#btnLimpar`, `#btnBkExp`, `#btnBkImp`, `#btnNovoProj`. Backup fica livre de propósito: os dados são da pessoa.
- Não existe atalho de teclado que salve sem clique (conferido em 06/11/2026); se um dia existir, ele precisa checar a conta também.

### Etapa F — Ligar tudo no app

**`src/ui/app.js`** (alteração, diff em relação ao `b5789d9`):

```diff
diff --git a/src/ui/app.js b/src/ui/app.js
index 986c12f..9c9bc80 100644
--- a/src/ui/app.js
+++ b/src/ui/app.js
@@ -21,12 +21,19 @@ import Datalists from './components/shared/datalists.js';
 import Dock from './components/nav/Dock.js';
 import Stock from './components/stock/Stock.js';
 import { secHeader } from './templates.js';
+import Inicio from './components/inicio/index.js';
+import ContaObrigatoria from './components/conta-obrigatoria/index.js';
+import { recursos } from './recursos.js';
+import { criarRoteador } from './router.js';
 
-const FOOTER = '<footer class="foot">Confira sempre as medidas reais da chapa com o fornecedor antes de cortar.</footer>';
+const REC = recursos(); // Parte 13: no site, página de apresentação (e conta obrigatória, se ligada)
+const FOOTER = '<footer class="foot">Confira sempre as medidas reais da chapa com o fornecedor antes de cortar.' +
+  (REC.paginaInicial ? ' · <a href="#/inicio">Sobre o Corta pra Mim</a>' : '') + '</footer>';
 
 /** Cada item tem template() (HTML) e mount(ctx) (liga eventos). A ordem aqui é a ordem na página. */
 const PAGINA = [
-  { c: Hero }, { c: Bento },
+  // a vitrine (Hero e Bento) mora na página de apresentação quando ela existe; no artefato fica no topo do app
+  ...(REC.paginaInicial ? [{ html: '<h1 class="sr-only">Corta pra Mim: plano de corte de MDF</h1>' }] : [{ c: Hero }, { c: Bento }]),
   { html: secHeader('montar', 'Monte o plano', 'Do caderno para o corte.', 'Nomeie o projeto, descreva cada chapa com suas peças e calcule. Tudo que você digita fica guardado.') },
   { c: ProjectPanel }, { c: ModelsPanel }, { c: EntryPanel },
   { c: ResultPanel },
@@ -34,7 +41,7 @@ const PAGINA = [
   { c: AccountPanel },
   { html: FOOTER },
 ];
-const todos = [Nav, ...PAGINA.filter((p) => p.c).map((p) => p.c), Stock, Dock, Datalists];
+const todos = [Nav, ...PAGINA.filter((p) => p.c).map((p) => p.c), Stock, Dock, Datalists, Inicio, ContaObrigatoria];
 
 export async function startApp(root) {
   const ctx = createContext();
@@ -43,9 +50,11 @@ export async function startApp(root) {
   const { state, bus, pers } = ctx;
 
   // eslint-disable-next-line no-unsanitized/property -- revisado: textos com esc(), números vêm do motor ou de sanitize.js
-  root.innerHTML = Nav.template(ctx) + '<main class="wrap" id="topo">' +
+  root.innerHTML = Nav.template(ctx) + (REC.paginaInicial ? Inicio.template(ctx) : '') + '<main class="wrap" id="topo">' +
     PAGINA.map((p) => (p.c ? p.c.template(ctx) : p.html)).join('\n') + Datalists.template() + '</main>' + Dock.template();
   todos.forEach((c) => c.mount(ctx));
+  // a página certa aparece já, antes de carregar dados (sem piscar o app na primeira visita)
+  ctx.actions.irPara = criarRoteador(ctx, { paginaInicial: REC.paginaInicial }).irPara;
 
   detectarDownloads((dl) => { state.dl = dl; bus.emit('dl'); });
```

- No site, a vitrine (Hero e Bento) sai do topo do app e vai para a apresentação; no lugar entra um `<h1>` só para
  leitor de tela. No artefato, nada muda.
- `Inicio` e `ContaObrigatoria` são montados **por último** (depois da conta), e o roteador é criado logo depois de montar
  tudo, **antes** de qualquer `await`: a página certa aparece sem piscar o app.

### Etapa G — Testes

1. `tests/e2e/helpers.js`: `DIST` passa a terminar em `#/app` (os testes do app entram direto no app); `DIST_INICIO` é o
   site sem rota; a opção `recursos` deixa a conta obrigatória **desligada por padrão nos testes** (assim, ligar no site
   não quebra os testes antigos que baixam arquivos). `recursos: null` usa o padrão real do build.
**`tests/e2e/helpers.js`** (alteração, diff em relação ao `b5789d9`):

```diff
diff --git a/tests/e2e/helpers.js b/tests/e2e/helpers.js
index 4d12cf3..f8e68f8 100644
--- a/tests/e2e/helpers.js
+++ b/tests/e2e/helpers.js
@@ -3,7 +3,10 @@ import { fileURLToPath } from 'node:url';
 import { dirname, join } from 'node:path';
 
 const raiz = join(dirname(fileURLToPath(import.meta.url)), '../..');
-export const DIST = 'file://' + join(raiz, 'dist/cortapramim.html');
+// Parte 13: no site, a primeira visita abre a página de apresentação; os testes do app entram direto em "#/app".
+export const DIST = 'file://' + join(raiz, 'dist/cortapramim.html') + '#/app';
+/** O site sem rota no endereço: na primeira visita mostra a página de apresentação. */
+export const DIST_INICIO = 'file://' + join(raiz, 'dist/cortapramim.html');
 /** Versão do claude.ai (sem CSP): os testes de injeção usam esta, para que um escape faltando apareça de verdade. */
 export const DIST_ARTEFATO = 'file://' + join(raiz, 'dist/cortapramim-artefato.html');
 
@@ -11,14 +14,17 @@ export const DIST_ARTEFATO = 'file://' + join(raiz, 'dist/cortapramim-artefato.h
  * Abre o app construído (dist, o mesmo arquivo do site, com CSP) sem rede.
  * Todas as bibliotecas já vêm embutidas; fontes e qualquer outro endereço externo são bloqueados.
  * `violacoesCsp` junta os avisos de CSP do console: o teste de segurança espera que só apareçam nos ataques.
+ * `recursos` (Parte 13): por padrão a conta obrigatória fica DESLIGADA nos testes, para que ligar no site
+ * (EXIGIR_CONTA_NO_SITE) não quebre os testes que baixam arquivos. `recursos: null` usa o padrão real do build.
  */
-export async function abrirApp({ viewport, antes, arquivo = DIST } = {}) {
+export async function abrirApp({ viewport, antes, arquivo = DIST, recursos = { exigirConta: false } } = {}) {
   const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ['--no-proxy-server'] });
   const page = await browser.newPage(viewport ? { viewport } : undefined);
   const erros = [], violacoesCsp = [];
   page.on('pageerror', (e) => erros.push(e.message));
   page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) violacoesCsp.push(m.text()); });
   await page.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
+  if (recursos) await page.addInitScript((r) => { window.__cortaRecursos = r; }, recursos);
   if (antes) await antes(page);
   await page.goto(arquivo);
   await page.waitForFunction(() => window.__pc && window.__pc.state.res, null, { timeout: 30000 });
```

2. O Supabase falso do teste de login vira um ajudante compartilhado (mesmo código, só movido e exportado):

**`tests/e2e/supabase-falso.js`** (arquivo novo, conteúdo completo):

```js
// Supabase falso para os testes no navegador (sem rede, sem credenciais reais). Usado com page.addInitScript(instalarFalso).
// Usuário pronto: gilmar@teste.com / serragem123. Código por e-mail: 123456.
// Servidor de login falso: guarda usuários na memória e avisa as mudanças como o Supabase.
export function instalarFalso() {
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
```
**`tests/e2e/fases/fase20.test.js`** (alteração, diff em relação ao `b5789d9`):

```diff
diff --git a/tests/e2e/fases/fase20.test.js b/tests/e2e/fases/fase20.test.js
index 81ea4f8..2e3a644 100644
--- a/tests/e2e/fases/fase20.test.js
+++ b/tests/e2e/fases/fase20.test.js
@@ -2,29 +2,7 @@
 import { test, before, after } from 'node:test';
 import assert from 'node:assert/strict';
 import { abrirApp } from '../helpers.js';
-
-// Servidor de login falso: guarda usuários na memória e avisa as mudanças como o Supabase.
-function instalarFalso() {
-  const usuarios = { 'gilmar@teste.com': { senha: 'serragem123' } }, ouvintes = [], log = [];
-  let sessao = null; const CODIGO = '123456';
-  const avisar = (ev) => ouvintes.forEach((cb) => cb(ev, sessao));
-  const entrar = (email) => { sessao = { user: { id: 'u-' + email, email } }; avisar('SIGNED_IN'); return { data: { session: sessao, user: sessao.user }, error: null }; };
-  const erro = (code, message) => ({ data: {}, error: { code, message } });
-  window.__fakeLog = log;
-  window.__fakeEmit = (ev) => avisar(ev);
-  window.__cortaSupabaseFake = { auth: {
-    async getSession() { return { data: { session: sessao }, error: null }; },
-    onAuthStateChange(cb) { ouvintes.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
-    async signInWithPassword({ email, password }) { log.push(['senha', email]); const u = usuarios[email]; return u && u.senha === password ? entrar(email) : erro('invalid_credentials', 'Invalid login credentials'); },
-    async signUp({ email, password }) { log.push(['cadastro', email]); if (usuarios[email]) return erro('user_already_exists', 'User already registered'); usuarios[email] = { senha: password }; return { data: { user: { id: 'n' }, session: null }, error: null }; },
-    async signInWithOtp({ email }) { log.push(['otp', email]); return { data: {}, error: null }; },
-    async verifyOtp({ email, token }) { log.push(['verificar', email, token]); return token === CODIGO ? entrar(email) : erro('otp_expired', 'Token has expired or is invalid'); },
-    async resetPasswordForEmail(email) { log.push(['recuperar', email]); return { data: {}, error: null }; },
-    async updateUser({ password }) { log.push(['nova', password.length]); return { data: {}, error: null }; },
-    async signInWithOAuth(o) { log.push(['oauth', o.provider]); return { data: {}, error: null }; },
-    async signOut() { log.push(['sair']); sessao = null; avisar('SIGNED_OUT'); return { error: null }; },
-  } };
-}
+import { instalarFalso } from '../supabase-falso.js';
 
 let app, page;
 before(async () => {
```

3. Testes novos:

**`tests/unit/fases/fase25.test.js`** (arquivo novo, conteúdo completo):

```js
// Parte 13 (fase 25): recursos por versão do app, rotas por "#/" e a lista de ações que pedem conta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolverRecursos } from '../../../src/domain/recursos.js';
import { ROTAS, rotaDoEndereco, rotaInicial } from '../../../src/domain/rotas.js';
import { ACOES_COM_CONTA } from '../../../src/ui/components/conta-obrigatoria/acoes.js';
import { EXIGIR_CONTA_NO_SITE, recursos } from '../../../src/ui/recursos.js';

test('recursos: no artefato nada liga, nem pedindo', () => {
  assert.deepEqual(resolverRecursos({ noSite: false, exigirContaPadrao: true }), { paginaInicial: false, exigirConta: false });
  assert.deepEqual(resolverRecursos({ noSite: false, override: { paginaInicial: true, exigirConta: true }, exigirContaPadrao: true }), { paginaInicial: false, exigirConta: false });
});

test('recursos: no site, página inicial ligada e conta obrigatória pelo padrão', () => {
  assert.deepEqual(resolverRecursos({ noSite: true, exigirContaPadrao: false }), { paginaInicial: true, exigirConta: false });
  assert.deepEqual(resolverRecursos({ noSite: true, exigirContaPadrao: true }), { paginaInicial: true, exigirConta: true });
});

test('recursos: override dos testes só com booleano de verdade', () => {
  assert.deepEqual(resolverRecursos({ noSite: true, override: { exigirConta: true }, exigirContaPadrao: false }), { paginaInicial: true, exigirConta: true });
  assert.deepEqual(resolverRecursos({ noSite: true, override: { paginaInicial: false }, exigirContaPadrao: false }), { paginaInicial: false, exigirConta: false });
  for (const lixo of [{ exigirConta: 'true' }, { exigirConta: 1 }, 'exigirConta', [true], null, 42]) {
    assert.equal(resolverRecursos({ noSite: true, override: lixo, exigirContaPadrao: false }).exigirConta, false, JSON.stringify(lixo));
  }
});

test('recursos fora do build (Node): é como o artefato', () => {
  assert.deepEqual(recursos(), { paginaInicial: false, exigirConta: false });
  assert.equal(typeof EXIGIR_CONTA_NO_SITE, 'boolean');
});

test('rotaDoEndereco: só "#/<rota conhecida>"', () => {
  assert.deepEqual(ROTAS, ['inicio', 'app']);
  assert.equal(rotaDoEndereco('#/app'), 'app');
  assert.equal(rotaDoEndereco('#/inicio'), 'inicio');
  assert.equal(rotaDoEndereco('#/app/qualquer'), 'app');
  assert.equal(rotaDoEndereco('#/inicio?x=1'), 'inicio');
  for (const h of ['', '#', '#/', '#/APP', '#/apps', '#app', '#montar', '#t-res', '#topo', '#error=access_denied&error_code=otp_expired', '#/serra/abc', null, undefined]) {
    assert.equal(rotaDoEndereco(h), null, String(h));
  }
});

test('rotaInicial: artefato, rota no endereço, já usou, primeira visita', () => {
  assert.equal(rotaInicial({ hash: '#/inicio', paginaInicial: false, jaUsou: false }), 'app');
  assert.equal(rotaInicial({ hash: '#/inicio', paginaInicial: true, jaUsou: true }), 'inicio');
  assert.equal(rotaInicial({ hash: '#/app', paginaInicial: true, jaUsou: false }), 'app');
  assert.equal(rotaInicial({ hash: '', paginaInicial: true, jaUsou: true }), 'app');
  assert.equal(rotaInicial({ hash: '#montar', paginaInicial: true, jaUsou: true }), 'app');
  assert.equal(rotaInicial({ hash: '', paginaInicial: true, jaUsou: false }), 'inicio');
  assert.equal(rotaInicial({ hash: '#error=x', paginaInicial: true, jaUsou: false }), 'inicio');
});

test('ações que pedem conta: seletores únicos e frases que completam "Para ..."', () => {
  const sel = ACOES_COM_CONTA.map((a) => a.seletor);
  assert.equal(new Set(sel).size, sel.length);
  for (const a of ACOES_COM_CONTA) {
    assert.match(a.nome, /^(baixar|gerar|atualizar|salvar|guardar) /, a.seletor);
    assert.doesNotMatch(a.nome, /[.!?]$/);
  }
  // o que tem que continuar livre
  for (const livre of ['#btnCalc', '#btnAprovar', '#btnCmp', '#btnRecomecar', '#btnLimpar', '#btnBkExp', '#btnBkImp', '#btnNovoProj']) {
    assert.equal(sel.includes(livre), false, livre); // seletor inteiro: "#btnCmp" não é "#btnCmpCsv"
  }
});
```
**`tests/e2e/fases/fase25-apresentacao.test.js`** (arquivo novo, conteúdo completo):

```js
// Parte 13 (fase 25): página de apresentação no site, rotas por "#/" e o artefato sem mudança.
import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp, DIST, DIST_INICIO, DIST_ARTEFATO } from '../helpers.js';

const tela = (page) => page.evaluate(() => {
  const vis = (id) => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none' && !e.hidden; };
  return {
    pagina: document.body.dataset.pagina, inicio: vis('inicio'), app: vis('topo'), dock: vis('dock'),
    navApp: vis('navApp'), navMontar: getComputedStyle(document.querySelector('.nav-links a[data-sec="montar"]')).display !== 'none',
    conta: vis('btnConta'), criar: vis('inCriar'), entrar: vis('inEntrar'), abrir: vis('inAbrir'),
    hash: location.hash, h1: document.querySelector('#inicio h1') ? document.querySelector('#inicio h1').textContent : null,
    heroApp: !!document.getElementById('heroEx'), jaUsou: localStorage.getItem('cortapramim-ja-usou'),
  };
});

test('primeira visita ao site: apresentação; o app fica escondido; o endereço não muda', async () => {
  const app = await abrirApp({ arquivo: DIST_INICIO });
  const t = await tela(app.page);
  assert.equal(t.pagina, 'inicio');
  assert.equal(t.inicio, true); assert.equal(t.app, false); assert.equal(t.dock, false);
  assert.match(t.h1, /Menos chapas/);
  assert.equal(t.navApp, true); assert.equal(t.navMontar, false); assert.equal(t.conta, true);
  assert.equal(t.criar, true); assert.equal(t.entrar, true); assert.equal(t.abrir, false);
  assert.equal(t.hash, '');
  assert.equal(t.heroApp, false, 'no site a vitrine antiga sai do app');
  assert.match(await app.page.innerText('#inicio'), /Pode usar sem conta/);
  assert.deepEqual(app.erros, []);
  await app.fechar();
});

test('"Experimentar sem conta" abre o app; depois disso o site abre direto no app', async () => {
  const app = await abrirApp({ arquivo: DIST_INICIO });
  const { page } = app;
  await page.click('#inExperimentar');
  let t = await tela(page);
  assert.equal(t.pagina, 'app'); assert.equal(t.app, true); assert.equal(t.inicio, false);
  assert.equal(t.hash, '#/app'); assert.equal(t.jaUsou, 'true');
  assert.equal(t.navApp, false); assert.equal(t.navMontar, true);
  await page.goto(DIST_INICIO); await page.waitForFunction(() => window.__pc && window.__pc.state);
  t = await tela(page);
  assert.equal(t.pagina, 'app', 'já usou: sem rota no endereço, abre no app');
  // "#/inicio" sempre mostra a apresentação, e o "voltar" do navegador volta para o app
  await page.click('footer.foot a[href="#/inicio"]');
  assert.equal((await tela(page)).pagina, 'inicio');
  await page.goBack();
  assert.equal((await tela(page)).pagina, 'app');
  // âncora da página não é rota: continua no app
  await page.click('.nav-links a[data-sec="montar"]');
  assert.equal((await tela(page)).pagina, 'app');
  assert.deepEqual(app.erros, []);
  await app.fechar();
});

test('"Criar conta grátis" e "Entrar" abrem o app com a janela de conta', async () => {
  const app = await abrirApp({ arquivo: DIST_INICIO });
  const { page } = app;
  await page.click('#inCriar');
  await page.waitForSelector('#contaDlg[open]');
  assert.equal((await tela(page)).pagina, 'app');
  assert.equal(await page.innerText('#contaTit'), 'Criar conta');
  assert.equal(await page.isVisible('#ctAviso'), false);
  await page.click('#contaFecha');
  await page.click('footer.foot a[href="#/inicio"]');
  await page.click('#inEntrar');
  await page.waitForSelector('#contaDlg[open]');
  assert.equal(await page.innerText('#contaTit'), 'Entrar');
  await app.fechar();
});

test('celular (360 e 390 px): apresentação sem rolagem lateral', async () => {
  for (const width of [360, 390]) {
    const app = await abrirApp({ arquivo: DIST_INICIO, viewport: { width, height: 800 } });
    const r = await app.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    assert.equal(r.sw, r.cw, 'largura ' + width);
    await app.fechar();
  }
});

test('"#/app" no endereço abre no app mesmo na primeira visita (é o que os outros testes usam)', async () => {
  const app = await abrirApp({ arquivo: DIST });
  const t = await tela(app.page);
  assert.equal(t.pagina, 'app'); assert.equal(t.inicio, false);
  await app.fechar();
});

test('artefato do claude.ai: sem página de apresentação, vitrine no topo do app, como antes', async () => {
  const app = await abrirApp({ arquivo: DIST_ARTEFATO });
  const { page } = app;
  assert.equal(await page.$('#inicio'), null);
  const t = await tela(page);
  assert.equal(t.pagina, 'app'); assert.equal(t.app, true); assert.equal(t.heroApp, true); assert.equal(t.navApp, false);
  await page.evaluate(() => { location.hash = '#/inicio'; });
  await page.waitForTimeout(100);
  assert.equal((await tela(page)).pagina, 'app', 'no artefato "#/inicio" não existe');
  assert.equal(await page.$('footer.foot a[href="#/inicio"]'), null);
  assert.deepEqual(app.erros, []);
  await app.fechar();
});
```
**`tests/e2e/fases/fase25-conta.test.js`** (arquivo novo, conteúdo completo):

```js
// Parte 13 (fase 25): conta obrigatória para baixar, salvar e usar o estoque.
// Ligada aqui pelo window.__cortaRecursos (no site ela vem desligada até os pré-requisitos ficarem prontos).
import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp, DIST_ARTEFATO } from '../helpers.js';
import { instalarFalso } from '../supabase-falso.js';
import { ACOES_COM_CONTA } from '../../../src/ui/components/conta-obrigatoria/acoes.js';
import { EXIGIR_CONTA_NO_SITE } from '../../../src/ui/recursos.js';

const LIGADA = { exigirConta: true };
const falso = (page) => page.addInitScript(instalarFalso);

async function aprovar(page) {
  await page.click('#btnAprovar');
  await page.waitForSelector('#exportBox:not([hidden])');
}
const semDownload = async (page, fn, ms = 1500) => {
  let baixou = false; const h = () => { baixou = true; };
  page.on('download', h); await fn(); await page.waitForTimeout(ms); page.off('download', h);
  return !baixou;
};
const entrarComSenha = async (page) => {
  await page.fill('#ctEmail', 'gilmar@teste.com'); await page.fill('#ctSenha', 'serragem123');
  await page.click('#ctFormSenha button[type="submit"]');
};

test('sem conta: calcula e aprova; baixar o PDF pede a conta e não baixa', async () => {
  const app = await abrirApp({ recursos: LIGADA, antes: falso });
  const { page } = app;
  assert.ok(await page.evaluate(() => !!window.__pc.state.res), 'calculou sem conta');
  await aprovar(page);
  assert.ok(await semDownload(page, () => page.click('#exportBox button[data-exp="pdf"]')), 'não pode baixar sem conta');
  assert.equal(await page.isVisible('#contaDlg'), true);
  assert.equal(await page.innerText('#contaTit'), 'Entrar');
  assert.equal(await page.innerText('#ctAviso'), 'Para baixar o PDF do plano, entre ou crie sua conta grátis. O que você montou continua aqui.');
  assert.match(await page.innerText('#ctSemConta'), /Para baixar, salvar projetos e usar o estoque/);
  await page.click('#contaFecha');
  assert.equal(await page.isVisible('#ctAviso'), false, 'o aviso some ao fechar');
  assert.deepEqual(app.erros, []);
  await app.fechar();
});

test('sem conta: todas as ações da lista abrem a janela e não mudam nada', async () => {
  const app = await abrirApp({ recursos: LIGADA, antes: falso });
  const { page } = app;
  await aprovar(page);
  await page.evaluate(() => { document.querySelectorAll('details').forEach((d) => { d.open = true; }); });
  const antes = await page.evaluate(() => ({ p: window.__pc.state.projetos.length, e: window.__pc.state.estoque.length, i: window.__pc.state.insumos.length, est: window.__pc.state.estAtual }));
  let testadas = 0;
  for (const a of ACOES_COM_CONTA) {
    if (a.seletor.startsWith('#zoomList')) continue; // testado à parte (fica dentro da janela de zoom)
    const el = await page.$(a.seletor);
    if (!el || !(await el.isVisible())) continue;
    await el.scrollIntoViewIfNeeded();
    const ok = await semDownload(page, () => el.click(), 400);
    assert.ok(ok, a.seletor + ' baixou sem conta');
    assert.equal(await page.isVisible('#contaDlg'), true, a.seletor);
    assert.equal(await page.innerText('#ctAviso'), 'Para ' + a.nome + ', entre ou crie sua conta grátis. O que você montou continua aqui.');
    await page.click('#contaFecha');
    testadas++;
  }
  assert.ok(testadas >= 14, 'poucas ações visíveis: ' + testadas);
  // "Guardar como sobra" dentro do zoom da chapa
  await page.evaluate(() => document.querySelector('[data-zoom]').click());
  await page.waitForSelector('#zoomDlg[open]');
  const g = await page.$('#zoomList button[data-guardar]');
  if (g) { await g.click(); assert.equal(await page.isVisible('#contaDlg'), true); await page.click('#contaFecha'); }
  const depois = await page.evaluate(() => ({ p: window.__pc.state.projetos.length, e: window.__pc.state.estoque.length, i: window.__pc.state.insumos.length, est: window.__pc.state.estAtual }));
  assert.deepEqual(depois, antes);
  assert.deepEqual(app.erros, []);
  await app.fechar();
});

test('entrou pela janela: o que foi pedido acontece sozinho (baixa o PDF)', async () => {
  const app = await abrirApp({ recursos: LIGADA, antes: falso });
  const { page } = app;
  await aprovar(page);
  await page.click('#exportBox button[data-exp="pdf"]');
  await page.waitForSelector('#contaDlg[open]');
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), entrarComSenha(page)]);
  assert.match(d.suggestedFilename(), /\.pdf$/);
  assert.equal(await page.isVisible('#contaDlg'), false, 'a janela fecha sozinha');
  // com conta: salvar projeto vai direto
  await page.evaluate(() => { const e = document.getElementById('projNome'); e.value = 'Cozinha'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('#btnSalvarProj');
  assert.equal(await page.evaluate(() => window.__pc.state.projetos.length), 1);
  assert.equal(await page.isVisible('#contaDlg'), false);
  // saiu: volta a pedir
  await page.click('#btnConta'); await page.click('#ctSair');
  await page.waitForFunction(() => document.getElementById('btnConta').textContent === 'Entrar');
  assert.ok(await semDownload(page, () => page.click('#exportBox button[data-exp="pdf"]')));
  assert.equal(await page.isVisible('#contaDlg'), true);
  assert.deepEqual(app.erros, []);
  await app.fechar();
});

test('voltou do Google (página recarregada): avisa para clicar de novo', async () => {
  const app = await abrirApp({ recursos: LIGADA, antes: falso });
  const { page } = app;
  // simula a volta: o pedido ficou lembrado e o botão de antes não existe mais nesta página
  await page.evaluate(() => sessionStorage.setItem('cortapramim-acao-pendente', 'baixar o PDF do plano'));
  await page.click('#btnConta');
  await entrarComSenha(page);
  await page.waitForFunction(() => /Pronto, você entrou\. Agora é só baixar o PDF do plano de novo\./.test(document.getElementById('msg').textContent));
  assert.equal(await page.evaluate(() => sessionStorage.getItem('cortapramim-acao-pendente')), null);
  await app.fechar();
});

test('padrão do site (EXIGIR_CONTA_NO_SITE, sem override): desligada baixa sem conta; ligada pede a conta', async () => {
  const app = await abrirApp({ recursos: null, antes: falso });
  const { page } = app;
  await aprovar(page);
  if (EXIGIR_CONTA_NO_SITE) {
    assert.ok(await semDownload(page, () => page.click('#exportBox button[data-exp="pdf"]')));
    assert.equal(await page.isVisible('#contaDlg'), true);
  } else {
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('#exportBox button[data-exp="pdf"]')]);
    assert.match(d.suggestedFilename(), /\.pdf$/);
    assert.match(await page.evaluate(() => document.getElementById('ctSemConta').textContent), /Sem entrar, o app continua funcionando/);
  }
  await app.fechar();
});

test('artefato do claude.ai: nunca exige conta, mesmo pedindo', async () => {
  const app = await abrirApp({ arquivo: DIST_ARTEFATO, recursos: LIGADA, antes: falso });
  const { page } = app;
  await aprovar(page);
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('#exportBox button[data-exp="pdf"]')]);
  assert.match(d.suggestedFilename(), /\.pdf$/);
  assert.equal(await page.isVisible('#contaDlg'), false);
  await app.fechar();
});
```
### Etapa H — Documentação

1. `docs/plano/IMPLEMENTADO.md`: linha na tabela do topo (`| 13 Apresentação e conta para baixar e salvar | sim (data) | conta obrigatória desligada até a seção 8 da spec |`)
   e uma seção "Parte 13 — …  [x]" com um resumo do "Feito" (o que, onde, testes e números), no mesmo estilo das outras.
2. `docs/plano/A-FAZER.md`: tirar a Parte 13 de lá, deixando só o item "Ligar a conta obrigatória" (seção 8 desta spec)
   como pendente; no R26, anotar que o roteador já existe (`src/ui/router.js`) e que `app` vira as páginas novas.
3. `docs/ARQUITETURA.md`: em "Camadas", citar `domain/rotas.js` e `domain/recursos.js`; em "Pastas", `components/inicio`
   e `components/conta-obrigatoria`; uma linha sobre `<body data-pagina>` e os eventos `auth` e `rota`; em "Build",
   o `define` de `__CORTA_SITE__`.
4. `docs/SEGURANCA.md`: na lista "Ao mexer no código", acrescentar: "A conta obrigatória é trava de tela; qualquer limite
   que valha dinheiro é conferido no servidor (Supabase)".

## 6. Verificação (antes do commit)

```bash
npm run lint                 # limpo
npm run audit                # found 0 vulnerabilities
npm test                     # 170 testes, 0 falhas (eram 163)
npm run build && npm run build:artefato
npm run test:e2e             # 94 testes, 0 falhas (eram 82)
```

Também conferir à mão, abrindo `dist/cortapramim.html` num navegador limpo (janela anônima):
- [ ] Abre na apresentação; "Experimentar sem conta" leva ao app; recarregar continua no app.
- [ ] Link "Sobre o Corta pra Mim" no rodapé do app volta à apresentação; o "voltar" do navegador volta ao app.
- [ ] No celular (ou 360 px no navegador), a apresentação não rola para o lado.
- [ ] `dist/cortapramim-artefato.html` abre direto no app com a vitrine no topo, como antes.

Se publicar o artefato do claude.ai para testar: `npm run build:artefato` e publicar `dist/cortapramim-artefato.html`
no mesmo link (no artefato não há apresentação nem conta obrigatória; para ver a apresentação, use o site).

## 7. Armadilhas conhecidas (todas já resolvidas no código acima)

| Armadilha | O que acontecia | Como ficou |
|---|---|---|
| Escrever `#/app` no endereço ao abrir | O teste da fase 20 (link de erro do Supabase) espera o endereço vazio | O roteador só lê o endereço ao abrir |
| "Voltar" até o endereço sem `#` | Quem já usou ficava preso na apresentação | `hashchange` sem rota e sem âncora decide de novo |
| Âncoras `#montar`, `#sobras` | Seriam tratadas como rota | Só `#/<rota conhecida>` é rota |
| Ligar a conta no site quebrava testes antigos | Os testes que baixam arquivos cairiam na janela de conta | `abrirApp` desliga a conta por padrão; só os testes da Parte 13 ligam |
| Conta obrigatória sem login disponível | Travaria o app (nada baixa e não há como entrar) | O porteiro só liga com `ctx.auth`; no artefato, nunca |
| `#btnCmp` (Comparar) parecido com `#btnCmpCsv` | Um teste com `includes` acusava falso | Comparar o seletor inteiro |
| Elemento HTML com `id="__cortaRecursos"` (DOM clobbering) | Ligaria recursos sozinho | Só objeto comum vale; só booleano conta |
| Hero e apresentação com o mesmo SVG | Ids repetidos no DOM | Nunca aparecem juntos (site: só apresentação; artefato: só Hero) |

## 8. Ligar a conta obrigatória (etapa separada, depois)

Só ligar quando **todos** estes itens estiverem prontos (são do Bloco R de `A-FAZER.md`):
- [ ] **SMTP próprio** no Supabase (o padrão envia só 2 e-mails por hora; com conta obrigatória, o 3º cadastro da hora trava). (R16)
- [ ] **Supabase sem pausar**: plano pago, ou outra forma de não ficar 1 semana parado (o gratuito pausa e o login para). (R17)
- [ ] Migrações `001` e `002` aplicadas; URLs de retorno só com o endereço do site; CAPTCHA no login. (R16)
- [ ] **Dados na conta** (Parte 9 mínima / R15): sem isso, a conta não guarda nada para a pessoa. Se for ligar antes,
      decidir com o Gabriel e deixar isso claro no texto.
- [ ] **Termo de uso e privacidade** no cadastro (R20 a R22).

Para ligar:
1. `src/ui/recursos.js`: `export const EXIGIR_CONTA_NO_SITE = true;`
2. Se a Parte 9 já entrou: trocar o texto de `#inFaqDados` (apresentação) e o parágrafo `.hint` da tela "Sua conta"
   (`account/template.html`, "Por enquanto os seus dados continuam guardados só neste navegador…").
3. `npm run test:all`: deve passar sem mudar teste nenhum (validado: a suíte inteira passou com a constante em `true`;
   o teste "padrão do site" de `fase25-conta.test.js` se ajusta sozinho).
4. Commit, e o Gabriel faz o push.

## 9. Para lembrar depois

- R26 (páginas do app): acrescentar rotas em `ROTAS`; `app` pode virar um apelido de `montar`. O CSS em `inicio.css` mostra o
  padrão (`body[data-pagina=...]`).
- Parte 9b (link da serra): a rota `#/serra/<código>` já cabe no formato (`rotaDoEndereco` aceita `#/rota/qualquer-coisa`),
  mas precisa entrar em `ROTAS`.
- Métricas (R25): o evento `rota` do barramento é o ponto para contar quantos passam da apresentação para o app e quantos criam conta.
