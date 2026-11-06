# Plano de implementação: o que falta fazer

Feito por partes. Cada parte é independente, cabe numa sessão e termina com testes passando e commit.
O que já foi entregue está em [IMPLEMENTADO.md](IMPLEMENTADO.md).

**Regras de sempre:** mudanças aditivas, sem mudar o comportamento das partes anteriores; testes novos em
`tests/unit/<assunto>/` e `tests/e2e/<assunto>/`; antes do commit, `npm run test:all` (lint, unitários, build, e2e)
e, se mexer em `supabase/`, `npm run test:rls`. Dado novo que vem de fora passa por `domain/sanitize.js`;
texto novo na tela passa por `esc()` (o lint cobra).
**Para retomar numa sessão nova:** "Leia docs/plano/A-FAZER.md e faça a Parte N".

## Ordem sugerida
0. **Parte 13 — Página de apresentação e conta para baixar e salvar** (abaixo): **especificação pronta e validada**
   em [`specs/parte-13-apresentacao-e-conta.md`](specs/parte-13-apresentacao-e-conta.md). Entra com a conta obrigatória
   **desligada**; ligar é um passo à parte, depois de R15, R16, R17 e R20 a R22.
1. **Bloco R — Antes de usar numa marcenaria real** (logo abaixo). Tem duas etapas:
   **R-1, piloto na nossa oficina** (Gabriel e Gilmar cortando projetos reais) e
   **R-2, outras marcenarias usando** (o "beta"). Nada de marcenaria de fora antes de R-1 e R-2 prontos.
2. **Pendências manuais** (abaixo): 30 minutos no painel do Supabase e no GitHub; fazem parte do R-2.
3. **Navegação em páginas** (está no R-2, item R26): antes de mostrar o sistema a terceiros.
4. **Parte 9b**, **Parte 12** completa, **Parte 11** completa e o restante da **Parte 10b** (S1, S3, S7 a S11).
5. Partes 5 e 6 quando houver arquivo real do Promob/SketchUp e o ERP escolhido.

---

## Bloco R — Antes de usar numa marcenaria real  [ ]
Regra que guia o bloco: **erro de corte não tem volta.** Uma chapa cortada errada é dinheiro perdido e móvel atrasado;
um projeto perdido é a marcenaria desistindo do sistema. Por isso a ordem é: primeiro o corte certo, depois os dados
que não se perdem, depois o resto.

Duas etapas, com critério de pronto cada uma:
- **R-1 Piloto na nossa oficina:** itens R1 a R14. Gabriel e Gilmar usam em projetos reais, com conferência na serra.
- **R-2 Outras marcenarias (beta):** R-1 completo + itens R15 a R32.

Cada item: o quê, por quê e quando está pronto. Os que já têm parte feita dizem o que existe hoje.

### R-1 · A) Corte certo

**R1 Conferência automática de todo plano.** Hoje `conferir()` (`domain/edit.js`) checa limites, sobreposição e peças,
mas só roda no botão do editor manual. Rodar depois de todo cálculo, ao aprovar e antes de cada exportação (PDF, PNG,
CSV, etiquetas); se falhar, o plano **não pode ser aprovado** e a tela diz o que está errado.
*Pronto quando:* um plano adulterado de propósito (peça sobreposta, fora da chapa, faltando) não aprova nem exporta.

**R2 Plano desatualizado não pode ser cortado.** Hoje, se alguém calcula, aprova e depois muda uma peça, o plano antigo
continua aprovado e exportável. Guardar uma "impressão digital" (hash) do que foi digitado no momento do cálculo;
se mudar, mostrar "o plano não corresponde mais à lista: calcule de novo", desaprovar e bloquear as exportações.
*Pronto quando:* mudar uma medida depois de aprovar bloqueia PDF, etiquetas e CSV até recalcular.

**R3 Invariantes do motor em centenas de casos** (teste de propriedade; hoje são 4 casos aleatórios em `core.test.js`).
Variar serra (0 a 6 mm), refilo, fita descontada, veio, peças livres, fases, sobras do estoque e chapas repetidas.
Conferir em cada caso: toda peça aparece **exatamente uma vez** e com a medida de corte certa; tudo dentro da área útil
(descontado o refilo); distância entre peças ≥ espessura da serra; veio respeitado (peça com veio nunca girada);
cada corte da sequência atravessa a chapa ou a faixa inteira (guilhotina executável); retalho nunca cobre peça.
*Pronto quando:* 500 casos com semente fixa passam no CI, e uma falha mostra a semente para reproduzir.

**R4 Projetos de referência travados** ("golden tests"): o de 289 peças comparado com o LeoPlan, a planilha do banheiro
(fonte da verdade dos móveis de casa) e mais 3 projetos reais do Gilmar. Para cada um: número de chapas, aproveitamento
mínimo e número de cortes máximo. Se uma mudança no motor piorar algum, o teste falha.

**R5 Corte piloto na serra.** Cortar 2 projetos reais seguindo só o que o sistema entrega (PDF de corte e etiquetas).
Medir pelo menos 10% das peças com trena e paquímetro; tolerância combinada com o Gilmar (ex.: ±0,5 mm). Anotar cada
divergência e a causa (sistema, digitação, máquina).
*Pronto quando:* 2 projetos seguidos sem divergência causada pelo sistema.

**R6 Parâmetros da oficina conferidos e impressos.** Espessura real da serra (kerf), refilo, tamanho real da chapa de
cada fornecedor (2750 × 1840 ou × 1850) e espessura da fita. O PDF de corte e as etiquetas trazem, no rodapé: unidade,
serra, refilo, tamanho da chapa, data, nome do projeto e versão do app (hoje o PDF não mostra nenhum desses).
Assim, quem corta confere o que foi usado no cálculo.

**R7 Proteção contra unidade errada.** O erro mais comum de digitação é misturar cm e mm. Avisar quando as medidas
parecem estar na outra unidade (ex.: em cm, peças acima de 300; em mm, todas abaixo de 30): "Você quis dizer mm?".
Unidade sempre visível perto das medidas, no PDF e nas etiquetas.

**R8 Medida de corte ou medida final.** Deixar explícito, na tela e no PDF, se as medidas digitadas são finais (com fita)
ou de corte, e quanto foi descontado de cada peça. Conferir com o método do Gilmar (fita aplicada por nós na montagem).

**R9 Sequência de cortes executável na máquina da oficina.** Validar com o Gilmar se a ordem (fases, direção do primeiro
corte, giro da chapa) bate com a esquadrejadeira dele. Se não bater, ajustar o motor ou o texto do PDF.

**R10 Impressão real na oficina.** PDF de corte legível impresso em A4 preto e branco (tamanho da letra, números das
peças, sem depender de cor); etiquetas testadas na impressora e no papel que vão usar, colando na peça e lendo depois
da fita aplicada. Peça ↔ chapa ↔ projeto identificáveis pela etiqueta.

**R11 Plano aprovado congelado.** Ao aprovar, guardar uma versão do plano (número + data) que não muda mais; qualquer
alteração gera a versão seguinte. O PDF e as etiquetas mostram o número da versão. Evita cortar metade por uma versão
e metade por outra.

### R-1 · B) Dados que não se perdem e saber o que aconteceu

**R12 Backup que funciona de verdade.** O aviso de backup já existe (`project/Backup.js`). No piloto: backup semanal
num lugar fora do computador (Drive) e **um teste de restauração** num navegador limpo. Mesmo sem a nuvem, nenhum projeto se perde.

**R13 Versão do app visível** no rodapé e no PDF (número + data do build, gerado pelo `build.mjs`) e um `CHANGELOG.md`
curto. Quando um problema aparecer, dá para saber em que versão foi. Saber **voltar uma versão** do site
(publicar de novo um commit anterior) e ter testado isso uma vez.

**R14 Formato dos dados com versão e migração.** Backup e projeto já têm `versao`. Garantir que todo projeto salvo em
versões anteriores continua abrindo: guardar backups antigos reais como arquivos de teste (`tests/fixtures/`) e testar
a leitura deles a cada mudança.

**Critério de pronto do R-1:** R1 a R14 feitos e 2 projetos reais cortados sem divergência (R5).

### R-2 · C) Conta, banco e dados na nuvem

**R15 Parte 9 mínima: dados na nuvem por oficina.** Projetos, sobras, insumos e histórico no Supabase; no primeiro login,
importar o que está no navegador; fila de gravação quando a internet cai. O convite de membros pode vir logo depois.
*Pronto quando:* trocar de computador e entrar na conta mostra tudo igual.

**R16 Supabase de produção:** rodar as migrações 001 e 002 (ver "Pendências manuais"); **SMTP próprio** (Resend ou Brevo;
o padrão manda só 2 e-mails por hora e trava o login por código); CAPTCHA no login; URLs de retorno só do domínio do app;
modelos de e-mail em português.

**R17 Plano pago do Supabase (Pro) ou backup próprio.** O gratuito pausa o projeto depois de 1 semana sem uso e não
permite baixar backup. Com dados de marcenaria real: Pro (backup diário por 7 dias) ou exportação diária agendada
para fora; e **um teste de restauração** ensaiado.

**R18 Homologação separada:** um segundo projeto Supabase para testar; migração nova passa primeiro por lá.
Nunca testar com os dados das marcenarias.

**R19 Sessão em computador compartilhado** (é comum na oficina): botão "sair de todos os aparelhos", aviso de quem está
logado e saída automática opcional depois de um tempo sem uso.

### R-2 · D) Regras e privacidade (o mínimo da Parte 11)
(Orientação técnica, não jurídica: revisar com advogado.)

**R20 Termo de uso do beta:** é uma versão de teste; as medidas devem ser conferidas antes de cortar; o sistema não
substitui a conferência do marceneiro; como reportar problema. Aceite registrado no primeiro login.

**R21 Política de privacidade curta:** quais dados (conta, projetos, nome e contato de clientes nas propostas),
onde ficam (Supabase, São Paulo), para quê, por quanto tempo, como pedir exclusão.

**R22 Baixar meus dados e excluir minha conta** dentro do app (o backup já cobre o "baixar").

### R-2 · E) Saber o que acontece nas marcenarias

**R23 Relatar problema:** botão em todas as telas que abre WhatsApp ou formulário com a versão do app e, se a pessoa
permitir, o projeto anexado. Responder em até 1 dia útil durante o beta.

**R24 Registro de erros:** erros de JavaScript gravados numa tabela do Supabase (mensagem, versão, tela; **sem dados
pessoais nem do projeto**), com aviso para você quando aparecer erro novo.

**R25 Métricas mínimas de uso** (sem dados pessoais): planos calculados, aprovados e exportados; aproveitamento médio;
tempo até o primeiro plano; quantos voltaram na semana seguinte.

### R-2 · F) Uso no dia a dia da oficina

**R26 Navegação em páginas** (o redesenho planejado). *A Parte 13 já cria o roteador (`src/ui/router.js`) com
`#/inicio` e `#/app`; aqui `app` se divide nas páginas abaixo (acrescentar em `ROTAS`, `src/domain/rotas.js`).*
Roteador por hash (`#/montar`, `#/resultado`, `#/estoque`,
`#/conta`), que funciona no GitHub Pages e no arquivo único e já serve à Parte 9b (`#/serra/<código>`).
Componentes continuam `{template, mount}` falando pelo `bus`; muda só quem monta cada página. Os e2e acompanham.
Antes de abrir para terceiros: opinião sobre um layout que ainda vai mudar é feedback desperdiçado.

**R27 Primeiro uso guiado:** projeto de exemplo, 3 passos na tela ("digite as peças → calcule → aprove e baixe"),
página de ajuda com perguntas comuns e 2 ou 3 vídeos curtos.

**R28 Exportar para serviço de corte:** CSV no formato do CorteCloud (Quantidade, Comprimento, Largura, Função,
Fita C1/C2/L1/L2, Material, Complemento, Girar; medidas em mm). Os contadores de fita atuais (`fc`/`fl`, 0 a 2) viram
C1/C2/L1/L2. *Pronto quando:* o arquivo é aceito de verdade na importação do CorteCloud.

**R29 Celular, tablet e computador fraco:** testar num Android barato e num notebook antigo (o cálculo padrão de 15 s
pode passar de 1 minuto); ajustar o tempo padrão se precisar. Telas usáveis no celular para quem consulta na serra.

**R30 Funciona sem internet (PWA):** instalar como aplicativo e abrir o último plano sem sinal; grava na nuvem quando a
conexão volta (junto com a fila do R15).

### R-2 · G) Segurança que precisa estar pronta antes de terceiros
**R31** Parte 10b **S4** (atalhos de teste fora do site público), **S2** (fontes no próprio site), **S6** (sessão) e
**S8** com a Parte 12 mínima: **domínio próprio** e hospedagem com cabeçalhos de segurança (Cloudflare Pages).

**R32 Ensaio geral:** uma pessoa que nunca viu o sistema (não o Gabriel nem o Gilmar) cria a conta, monta um projeto
real, exporta e manda para o corte, só com a ajuda do app. Anotar onde travou e corrigir antes de convidar as marcenarias.

**Critério de pronto do R-2:** R15 a R32 feitos e o ensaio geral (R32) sem bloqueio.

**Critério de saída do beta** (quando o sistema deixa de ser "teste"): 5 marcenarias usando, 50 planos cortados de
verdade, nenhum erro de medida causado pelo sistema, nenhuma perda de dados, erros novos respondidos em até 1 dia útil,
e cada marcenaria respondeu se pagaria (e quanto).

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

## Parte 13 — Página de apresentação e conta para baixar e salvar (fase 25)  [ ]
**Especificação completa e validada:** [`specs/parte-13-apresentacao-e-conta.md`](specs/parte-13-apresentacao-e-conta.md),
com o código testado e o patch [`specs/parte-13.patch`](specs/parte-13.patch) (aplica limpo sobre `b5789d9`).
- **Site:** a primeira visita abre a página de apresentação (`#/inicio`: o que faz, como funciona, benefícios, prova com
  projeto real e perguntas frequentes), com "Criar conta grátis", "Entrar" e "Experimentar sem conta". Quem já usou
  abre direto no app (`#/app`).
- **Conta obrigatória** para baixar arquivos, salvar projetos e usar o estoque (calcular e aprovar continuam livres).
  Vem **desligada** (`EXIGIR_CONTA_NO_SITE = false`); ligar é a seção 8 da especificação, depois dos pré-requisitos.
- **Artefato do claude.ai:** sem mudança.
**Validação (06/11/2026):** protótipo descartável com a suíte inteira nas condições do CI: 170 unitários e 94 e2e
(82 antigos + 12 novos), com a conta obrigatória desligada e de novo ligada.
**Para retomar:** "Leia docs/plano/specs/parte-13-apresentacao-e-conta.md e implemente a Parte 13".

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
(O mínimo desta parte, sem convite de membros, entra no Bloco R como R15.)
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
