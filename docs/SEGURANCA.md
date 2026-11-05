# Segurança

Como o Corta pra Mim se protege, o que cada trava impede e como testar. O que ainda falta está em
[plano/A-FAZER.md](plano/A-FAZER.md) (Parte 10b, itens S1 a S11).

Analogia geral: a oficina tem **três portas** (a tela, os arquivos que entram, o banco na nuvem) e cada uma tem
**duas trancas**. Se uma falhar, a outra segura.

## Quem pode atacar e como

| Quem | Por onde | O que quer | O que impede |
|---|---|---|---|
| Alguém que manda um **backup** ou **planilha** adulterados | arquivo aberto no app | rodar script na página (roubar a sessão, mexer nos dados) | fronteira (`sanitize.js`) + `esc()` na tela + CSP |
| **Membro da oficina** mal-intencionado (Parte 9) | dado gravado no banco que outro membro abre | o mesmo, na conta do dono | fronteira na leitura (`persistence.js`) + `esc()` + CSP; RLS limita o que ele grava |
| **Usuário de outra oficina** | API do Supabase direto, sem a tela | ler ou mudar dados alheios | RLS em todas as tabelas (`supabase/migrations`) |
| **Visitante sem login** | API do Supabase | qualquer leitura | `revoke all ... from anon` + RLS |
| **Dependência comprometida** (lib ou CDN) | código de terceiro na página | rodar código com acesso a tudo | bibliotecas embutidas com versão fixa (sem CDN), `npm audit` e Dependabot no CI |
| **Segredo vazado** no repositório | histórico do git | acesso total ao banco | só a chave publicável no código; gitleaks no CI; `.gitignore` de `.env` e chaves |
| **Arquivo gigante ou malformado** | backup, planilha, lista colada | travar o navegador | limites em `domain/limites.js`; leitores sem ReDoS |

## As trancas

1. **Fronteira de entrada** — `src/domain/sanitize.js` e `src/domain/limites.js`.
   Todo dado de fora passa por aqui antes de entrar no estado: backup, rascunho e listas do navegador, dados da conta,
   lista de peças aberta de arquivo. Texto: sem caracteres de controle, com limite. Número: finito e na faixa. Id, tipo,
   status: lista fechada. Plano calculado: só os campos de texto conhecidos são texto; o resto vira número.
   **Regra:** dado novo vindo de fora ganha uma função `sanitizarX` com teste em `tests/unit/seguranca/`.

2. **Escape na saída** — `esc()` (`src/core/text.js`) em todo texto que vai para `innerHTML`.
   O lint (`npm run lint`, regra `no-unsanitized`) recusa `innerHTML` com valor variável sem `esc()`.
   Os pontos já auditados têm `// eslint-disable-next-line no-unsanitized/property -- revisado: ...`.
   **Regra:** não copie esse comentário para código novo; escape o valor. Preferir `textContent` quando não precisa de HTML.

3. **CSP** — gerada em `scripts/build.mjs` com o hash do único script da página.
   Script injetado, `onerror="..."` e `javascript:` não rodam. Conexão só com o Supabase do projeto.
   O build do claude.ai (`--artefato`) sai sem CSP porque a plataforma injeta scripts próprios.

4. **RLS no banco** — `supabase/migrations/*.sql`. O banco recusa o que a tela não deveria fazer, mesmo se alguém
   mexer no JavaScript. Histórico é extrato: ninguém edita lançamento. JSON com limite de tamanho.

5. **Validação dos campos** — `domain/collect.js` e `domain/units.js` (`pIn`). Medida inválida para o cálculo com
   mensagem; preço inválido avisa e vale 0. Erro de corte não tem volta.

## Como testar

```
npm run lint            # regra de innerHTML, eval etc.
npm run test:seguranca  # fronteira, campos e injeção no navegador (todos os caminhos de entrada)
npm run test:rls        # RLS do banco (Postgres local)
npm run audit           # dependências com falha conhecida
```

O teste de injeção (`tests/e2e/seguranca/injecao.test.js`) coloca uma carga em todo campo de texto, numa lista colada,
numa planilha `.xlsx` real, num backup adulterado (inclusive o plano calculado e `__proto__`) e no rascunho do navegador.
Roda na versão **sem** CSP, para medir o escape de verdade; o último cenário confirma que a CSP do site barra o script.

**Teste de mutação** (para conferir que o teste pega o que diz pegar): desfaça uma proteção, rode
`npm run test:seguranca` e veja falhar. Feito em 05/11/2026 com dois casos: tirar o `esc` da espessura da sobra
(pego: "script executou em esp") e tirar a tipagem do plano (pego: ~250 pontos do desenho executaram script).

## Ao mexer no código
- Novo campo de texto na tela: `esc()` ao mostrar; `maxlength` igual ao limite de `limites.js` se for gravado.
- Novo dado guardado (navegador, conta, banco): passa por `sanitize.js` ao ler; limite no `check` do banco igual ao de `limites.js`.
- Nova biblioteca: `npm view <lib>` (mantida?), `npm audit` depois de instalar, versão fixa (`-E`), embutida no build.
- Nova tabela: RLS ligada, políticas por operação, teste em `supabase/tests/`.
- Nunca: `eval`, `new Function`, `document.write`, SQL montado com texto, chave secreta no front.
