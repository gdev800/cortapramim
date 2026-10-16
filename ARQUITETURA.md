# Arquitetura

## Camadas (cada uma só enxerga a de baixo)

```
ui/       telas e eventos (DOM)
infra/    coisas do mundo: armazenamento, PDF, xlsx, imagem
domain/   regras do negócio, funções puras que recebem o `state`
core/     motor de corte: sem DOM, sem estado, roda em Node
```

Analogia: `core` é o motor do carro, `domain` o painel de regras (pode ou não pode), `infra` as peças que falam com fora (posto, oficina), `ui` o painel e os pedais. Trocar o painel não mexe no motor.

- **core**: `planejar()` recebe grupos de peças e devolve chapas, cortes e sobras. Testável em Node.
- **domain**: `coletar(state)`, `custos()`, `necessidades()`, `trocarUnidade()` etc. Nada de `document`.
- **infra**: `persistence` (conta na nuvem ou navegador), `pdf/*`, `xlsx`, `raster`.
  `auth` + `supabase/` (login com Supabase Auth, só fora do claude.ai; `ctx.auth` e evento `auth` no barramento).
- **ui**: `context` (estado, barramento, serviços), `app` (monta a página), `components/*`.

## Motor de corte (core), em etapas

1. **Sobras do estoque** (`scrap.js`): as maiores primeiro, cheias com o que couber.
2. **Partição** (`shelf.js`): divide as peças restantes em chapas por prateleiras. `particoes()` devolve algumas divisões diferentes.
3. **Otimização de cada chapa** (`anneal.js`): têmpera simulada sobre a árvore de cortes (guilhotina). Movimentos: trocar peças,
   inverter direção, girar, reagrupar uma cadeia de cortes (`reagrupar`) e levar uma peça para outro lugar (`realocar`).
4. **Consolidação** (`consolidate.js`): peças das últimas chapas sobem para as primeiras.
5. **Absorção** (`absorb.js`): se a chapa menos usada ficou abaixo de 40%, tenta passar as peças dela para as outras, rearrumando-as.
6. **Chapas repetidas** (`repeat.js`): procura um desenho que sirva para k chapas (1/k de cada medida) e replaneja o resto; aceita se não gastar chapa a mais.

Opções em `cfg` (todas ligadas por padrão; `false` volta ao jeito antigo):

| Opção | O que faz |
|---|---|
| `sobraUnica` | retalho partido vale menos que o mesmo espaço num pedaço só; com fases limitadas, conta a sobra tira por tira, igual à montagem |
| `tentativas` | com 2+ chapas novas, roda até 4 tentativas curtas e fica com a de menos chapas (empate: sobra mais concentrada) |
| `consolidar` | etapa 4 |
| `absorver` | etapa 5 (segue `consolidar` se não vier explícito) |
| `repetir` | etapa 6 (`repeat.js`): mesmo desenho em várias chapas quando não gasta chapa a mais; reserva 40% do tempo |

Cada material no resultado traz `minNovas` (mínimo de chapas novas só pela área) e `areaNovas` (área das peças em chapas, ex.: 2,97).

## Componentes

Cada componente exporta `{ template(ctx), mount(ctx) }`:
- `template` devolve o HTML (vem do `.html` da pasta);
- `mount` liga eventos e se inscreve no barramento.

**Regra de ouro:** componentes não importam uns aos outros. Falam por `ctx.bus` (eventos) e `ctx.actions` (comandos). Assim dá para trocar ou apagar um cartão sem quebrar os outros.

### Eventos do barramento

| Evento | Quando |
|---|---|
| `loaded` | um trabalho inteiro foi carregado no estado |
| `unit` (`{ratio, cv}`) | unidade trocou (cm/mm) |
| `blocks` / `edited` | chapas/peças mudaram (estrutura / digitação) |
| `estoque` / `insumos` / `projetos` | listas guardadas mudaram |
| `needs` | ferragens do projeto mudaram |
| `result` | novo plano calculado |
| `approved` | plano aprovado ou reaberto |
| `msg` (`{text, kind}`) | mensagem principal |
| `note`, `storage`, `touched`, `dl` | avisos de armazenamento/download |

### Comandos (`ctx.actions`)
`calcular(segundos?, silencioso?)` (Calculator), `carregarExemplo()` (EntryPanel), e os que cada projeto/modelo registra.

## Como adicionar...

**Um componente novo:** crie `ui/components/meu/` com `template.html`, `index.js` (`template`, `mount`) e opcional `meu.css`; inclua na lista `PAGINA` de `ui/app.js`.

**Um modelo de móvel:** crie `domain/models/meu.js` seguindo `balcao.js` e inclua em `models/index.js`. O cartão e o formulário aparecem sozinhos.

**Um cálculo novo:** escreva em `domain/` como função pura `(state) => resultado`, teste em `tests/unit`, e só então chame de um componente.

## Estado

Um único objeto `state` (formato em `domain/state.js`). Só `domain/` e os componentes o alteram; depois de alterar, emitem o evento certo.

## Build

`scripts/build.mjs` usa esbuild: junta JS e CSS e embute tudo em `dist/plano-corte-mdf.html`. Bibliotecas de PDF e Excel vêm de CDN (tags no `src/index.template.html`).

## Testes

- `tests/unit`: core e domain, sem navegador.
- `tests/e2e`: abre o `dist` no navegador, mexe nos botões e confere o resultado. Usa `window.__pc` (`state`, `coletar`, `calcular`) como atalho.

## Rumo ao público (ainda não feito)

Falta: login, banco no servidor (hoje: navegador ou conta da plataforma), hospedagem, política de privacidade. A camada `infra/persistence.js` já isola o armazenamento, então trocar por uma API não mexe em `domain/` nem nos componentes.
