# Corta pra Mim

Plano de corte de MDF para marcenarias pequenas (antes chamado Plano de Corte MDF).

Otimiza o corte de chapas de MDF, reaproveita sobras e gera etiquetas, PDFs e orçamento. JavaScript puro, sem framework.

## Comandos

```
npm install        # uma vez
npm run build           # gera dist/cortapramim.html (o site: arquivo único, com CSP)
npm run build:artefato  # gera dist/cortapramim-artefato.html (para o claude.ai, sem CSP)
npm run lint            # regras de código e de segurança
npm test                # testes unitários (rápidos, sem navegador)
npm run test:e2e        # testes no navegador (Playwright) contra o dist
npm run test:seguranca  # só os testes de segurança (fronteira, campos, injeção)
npm run test:rls        # RLS do banco num Postgres local
npm run audit           # dependências com falha conhecida
npm run test:all        # lint, unitários, build e e2e, em ordem
```

O e2e usa o Chromium do Playwright. Na primeira vez, rode `npx playwright install chromium`. Para usar outro navegador, defina `CHROME_PATH`.

## Onde mexer

| Quero... | Arquivo |
|---|---|
| mudar o algoritmo de corte | `src/core/` |
| mudar uma regra (custo, estoque, limites) | `src/domain/` |
| adicionar um modelo de móvel | `src/domain/models/` (veja `docs/ARQUITETURA.md`) |
| aceitar um dado novo de fora (arquivo, banco) | `src/domain/sanitize.js` e `limites.js` (veja `docs/SEGURANCA.md`) |
| mudar a aparência de um cartão | `src/ui/components/<cartão>/*.css` e `*.html` |
| mudar cores e espaçamentos globais | `src/styles/tokens.css` |
| mudar PDFs | `src/infra/pdf/` |

Documentação em `docs/`:
- `ARQUITETURA.md`: camadas, pastas e as regras que mantêm o código sem quebrar;
- `SEGURANCA.md`: quem pode atacar, as travas e como testar;
- `plano/IMPLEMENTADO.md` e `plano/A-FAZER.md`: o que está feito e o que falta, por partes.

Compatibilidade: o identificador dos backups (`plano-corte-mdf`) e as chaves do navegador (`plano-mdf-*`) mantêm o nome
antigo de propósito, para continuar lendo os dados já guardados.
