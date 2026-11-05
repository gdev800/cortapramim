// Lê o relatório TAP do `node --test` e escreve cada teste que falhou como anotação do GitHub Actions.
// As anotações aparecem na página da execução sem precisar abrir o log (que exige login).
// Uso no CI: node scripts/anotar-falhas.mjs relatorio.tap "Testes no navegador"
import { readFileSync, existsSync } from 'node:fs';

const [arquivo, titulo = 'Teste'] = process.argv.slice(2);
if (!arquivo || !existsSync(arquivo)) { console.log('Sem relatório: ' + arquivo); process.exit(0); }

const linhas = readFileSync(arquivo, 'utf8').split('\n');
// formato: ::error file=...,line=...,title=...::mensagem (propriedades separadas por vírgula, com escape)
const limpar = (s) => s.replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A').slice(0, 900);
const prop = (s) => limpar(s).replace(/:/g, '%3A').replace(/,/g, '%2C');
let n = 0;
for (let i = 0; i < linhas.length; i++) {
  const m = /^\s*not ok \d+ - (.+)$/.exec(linhas[i]);
  if (!m || /\.test\.js$/.test(m[1])) continue; // a linha do arquivo inteiro repete as falhas de dentro
  const det = [];
  let local = '';
  for (let j = i + 1; j < Math.min(i + 40, linhas.length) && !/^\s*(not )?ok \d+/.test(linhas[j]); j++) {
    const t = linhas[j].trim();
    if (/^location:/.test(t)) local = t.replace(/^location:\s*'?|'$/g, '');
    if (/^(error|expected|actual|message|code):/.test(t) || /^(AssertionError|Error)/.test(t)) det.push(t);
  }
  const arq = /([^/]+\/[^/]+\/[^/]+\.test\.js):(\d+)/.exec(local);
  const props = (arq ? [`file=tests/${arq[1]}`, `line=${arq[2]}`] : []).concat('title=' + prop(titulo + ' - ' + m[1]));
  console.log(`::error ${props.join(',')}::${limpar(det.join('\n') || m[1])}`);
  n++;
}
console.log(n ? n + ' teste(s) falharam.' : 'Nenhuma falha no relatório.');
