# Plano de implementação: o que já está feito

Registro das partes entregues, com o que foi feito e onde está no código. O que falta está em
[A-FAZER.md](A-FAZER.md). Quando uma parte de lá terminar, ela muda para cá (com o resumo do "Feito").

Antes deste plano, as fases 1 a 12 (motor de corte, sobras, etiquetas, PDFs, orçamento, modelos de móvel,
edição manual do plano etc.) foram feitas como melhorias soltas. Os testes delas estão em `tests/unit/fases/`
e `tests/e2e/fases/` (`faseN.test.js`).

Analogia do conjunto: o sistema guardava o **saldo** (quanto tem de sobra, fita, ferragem).
As Partes 1 a 4 trouxeram o **extrato** (o que entrou e saiu, quando e em qual projeto). O relatório mensal é o extrato somado.

| Parte | Entregue | Observação |
|---|---|---|
| 1 Estoque de chapas | sim | |
| 2 Histórico | sim | |
| Extra Chapas repetidas | sim | comparação com o LeoPlan |
| 3 Relatório mensal | sim | |
| 4 Estoque mínimo | sim | |
| 7 Supabase e modelo de dados | sim | falta aplicar no projeto real (A-FAZER, "Pendências manuais") |
| 8 Login | sim | falta configurar o painel (A-FAZER, "Pendências manuais") |
| 10a Segurança: fronteira, XSS, CSP, libs, CI | sim (05/11/2026) | o restante da Parte 10 está em A-FAZER |
| Revisão de código e pastas | sim (05/11/2026) | itens maiores ficaram em A-FAZER, "Melhorias de código" |
| Extra Recomeçar com confirmação | sim (06/11/2026) | |

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
No 15 mm: 3 desenhos (4× + 2× + 1×), como a Leo. Testes em `tests/unit/fases/repetidas.test.js e tests/e2e/fases/repetidas.test.js`.

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

## Parte 10a — Segurança: fronteira de entrada, XSS, CSP e bibliotecas (fase 22a)  [x]
**Feito em 05/11/2026.** Analogia: duas travas na mesma porta. A primeira é a conferência na entrada (a fronteira):
dado de fora só entra com o tipo e o tamanho certos. A segunda é a CSP: mesmo que um texto vire HTML, o navegador não executa script.
- **Fronteira de entrada** (`src/domain/sanitize.js`, limites em `src/domain/limites.js`, iguais aos `check` do banco):
  tudo que vem de fora passa por ela antes de entrar no estado: backup `.json`, rascunho e listas do navegador,
  dados da conta (claude.ai) e listas abertas de CSV/TXT/XLSX. Texto sem caracteres de controle nem marcas de direção,
  com limite de tamanho; campo de número só com número; ids, tipos e status de uma lista fechada; `__proto__` descartado.
  O **plano calculado** importado é tipado: só `mat`, `nome`, `proj`, `fitaNome`, `obs`, `origem` são texto; o resto vira número.
  (Sem isso, um backup adulterado executava script em ~250 pontos do desenho da chapa; o teste de mutação prova.)
- **XSS corrigido:** espessura da sobra ia crua para a tela (`scraps`), além de `money()` com texto, unidade do insumo
  (`Needs`) e campos do modelo de móvel. Os 29 `innerHTML` foram auditados um a um.
- **Lint de segurança** (`eslint.config.js`, `npm run lint`): `no-unsanitized` acusa todo `innerHTML` com valor sem `esc()`;
  os auditados têm um comentário com o motivo. Um `innerHTML` novo sem revisão quebra o CI. Também proíbe `eval`, `new Function` etc.
- **Validação dos campos** (`domain/collect.js`, `domain/units.js`): `pIn` aceita só decimal simples (antes aceitava
  `Infinity`, `1e3`, `0x10`); quantidade só inteira ("2a" não vira 2); medida mínima de 1 mm; chapa até 10 m; espessura
  de 0 a 100 mm. Preço, fita e estoque inválidos avisam e valem 0. Peça maior que a chapa continua com "não cabe na chapa".
- **Bibliotecas sem CDN:** jsPDF 4.2.1 e jspdf-autotable 5.0.9 (as 2.5.1/3.5.31 tinham falha crítica) e a SheetJS 0.18.5
  (prototype pollution e ReDoS, sem correção no npm) trocada pela `read-excel-file` 9.3.14, mantida. Tudo embutido no build
  com versão fixa: não há mais script de terceiro carregado em tempo de execução, então o SRI deixa de ser necessário.
  `npm audit`: 0 falhas. Consequência: `.xls` (Excel 97-2003) não abre mais; o app pede para salvar como `.xlsx` ou CSV.
- **CSP** no próprio HTML do site (`scripts/build.mjs`): só roda o script cujo hash está na política; `object-src`,
  `base-uri`, `form-action` e `frame-src` fechados; conexão só com o Supabase do projeto. O build do claude.ai
  (`npm run build:artefato`) sai sem CSP, porque a plataforma injeta os próprios scripts.
  O site também ganhou `<!doctype html>`, `charset` e `viewport` (antes abria em modo de compatibilidade e sem ajuste no celular).
- **Limites de arquivo:** backup até 20 MB, CSV/TXT até 2 MB, XLSX até 5 MB e 5.000 linhas.
- **DOM clobbering:** a detecção do claude.ai e o Supabase falso dos testes só aceitam objetos de verdade
  (um `<a id="claude">` injetado não engana mais o app).
- **Banco** (`supabase/migrations/002_endurecimento.sql`): histórico vira extrato (membro lê e registra; ninguém edita;
  apaga só o próprio lançamento, o dono apaga qualquer um; nova coluna `criado_por`) e limite de tamanho no JSON
  (entrada do projeto 1 MB, plano 2 MB, listas do histórico 64 KB). 11 testes novos em `supabase/tests/rls_002.test.sql`.
- **CI** (`.github/workflows/pages.yml`): lint, `npm audit`, unitários, build, e2e, RLS e varredura de segredos (gitleaks)
  antes de publicar; publica só da main. CodeQL (`codeql.yml`) e Dependabot (`dependabot.yml`).
- **Bug corrigido no caminho:** abrir um projeto salvo com plano mostrava o desenho do trabalho anterior
  (só o estado mudava). Agora o desenho, o resumo e as compras redesenham ao carregar. Teste em `tests/e2e/base/abrir-projeto.test.js`.
**Testes:** `tests/unit/seguranca/` (fronteira e campos, 26 testes) e `tests/e2e/seguranca/injecao.test.js` (6 cenários:
todos os campos, lista colada, planilha `.xlsx` real, backup adulterado com o plano, rascunho no navegador e CSP).
Os ataques rodam na versão sem CSP, para medir o escape de verdade. Verificado também: o leitor de lista colada não tem ReDoS
(linha de 40 mil caracteres em 4 ms).

## Revisão de código e pastas (05/11/2026)  [x]
- Documentação em `docs/` (`ARQUITETURA.md`, `SEGURANCA.md`, `plano/`). O plano foi dividido em feito e a fazer.
- Testes por assunto: `tests/unit/{base,fases,seguranca}` e `tests/e2e/{base,fases,seguranca}` (a pasta `melhorias` saiu).
- Função pura `linhasParaTexto` saiu da infra para `domain/planilha.js` (a infra só lê o arquivo).
- Imports e variáveis sem uso removidos (lint); `.DS_Store` saiu do repositório; `.gitignore` cobre `.env`, chaves e PDFs.
- Saída do build renomeada para `dist/cortapramim.html`.

## Extra — Recomeçar com confirmação (06/11/2026)  [x]
Pedido do Gabriel nos testes: calculou um plano, não gostou e não achou como zerar.
Analogia: limpar a bancada depois de um serviço. As peças vão embora; a serra continua regulada.
- **Antes:** o botão "Começar do zero" ficava no fim da lista de peças, apagava tudo num clique, sem perguntar, e também
  voltava a **unidade para cm e os ajustes da serra ao padrão** (espessura da serra, refilo, tempo), além dos dados da marcenaria
  na proposta. Quem trabalha em mm com serra de 4 mm recomeçava e calculava com 3,2 mm em cm sem perceber.
- **Agora:** "Começar do zero" (lista de peças) e um novo **"Recomeçar…"** ao lado de "Aprovar plano" abrem uma janela que diz
  o que sai (peças, chapas, ferragens, plano, cliente) e o que fica, com duas opções:
  - **Limpar só o plano**: mantém as peças para ajustar e calcular de novo;
  - **Limpar tudo**: trabalho novo, mantendo unidade, ajustes do motor, dados da marcenaria e condições padrão da proposta
    (contato, pagamento, prazo, validade) e a margem. Sobras, insumos, histórico e projetos salvos nunca são tocados.
  Avisa quando o plano está aprovado, quando há projeto salvo (ele continua na lista) e quando o estoque já foi atualizado
  (não volta sozinho). Logo depois aparece **"Desfazer"**, que devolve o trabalho, o plano e as marcas de aprovado e de
  estoque atualizado (sem esta última, "Atualizar estoque" poderia dar baixa duas vezes).
- O botão **"Novo"** de "Projeto" tinha o mesmo reset antigo. Agora limpa na hora (é usado logo depois de salvar, e a
  fase 2 conta com isso), mas mantendo o que é da oficina e com o mesmo "Desfazer".
- **Código:** regra pura em `src/domain/recomecar.js` (`fotoDoZero`, `fotoSemPlano`, `resumoDoTrabalho`, `guardarParaDesfazer`);
  janela em `src/ui/components/entry/Restart.js` e `restart.html` (texto montado com `textContent`, sem HTML com dado do usuário).
**Testes:** `tests/unit/fases/recomecar.test.js` (6) e `tests/e2e/fases/recomecar.test.js` (6: cancelar, só o plano + desfazer,
tudo mantendo a oficina + recarregar a página, trabalho vazio, desfazer com aprovado e estoque atualizado, "Novo" dos projetos).
