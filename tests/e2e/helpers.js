import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const DIST = 'file://' + join(raiz, 'dist/cortapramim.html');
/** Versão do claude.ai (sem CSP): os testes de injeção usam esta, para que um escape faltando apareça de verdade. */
export const DIST_ARTEFATO = 'file://' + join(raiz, 'dist/cortapramim-artefato.html');

/**
 * Abre o app construído (dist, o mesmo arquivo do site, com CSP) sem rede.
 * Todas as bibliotecas já vêm embutidas; fontes e qualquer outro endereço externo são bloqueados.
 * `violacoesCsp` junta os avisos de CSP do console: o teste de segurança espera que só apareçam nos ataques.
 */
export async function abrirApp({ viewport, antes, arquivo = DIST } = {}) {
  const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ['--no-proxy-server'] });
  const page = await browser.newPage(viewport ? { viewport } : undefined);
  const erros = [], violacoesCsp = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) violacoesCsp.push(m.text()); });
  await page.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  if (antes) await antes(page);
  await page.goto(arquivo);
  await page.waitForFunction(() => window.__pc && window.__pc.state.res, null, { timeout: 30000 });
  return { browser, page, erros, violacoesCsp, fechar: () => browser.close() };
}
