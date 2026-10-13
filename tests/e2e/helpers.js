import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const DIST = 'file://' + join(raiz, 'dist/plano-corte-mdf.html');
const LIBS = [['jspdf.umd', 'node_modules/jspdf/dist/jspdf.umd.min.js'], ['autotable', 'node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js'], ['xlsx.full', 'node_modules/xlsx/dist/xlsx.full.min.js']];

/** Abre o app construído (dist) sem rede: as bibliotecas de CDN vêm do node_modules. */
export async function abrirApp({ viewport } = {}) {
  const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ['--no-proxy-server'] });
  const page = await browser.newPage(viewport ? { viewport } : undefined);
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.route('**/*', (r) => {
    const u = r.request().url();
    const lib = LIBS.find(([k]) => u.includes(k));
    if (lib) return r.fulfill({ path: join(raiz, lib[1]), contentType: 'text/javascript' });
    if (u.startsWith('file:')) return r.continue();
    return r.abort();
  });
  await page.goto(DIST);
  await page.waitForFunction(() => window.__pc && window.__pc.state.res, null, { timeout: 30000 });
  return { browser, page, erros, fechar: () => browser.close() };
}
