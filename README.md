# Plano de Corte MDF

Otimiza o corte de chapas de MDF, reaproveita sobras e gera etiquetas, PDFs e orçamento. JavaScript puro, sem framework.

## Comandos

```
npm install        # uma vez
npm run build      # gera dist/plano-corte-mdf.html (arquivo único, CSS e JS embutidos)
npm test           # testes unitários (rápidos, sem navegador)
npm run test:e2e   # testes no navegador (Playwright) contra o dist
npm run test:all   # tudo, em ordem
```

O e2e usa o Chromium do Playwright. Na primeira vez, rode `npx playwright install chromium`. Para usar outro navegador, defina `CHROME_PATH`.

## Onde mexer

| Quero... | Arquivo |
|---|---|
| mudar o algoritmo de corte | `src/core/` |
| mudar uma regra (custo, estoque, limites) | `src/domain/` |
| adicionar um modelo de móvel | `src/domain/models/` (veja ARQUITETURA.md) |
| mudar a aparência de um cartão | `src/ui/components/<cartão>/*.css` e `*.html` |
| mudar cores e espaçamentos globais | `src/styles/tokens.css` |
| mudar PDFs | `src/infra/pdf/` |

Veja `ARQUITETURA.md` para as camadas e as regras que mantêm o código sem quebrar.
