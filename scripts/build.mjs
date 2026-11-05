// Gera um único arquivo HTML com CSS e JS embutidos, compactado. Todas as bibliotecas (jsPDF, leitor de Excel,
// Supabase) vêm do node_modules com versão fixa: nada de script de CDN.
//
// Uso: node scripts/build.mjs             -> dist/cortapramim.html (site: com CSP e cabeçalho HTML completo)
//      node scripts/build.mjs --artefato  -> dist/cortapramim-artefato.html (claude.ai: sem CSP, a plataforma injeta scripts)
//      node scripts/build.mjs --dev       (legível, para depurar; combina com os dois acima)
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const artefato = process.argv.includes('--artefato');

const r = await build({
  entryPoints: [join(raiz, 'src/main.js')],
  bundle: true, write: false, format: 'iife', target: 'es2020', outdir: join(raiz, 'dist/tmp'),
  loader: { '.html': 'text' }, legalComments: 'none',
  // partes opcionais do jsPDF que o app não usa (doc.html, SVG): ficam fora e o arquivo não incha
  external: ['html2canvas', 'dompurify', 'canvg'],
  // compacta por padrão (a biblioteca do Supabase triplicava o arquivo); --dev gera legível para depurar
  minify: !process.argv.includes('--dev'), keepNames: true,
  logLevel: 'warning',
});
const saida = (ext) => r.outputFiles.find((f) => f.path.endsWith(ext)).text;
const css = saida('.css'), js = saida('.js').replace(/<\/script/gi, '<\\/script');
const tpl = readFileSync(join(raiz, 'src/index.template.html'), 'utf8');
let html = tpl.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);

if (!artefato) html = cabecalhoDoSite(js) + html + '</html>\n';

const nome = artefato ? 'cortapramim-artefato.html' : 'cortapramim.html';
mkdirSync(join(raiz, 'dist'), { recursive: true });
writeFileSync(join(raiz, 'dist', nome), html);
console.log('dist/' + nome, (html.length / 1024).toFixed(0) + ' KB' + (artefato ? ' (sem CSP, para o claude.ai)' : ' (com CSP)'));

/**
 * CSP (Content Security Policy): o navegador só executa o script embutido cujo hash está aqui.
 * Um <script> ou onerror="..." injetado por algum texto não roda, mesmo que um esc() fique faltando.
 * Analogia: é o gabarito da furadeira; mesmo com a mão escorregando, a broca só entra no furo marcado.
 * frame-ancestors e HSTS só funcionam como cabeçalho HTTP: ficam para a hospedagem nova (docs/plano/A-FAZER.md).
 */
function cabecalhoDoSite(script) {
  const hash = createHash('sha256').update(script, 'utf8').digest('base64');
  const supa = new URL(/SUPABASE_URL\s*=\s*'([^']+)'/.exec(readFileSync(join(raiz, 'src/infra/supabase/config.js'), 'utf8'))[1]);
  const csp = [
    "default-src 'none'",
    `script-src 'sha256-${hash}'`,
    "style-src 'unsafe-inline' https://fonts.googleapis.com", // a tela usa style="" nos templates
    'font-src https://fonts.gstatic.com',
    "img-src 'self' data: blob:",
    `connect-src ${supa.origin} wss://${supa.host}`,
    'worker-src blob:', // o leitor de Excel lê a planilha num Worker
    "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-src 'none'",
  ].join('; ');
  return '<!doctype html>\n<html lang="pt-BR">\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    `<meta http-equiv="Content-Security-Policy" content="${csp}">\n` +
    '<meta name="referrer" content="strict-origin-when-cross-origin">\n';
}
