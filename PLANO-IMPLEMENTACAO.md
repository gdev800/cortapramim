# Plano de implementação: estoque, histórico e relatório mensal

Feito por partes. Cada parte é independente, cabe numa sessão e termina com testes passando e commit.
Regras de sempre: mudanças aditivas, sem mudar o comportamento das fases anteriores; testes novos em
`tests/melhorias/` (unit e e2e); `npm test`, `npm run build`, `npm run test:e2e` antes do commit.
Para retomar numa sessão nova: "Leia PLANO-IMPLEMENTACAO.md e faça a Parte N".

Analogia do conjunto: hoje o sistema guarda o **saldo** (quanto tem de sobra, fita, ferragem).
Falta o **extrato** (o que entrou e saiu, quando e em qual projeto). O relatório mensal é o extrato somado.

---

## Parte 1 — Estoque de chapas inteiras (fase 13)  [ ]
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

## Parte 2 — Histórico de movimentações (fase 14)  [ ]
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

## Parte 3 — Relatório mensal (fase 15)  [ ]
**Objetivo:** somar o histórico por mês.
- `src/domain/monthly.js` (puro): `resumoDoMes(historico, ano, mes)` →
  peças cortadas, projetos, chapas por material, sobras usadas e geradas, fita, ferragens, aproveitamento médio
  (área peças / área chapas), economia com sobras (R$), custo; `serieMensal(historico, n)` para os últimos n meses.
- UI: seção "Relatório do mês" com seletor de mês, cartões (peças, chapas, aproveitamento, fita, economia) e tabela por material.
  Gráfico simples de barras mês a mês (SVG próprio, sem biblioteca).
- Exportar CSV e PDF (reaproveita `infra/pdf/common.js`).
**Testes:** soma por mês com lançamentos em meses diferentes, mês vazio, virada de ano, CSV com acentos.
**Pronto quando:** com 3 projetos atualizados em outubro, o relatório de outubro mostra as somas certas e o PDF baixa.

## Parte 4 — Estoque mínimo e lista de compras (fase 16)  [ ]
- Campo opcional `min` em cada insumo (chapa, fita, ferragem).
- Aviso no topo do Estoque e no resultado: "Branco TX 15 mm: 3 chapas, abaixo do mínimo 5".
- "Lista de compras": o que está abaixo do mínimo + o que o plano atual pede; exporta CSV/PDF.
**Testes:** abaixo/igual/acima do mínimo; soma com a necessidade do plano.

## Parte 5 — Importar lista de corte do Promob/SketchUp (fase 17)  [ ]
- Já lemos CSV/XLSX genérico (`infra/xlsx.js`, `linhasParaTexto`). Adicionar reconhecimento das colunas
  usuais desses programas (quantidade, comprimento, largura, material, espessura, fita por lado).
- Quando a lista traz material/espessura, separar automaticamente em chapas diferentes.
- Precisa de um arquivo real exportado pelo Gilmar para testar (pedir antes de começar).
**Testes:** arquivo de exemplo vira as chapas e peças certas.

## Parte 6 — Exportar para ERP (Omie/Bling) (fase 18)  [ ]
- CSV do relatório mensal e do custo por projeto no formato de importação de despesas/produtos.
- Antes: confirmar com o usuário qual ERP usa e baixar o modelo de importação dele.

## Parte 7 — Dados compartilhados entre computadores (futuro)  [ ]
- No GitHub Pages os dados ficam no navegador de cada um; o relatório mensal só é confiável num computador "oficial"
  (use o backup para levar os dados). Solução definitiva: login + banco no servidor (item 6 do pendente).
  `infra/persistence.js` já isola o armazenamento, então a troca não mexe em `domain/` nem na tela.

---

## Andamento
| Parte | Estado | Commit |
|---|---|---|
| 1 Estoque de chapas | a fazer | |
| 2 Histórico | a fazer | |
| 3 Relatório mensal | a fazer | |
| 4 Estoque mínimo | a fazer | |
| 5 Importar Promob/SketchUp | a fazer | |
| 6 Exportar ERP | a fazer | |
| 7 Dados compartilhados | futuro | |
