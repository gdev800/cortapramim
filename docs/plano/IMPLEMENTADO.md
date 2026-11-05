# Plano de implementação: estoque, histórico, relatório mensal, contas e segurança

Feito por partes. Cada parte é independente, cabe numa sessão e termina com testes passando e commit.
Regras de sempre: mudanças aditivas, sem mudar o comportamento das fases anteriores; testes novos em
`tests/melhorias/` (unit e e2e); `npm test`, `npm run build`, `npm run test:e2e` antes do commit.
Para retomar numa sessão nova: "Leia PLANO-IMPLEMENTACAO.md e faça a Parte N".

Ordem sugerida: Bloco A (Partes 1 a 6, funções do sistema) e depois Bloco B (Partes 7 a 12, contas e segurança).
Se o Gilmar precisar compartilhar dados logo, dá para fazer 7 → 8 → 9 antes de 3. A Parte 10 deve estar pronta
antes de abrir para qualquer pessoa de fora.

Analogia do conjunto: hoje o sistema guarda o **saldo** (quanto tem de sobra, fita, ferragem).
Falta o **extrato** (o que entrou e saiu, quando e em qual projeto). O relatório mensal é o extrato somado.

---

## Parte 1 — Estoque de chapas inteiras (fase 13)  [x]
**Objetivo:** cadastrar chapas novas por material, espessura e tamanho, e o plano usar isso.
- `src/domain/supplies.js`: novo tipo de insumo `chapa` com `{ id, tipo:'chapa', nome, esp, c, l, q }`
  (`insumoValido` aceita o tipo novo; `adicionarInsumo` soma quando nome+esp+tamanho batem).
- Função pura `chapasEmEstoque(state, grupo)`: quantas chapas inteiras batem com o material do plano.
- `domain/collect.js`: se o campo "Chapas novas que tenho" estiver vazio, usa `chapasEmEstoque` (digitado continua valendo).
- `domain/supplies.js` `baixarInsumos`: ao atualizar o estoque, desconta `nNovas` de cada material.
- UI `components/supplies`: opção "Chapa de MDF (unidades)" com campos espessura e tamanho.
- Backup: exporta/importa o tipo novo (já passa por `insumos`).
**Testes:** cadastrar, somar, casar com o grupo, "Comprar" = novas − estoque, baixa ao atualizar, backup ida e volta.
**Pronto quando:** cadastro 10 chapas, calculo um plano de 4, o resumo mostra Tenho 10 / Comprar 0 e, ao atualizar, ficam 6.

## Parte 2 — Histórico de movimentações (fase 14)  [x]
**Objetivo:** registrar cada entrada e saída de estoque.
- `src/domain/history.js` (puro): `registrarSaida(state, res)` monta um lançamento
  `{ id, data, tipo:'saida', projeto, pecas, chapas:[{nome,esp,q}], sobrasUsadas, sobrasNovas, fitaM, ferragens:[{nome,q}], areaPecas, areaPerda, custo }`;
  `registrarEntrada(state, item, q)` e `registrarAjuste(state, item, de, para)`.
- Chamado em `Export.atualizarEstoque` (saída), no cadastro de insumo/sobra (entrada) e na edição de quantidade (ajuste).
- `infra/persistence.js`: lista `historico` igual a `estoque`/`insumos` (local + conta). Chave `plano-mdf-historico`.
- Backup inclui `historico` (versão 2 do pacote; lê versão 1 sem erro).
- UI: dentro de Estoque, "Movimentações" com as últimas 50 (data, projeto, o que mudou) e botão desfazer só do último.
**Testes:** cada ação gera um lançamento certo; atualizar estoque duas vezes não duplica (já existe `estAtual`); backup v1 e v2.
**Pronto quando:** aprovar e atualizar um plano aparece uma linha "Saída · projeto X · 34 peças · 4 chapas · 12 m de fita".

## Extra — Chapas repetidas (comparação com o LeoPlan)  [x]
Mesmo projeto real (289 peças, 4 materiais, serra 4,6 mm, refilo 5 mm): Leo 16 chapas / 515 cortes; nosso 16 chapas.
Diferença era a Leo repetir o mesmo desenho em várias chapas. Agora `core/repeat.js` gera desenhos feitos para
repetir (1/k de cada medida) e aceita só se o total de chapas não aumentar; ajuste "Repetir o mesmo desenho" (padrão ligado).
No 15 mm: 3 desenhos (4× + 2× + 1×), como a Leo. Testes em `tests/melhorias/*/repetidas.test.js`.

## Parte 3 — Relatório mensal (fase 15)  [x]
**Objetivo:** somar o histórico por mês.
- `src/domain/monthly.js` (puro): `resumoDoMes(historico, ano, mes)` →
  peças cortadas, projetos, chapas por material, sobras usadas e geradas, fita, ferragens, aproveitamento médio
  (área peças / área chapas), economia com sobras (R$), custo; `serieMensal(historico, n)` para os últimos n meses.
- UI: seção "Relatório do mês" com seletor de mês, cartões (peças, chapas, aproveitamento, fita, economia) e tabela por material.
  Gráfico simples de barras mês a mês (SVG próprio, sem biblioteca).
- Exportar CSV e PDF (reaproveita `infra/pdf/common.js`).
**Testes:** soma por mês com lançamentos em meses diferentes, mês vazio, virada de ano, CSV com acentos.
**Pronto quando:** com 3 projetos atualizados em outubro, o relatório de outubro mostra as somas certas e o PDF baixa.
**Feito:** `domain/monthly.js` (também `cartoesDoMes`, `csvMensal`, `somarMeses`), painel `ui/components/monthly` no Estoque
(mês pelo horário local; clicar numa barra escolhe o mês; métrica chapas/peças/economia), gráfico em `monthly/chart.js`,
PDF em `infra/pdf/monthly.js`. Aproveitamento = soma da área das peças / soma da área das chapas (média ponderada).

## Parte 4 — Estoque mínimo e lista de compras (fase 16)  [x]
- Campo opcional `min` em cada insumo (chapa, fita, ferragem).
- Aviso no topo do Estoque e no resultado: "Branco TX 15 mm: 3 chapas, abaixo do mínimo 5".
- "Lista de compras": o que está abaixo do mínimo + o que o plano atual pede; exporta CSV/PDF.
**Testes:** abaixo/igual/acima do mínimo; soma com a necessidade do plano.
**Feito:** `domain/restock.js` (`definirMinimo`, `abaixoDoMinimo`, `listaDeCompras`, `avisosDoPlano`, `csvCompras`);
comprar = max(0, plano pede + mínimo − tenho); igual ao mínimo não avisa. Painel `ui/components/shopping` no topo do Estoque,
campo "mín." em cada insumo, aviso no resultado (`result/MinWarn.js`, some depois de "Atualizar estoque"), PDF em `infra/pdf/shopping.js`.

## Parte 5 — Importar lista de corte do Promob/SketchUp (fase 17)  [ ]
- Já lemos CSV/XLSX genérico (`infra/xlsx.js`, `linhasParaTexto`). Adicionar reconhecimento das colunas
  usuais desses programas (quantidade, comprimento, largura, material, espessura, fita por lado).
- Quando a lista traz material/espessura, separar automaticamente em chapas diferentes.
- Precisa de um arquivo real exportado pelo Gilmar para testar (pedir antes de começar).
**Testes:** arquivo de exemplo vira as chapas e peças certas.

## Parte 6 — Exportar para ERP (Omie/Bling) (fase 18)  [ ]
- CSV do relatório mensal e do custo por projeto no formato de importação de despesas/produtos.
- Antes: confirmar com o usuário qual ERP usa e baixar o modelo de importação dele.

## Bloco B — Contas, banco e segurança (para abrir ao público)

Escolha recomendada: **Supabase** (Postgres + autenticação pronta). Motivos:
- banco relacional combina com estoque, histórico e relatório mensal (somas por mês, por material);
- login pronto com Google, e-mail e senha, e código/link por e-mail, com limite de tentativas embutido;
- **RLS (Row Level Security)**: o próprio banco recusa ler ou gravar dados de outra marcenaria,
  mesmo que alguém mexa no JavaScript da página. Analogia: não é o porteiro (a tela) que barra, é a fechadura de cada sala;
- funciona com site estático (sem servidor nosso), região **São Paulo** disponível (bom para LGPD), plano gratuito para começar.
Alternativa considerada: Firebase (bom, mas banco de documentos deixa relatórios mais trabalhosos).
`infra/persistence.js` já isola o armazenamento: a troca não mexe em `core/`, `domain/` nem nos componentes.

## Parte 7 — Projeto no Supabase e modelo de dados (fase 19)  [x]
**Passo manual do Gabriel:** criar a conta e o projeto no Supabase (região São Paulo) e passar URL e chave pública (anon).
- `supabase/migrations/001_inicial.sql` versionado no repositório:
  `oficinas` (marcenaria), `membros` (usuário ↔ oficina, papel dono/membro), `projetos`, `sobras`, `insumos`, `historico`.
  Toda tabela tem `oficina_id`; colunas tipadas e `check` (quantidade >= 0, medidas > 0), JSON só para o plano calculado.
- RLS ligada em **todas** as tabelas: só membros da oficina leem/gravam; só o dono convida/remove membros.
- Índices para o relatório mensal (`historico(oficina_id, data)`).
**Testes:** script de testes de RLS (usuário A não enxerga nada da oficina B; sem login não lê nada).
**Pronto quando:** migração aplica do zero e os testes de RLS passam.
**Feito:** `supabase/migrations/001_inicial.sql` e `supabase/tests` (46 verificações; `npm run test:rls`; CI sugerido em `supabase/README.md`, ainda não criado).
Ids de texto do app mantidos com chave `(oficina_id, id)`; `projetos.entrada` (o que foi digitado) e `projetos.plano` em JSON;
histórico com colunas tipadas (sem a foto do desfazer, que fica no navegador). Funções de permissão no schema `privado`
(fora da API), `security definer` com `search_path` vazio. A oficina nunca fica sem dono.
**Pendente (manual):** aplicar a migração no projeto real do Supabase (ver `supabase/README.md`).

## Parte 8 — Login (fase 20)  [x]
- Tela de entrada: **Entrar com Google**, **e-mail e senha**, **código por e-mail** (sem senha). Recuperar senha. Sair.
- Supabase Auth (`@supabase/supabase-js`, versão fixa). Senha mínima 8, proteção contra senha vazada ligada no painel.
- Sessão renovada automaticamente; sem login o app continua funcionando "neste navegador" (modo atual), com aviso.
- Configurar no painel: URLs de retorno permitidas (só o domínio do app), modelo de e-mail em português.
**Testes:** e2e com usuário de teste em ambiente local (Supabase local via CLI), nunca com credenciais reais no código.
**Feito:** `domain/auth.js` (validações e erros em português), `infra/auth.js` (adaptador, nunca lança),
`infra/supabase/` (config com a chave publicável e cliente), janela `ui/components/account` com botão "Entrar" no topo.
Google, e-mail e senha, código por e-mail (reenvio após 60 s), criar conta, esqueci a senha e senha nova. Só fora do claude.ai.
Biblioteca `@supabase/supabase-js` 2.117.2 fixa e embutida (sem CDN); o build passou a compactar por padrão (`--dev` gera legível).
Testes: o e2e usa um Supabase falso dentro do navegador, porque esta sessão não alcança o Supabase. Testar contra o projeto
real (ou Supabase local via CLI) fica para quando houver rede.
**Ainda manual (painel):** URLs de retorno, modelo de e-mail com `{{ .Token }}`, SMTP próprio, Google (ver `supabase/README.md`).
Proteção contra senha vazada exige o plano Pro (fica de fora no Free).

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

## Parte 10 — Segurança da aplicação (fase 22)  [ ]
- **Injeção de HTML/script (XSS):** a tela monta HTML com texto. Revisar todo `innerHTML` e garantir `esc()` em
  qualquer dado digitado (nome de peça, projeto, cliente, material); teste que tenta `<img onerror>` em cada campo.
- **Injeção de SQL:** só acesso por `supabase-js` (consultas parametrizadas) e funções SQL com parâmetros;
  proibido montar SQL com texto concatenado. Funções `security definer` só quando necessário e com `search_path` fixo.
- **CSP** (política de conteúdo): só scripts do próprio site e do CDN usado; bloqueia script injetado.
- **Bibliotecas do CDN com SRI** (hash de integridade) e versões fixas.
- **xlsx 0.18.5 tem falhas conhecidas** (prototype pollution e ReDoS): atualizar para a versão corrigida do SheetJS
  (distribuída pelo CDN deles) ou trocar a leitura de .xlsx por outra lib mantida; limitar tamanho do arquivo lido.
- **Dependências:** `npm audit` no CI, Dependabot e CodeQL no GitHub (alertas de libs e de código).
- **Segredos:** só a chave pública (anon) no front; chave de serviço nunca no repositório (`.gitignore` + varredura de segredos no CI).
- Limites: tamanho de texto/arquivo importado, quantidade de peças (já existe), tentativas de login (Supabase).

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

## Andamento
| Parte | Estado | Commit |
|---|---|---|
| 1 Estoque de chapas | feito | (ver git log) |
| 2 Histórico | feito | (ver git log) |
| 3 Relatório mensal | feito | (ver git log) |
| 4 Estoque mínimo | feito | (ver git log) |
| 5 Importar Promob/SketchUp | adiada (falta um arquivo real exportado pelo Gilmar) | |
| 6 Exportar ERP | a fazer | |
| 7 Supabase e modelo de dados | feito (falta aplicar no projeto real) | (ver git log) |
| 8 Login Google / e-mail e senha / código | feito (falta configurar o painel) | (ver git log) |
| 9 Dados na nuvem e oficina compartilhada | a fazer | |
| 9b Plano por link e acompanhamento | a fazer (depois de 7, 8 e 9) | |
| 10 Segurança (XSS, SQL, CSP, SRI, libs) | a fazer | |
| 11 LGPD | a fazer | |
| 12 Hospedagem e operação | a fazer | |
