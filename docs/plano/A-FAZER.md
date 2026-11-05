# Plano de implementação: o que falta fazer

Feito por partes. Cada parte é independente, cabe numa sessão e termina com testes passando e commit.
O que já foi entregue está em [IMPLEMENTADO.md](IMPLEMENTADO.md).

**Regras de sempre:** mudanças aditivas, sem mudar o comportamento das partes anteriores; testes novos em
`tests/unit/<assunto>/` e `tests/e2e/<assunto>/`; antes do commit, `npm run test:all` (lint, unitários, build, e2e)
e, se mexer em `supabase/`, `npm run test:rls`. Dado novo que vem de fora passa por `domain/sanitize.js`;
texto novo na tela passa por `esc()` (o lint cobra).
**Para retomar numa sessão nova:** "Leia docs/plano/A-FAZER.md e faça a Parte N".

## Ordem sugerida
1. **Pendências manuais** (abaixo): 30 minutos no painel do Supabase e no GitHub; destravam o resto.
2. **Parte 10b, itens S1 a S4**: fecham o que a Parte 10a deixou aberto no código.
3. **Parte 9 → 9b**: dados na nuvem e plano por link (o pedido do Gilmar). Os itens S5 a S7 andam junto.
4. **Parte 12** (hospedagem com cabeçalhos HTTP) e **Parte 11** (LGPD) **antes de abrir para qualquer pessoa de fora**.
5. Partes 5 e 6 quando houver arquivo real do Promob/SketchUp e o ERP escolhido.

---

## Pendências manuais (Gabriel)
- [ ] Supabase, **SQL Editor**: rodar `supabase/migrations/001_inicial.sql` e depois `002_endurecimento.sql`, uma vez cada, nessa ordem.
- [ ] Supabase, **Authentication > URL Configuration**: "Site URL" e "Redirect URLs" só com o endereço do app
      (o do GitHub Pages, provavelmente `https://gdev800.github.io/cortapramim/`; confira em Settings > Pages); apagar `localhost` quando não estiver testando.
- [ ] Supabase, **Authentication > Rate Limits**: conferir limites de e-mail e de tentativas de login; senha mínima 8.
- [ ] Supabase: modelo de e-mail em português com `{{ .Token }}`; SMTP próprio antes de abrir ao público (o padrão manda poucos e-mails por hora).
- [ ] GitHub, **Settings > Code security**: ligar *Secret scanning* e *Push protection* (grátis em repositório público);
      conferir que *Dependabot alerts* está ligado.
- [ ] GitHub, **Settings > Branches**: proteger a `main` exigindo o job "verificar" verde antes de juntar um PR (opcional, ajuda quando tiver mais gente).
- [ ] Primeiro push depois desta revisão: acompanhar a aba **Actions** (o CI novo roda e2e, RLS e gitleaks pela primeira vez).

## Parte 5 — Importar lista de corte do Promob/SketchUp (fase 17)  [ ]
- Já lemos CSV/XLSX genérico (`infra/xlsx.js`, `linhasParaTexto`). Adicionar reconhecimento das colunas
  usuais desses programas (quantidade, comprimento, largura, material, espessura, fita por lado).
- Quando a lista traz material/espessura, separar automaticamente em chapas diferentes.
- Precisa de um arquivo real exportado pelo Gilmar para testar (pedir antes de começar).
**Testes:** arquivo de exemplo vira as chapas e peças certas.

## Parte 6 — Exportar para ERP (Omie/Bling) (fase 18)  [ ]
- CSV do relatório mensal e do custo por projeto no formato de importação de despesas/produtos.
- Antes: confirmar com o usuário qual ERP usa e baixar o modelo de importação dele.

## Parte 9 — Dados na nuvem e oficina compartilhada (fase 21)  [ ]
- `infra/persistence.js`: modo `supabase` ao lado de `local` e `claude` (o artefato continua usando o banco do claude.ai).
- Primeiro login: oferece **importar o que está neste navegador** (reaproveita o pacote do backup).
- Convite: o dono gera um convite por e-mail para o Gilmar entrar na mesma oficina e ver o mesmo estoque e histórico.
- Gravação com fila e reenvio quando a internet volta; conflito simples (o último salva, com aviso).
**Pronto quando:** Gabriel e Gilmar, em computadores diferentes, veem o mesmo estoque e o mesmo relatório do mês.

## Parte 9b — Plano de corte compartilhado por link e acompanhamento da execução (fase 21b)  [ ]
**Pedido do Gabriel (21/10):** salvar o plano no sistema, mandar um link para alguém da equipe abrir,
acompanhar em que etapa ele está e o dono da marcenaria ver tudo num painel.
**Depende de:** Partes 7 e 8 configuradas no Supabase + Parte 9 (dados na nuvem). Pode passar na frente
das Partes 5, 6, 10, 11 e 12; a segurança do link (abaixo) é feita aqui mesmo, sem esperar a Parte 10.
- **Plano salvo no banco:** tabela `planos` (oficina_id, projeto, plano calculado em JSON, criado_por, criado_em,
  `etapa`, `atualizado_em`). Ao aprovar o plano, ele é gravado; o mesmo plano pode ser aberto quantas vezes quiser.
- **Etapas do corte** (além do status do projeto que já existe): Aguardando corte → Em corte → Cortado → Conferido
  (e Cancelado). Dentro de "Em corte", marcar **chapa por chapa** ("chapa 3 de 7 cortada"), com quem marcou e quando.
  Tabela `plano_eventos` (quem, quando, o que mudou): é o extrato da execução, igual ao histórico do estoque.
- **Link para a equipe, dois tipos:**
  1. *Convite de uso único:* o link vale uma vez e por prazo curto (ex.: 48 h). Quem abre faz login e passa a
     enxergar aquele plano (ou a oficina) para sempre pela própria conta. Depois de usado, o link morre.
  2. *Link da serra (opcional):* para o operador sem conta. Só vê o plano e marca chapas como cortadas;
     não vê custos nem outros projetos; expira; o dono pode revogar.
  O link guarda só um código aleatório longo; o banco guarda o **hash** do código, a validade, o tipo e se já foi usado.
  A validação é uma função no banco (RPC) com parâmetros, sem SQL montado com texto; RLS continua valendo para tudo.
- **Painel do dono:** lista dos planos com etapa, progresso (chapas cortadas / total), responsável e última mudança;
  filtros por etapa e por mês; cada plano abre com a linha do tempo dos eventos.
- **Integração com o que já existe:** quando o plano chega em "Cortado", oferece o "Atualizar estoque"
  (saída no histórico); o relatório mensal passa a poder contar só planos cortados.
**Testes:** RLS (membro de outra oficina não vê o plano; link expirado/usado/revogado não abre; link da serra não
vê custos), etapas e progresso, linha do tempo, e2e do fluxo criar → compartilhar → marcar chapas → painel.
**Pronto quando:** Gabriel aprova um plano, manda o link ao Gilmar, o Gilmar marca as chapas na serra e o painel do
Gabriel mostra "Em corte · 3 de 7 chapas" e depois "Cortado", sem precisar trocar arquivo.

## Parte 10b — Segurança: o que ficou depois da 10a (fase 22b)  [ ]
Plano de ataque, em ordem de prioridade (risco × esforço). A 10a fechou as falhas exploráveis de hoje; estes itens
reduzem o que sobra e preparam a abertura ao público.

| # | Item | Por quê | Esforço |
|---|---|---|---|
| S1 | **Template seguro `html\`...\``** em `ui/html.js`, que escapa tudo por padrão (`raw()` para HTML já pronto), e migrar os 29 `innerHTML` | hoje a segurança depende de lembrar o `esc()` em cada concatenação; com o template, esquecer passa a ser seguro. O lint aceita o template e os comentários de "revisado" somem | médio |
| S2 | **Fontes no próprio site** (sem Google Fonts) | tira um terceiro da página, deixa a CSP com `font-src 'self'` e não manda o IP do usuário ao Google (LGPD) | pequeno |
| S3 | **Tirar `style=""` dos templates** e remover `'unsafe-inline'` de `style-src` | fecha injeção de CSS (vazamento por seletor, tela falsa sobreposta) | médio |
| S4 | **Atalhos de teste só no build de teste**: `window.__pc` e `window.__cortaSupabaseFake` atrás de um `define` do esbuild (`--testes`) | o site público não precisa expor o estado e o banco no console | pequeno |
| S5 | **Parte 9 com a fronteira**: todo dado lido do Supabase passa por `sanitize.js` (já é o padrão da `persistence.js`); gravação só pelo `supabase-js`, sem SQL montado com texto | membro de outra máquina pode gravar dado adulterado | junto com a Parte 9 |
| S6 | **Sessão do Supabase**: JWT de 1 h (padrão), rotação do refresh token ligada; botão "sair de todos os aparelhos" | o token fica no `localStorage`; a CSP reduz, mas não zera, o risco de roubo | pequeno |
| S7 | **Link da serra (Parte 9b)**: código aleatório de 32 bytes, só o hash no banco, validade curta, uso único, RPC com parâmetros, revogação | é o único acesso sem login | junto com a 9b |
| S8 | **Cabeçalhos HTTP** (CSP também como cabeçalho, `frame-ancestors 'none'`, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) | `frame-ancestors` (contra clickjacking) e HSTS não funcionam em `<meta>`; o GitHub Pages não deixa configurar | junto com a Parte 12 |
| S9 | **Actions fixadas por SHA** e `npm ci --ignore-scripts` no CI | cadeia de suprimento: uma tag de action pode ser trocada | pequeno |
| S10 | **Backup com dados de clientes**: aviso ao exportar e opção de senha (criptografia AES-GCM no navegador) | o `.json` leva nome e contato de clientes em texto claro | médio |
| S11 | **Monitoramento**: alertas de uso e de erro do Supabase; revisar os logs de autenticação uma vez por mês | detectar abuso cedo | pequeno |
**Testes:** cada item com teste; S1 com o `tests/e2e/seguranca/injecao.test.js` (precisa continuar passando sem mudar),
S3/S2 com a CSP endurecida no mesmo teste, S4 confere que `window.__pc` não existe no `dist/cortapramim.html`.

## Parte 11 — LGPD (fase 23)  [ ]
(Orientação técnica, não jurídica; vale revisar com um advogado antes de vender.)
- **Política de privacidade** e **termos de uso** na tela de login: quais dados (nome, e-mail, dados de clientes nas
  propostas), para quê, onde ficam (Supabase, São Paulo), por quanto tempo, com quem são compartilhados (Google, se usar login Google).
- **Base legal:** execução de contrato para operar a conta; consentimento separado só se um dia houver e-mail de marketing.
- **Direitos do titular dentro do app:** baixar meus dados (o backup já faz) e **excluir minha conta** (apaga dados e oficina se for o único dono).
- **Minimização:** não pedir CPF/endereço; dados do cliente final só o necessário para a proposta.
- **Canal de contato** para pedidos de titulares (pequeno porte pode dispensar encarregado formal, mas precisa do canal).
- **Incidentes:** registro de acesso (logs do Supabase), plano simples de resposta e comunicação à ANPD e aos titulares se houver vazamento.
- Retenção: definir prazo para contas inativas e para logs.

## Parte 12 — Hospedagem e operação (fase 24)  [ ]
- Sair do GitHub Pages para **Cloudflare Pages** (ou Vercel): permite cabeçalhos de segurança (CSP, HSTS,
  X-Frame-Options), domínio próprio com HTTPS e deploy pelo mesmo GitHub Actions.
- Ambiente de **homologação** separado do de produção (dois projetos Supabase).
- Backup automático do banco (plano pago do Supabase ou exportação agendada) e teste de restauração.

---

## Melhorias de código (sem pressa, uma por vez)
Nada aqui é urgente: o código está bem dividido em camadas, sem dependência circular e com testes. São ajustes de clean code
que deixam o próximo passo mais fácil. Cada um termina com `npm run test:all` verde e sem mudar o que o usuário vê.
- **C1 Template seguro (é o S1):** também resolve as linhas de 300 a 700 caracteres montando HTML (Blocks, Sheets, Summary, Export).
- **C2 Formatação automática** (Prettier) com largura de 140, num commit só de formatação, para não misturar com mudança de lógica.
- **C3 Dividir os componentes grandes**: `entry/Blocks.js` (desenho, eventos e leitura de arquivo no mesmo arquivo) e
  `result/Sheets.js` (cartão da chapa, editor e tabelas). Mesmo padrão `{template, mount}`, só em arquivos menores.
- **C4 Nomes**: o motor mistura constantes (`V`, `H` em `core/constants.js`) com as letras `'V'`/`'H'` escritas direto; usar só as constantes.
- **C5 Tipos com JSDoc + `// @ts-check`** em `core/` e `domain/` (o editor passa a acusar campo errado sem precisar de TypeScript).
- **C6 Comentário errado** em `ui/dom.js` (`num` diz que lê data-attribute; só faz `parseInt`).
- **C7 Nome antigo**: `APP_ID = 'plano-corte-mdf'` e as chaves `plano-mdf-*` do navegador ficam (são compatibilidade com dados já guardados);
  documentar isso no `README` é suficiente, sem renomear.
