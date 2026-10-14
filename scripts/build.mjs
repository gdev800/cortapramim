// Gera dist/plano-corte-mdf.html: um único arquivo com CSS e JS embutidos, compactado.
// Uso: node scripts/build.mjs        (compactado, é o que vai para o site)
//      node scripts/build.mjs --dev  (legível, para depurar)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const r = await build({
  entryPoints: [join(raiz, 'src/main.js')],
  bundle: true, write: false, format: 'iife', target: 'es2020', outdir: join(raiz, 'dist/tmp'),
  loader: { '.html': 'text' }, legalComments: 'none',
  // compacta por padrão (a biblioteca do Supabase triplicava o arquivo); --dev gera legível para depurar
  minify: !process.argv.includes('--dev'), keepNames: true,
  logLevel: 'warning',
});
const saida = (ext) => r.outputFiles.find((f) => f.path.endsWith(ext)).text;
const css = saida('.css'), js = saida('.js').replace(/<\/script/gi, '<\\/script');
const tpl = readFileSync(join(raiz, 'src/index.template.html'), 'utf8');
const html = tpl.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);
mkdirSync(join(raiz, 'dist'), { recursive: true });
writeFileSync(join(raiz, 'dist/plano-corte-mdf.html'), html);
console.log('dist/plano-corte-mdf.html', (html.length / 1024).toFixed(0) + ' KB');
