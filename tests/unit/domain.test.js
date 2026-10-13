import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, newBlock } from '../../src/domain/state.js';
import { restore, snapshot, EXEMPLO } from '../../src/domain/snapshot.js';
import { coletar, MAX_POR_LINHA } from '../../src/domain/collect.js';
import { trocarUnidade } from '../../src/domain/unit-change.js';
import { pIn, toStr, slug, money } from '../../src/domain/units.js';
import { adicionarInsumo, definirQuantidade, insumoValido } from '../../src/domain/supplies.js';
import { cadastrarSobra, sobrasDoBloco } from '../../src/domain/scraps.js';
import { custos } from '../../src/domain/costs.js';
import { tempoSegundos, cfgDoMotor } from '../../src/domain/estimate.js';
import { MODELOS, abrirModelo, gerarModelo } from '../../src/domain/models/index.js';
import { lerPacote, montarPacote } from '../../src/domain/backup.js';
import { resumoAndamento, stNome } from '../../src/domain/status.js';
import { linhasParaTexto } from '../../src/infra/xlsx.js';

const novo = () => { const s = createState(); restore(s, EXEMPLO); return s; };

test('units: leitura e formatação', () => {
  assert.equal(pIn('54,3'), 54.3);
  assert.equal(toStr(54.3), '54,3');
  assert.equal(slug('Guarda-Roupa Ñ!'), 'guarda-roupa-n');
  assert.match(money(10), /10,00/);
});

test('exemplo carrega e coleta sem erros', () => {
  const s = novo(); const c = coletar(s);
  assert.deepEqual(c.erros, []); assert.ok(c.groups.length >= 1);
});

test('coletar: limites de quantidade', () => {
  const s = novo(); s.blocks = [newBlock(s)]; s.blocks[0].mode = 'paste'; s.blocks[0].paste = '1000000000 = 10 x 10';
  assert.ok(coletar(s).erros.length > 0);
  s.blocks[0].paste = (MAX_POR_LINHA + 1) + ' = 10 x 10';
  assert.ok(coletar(s).erros.length > 0);
});

test('trocar unidade converte e volta sem perder', () => {
  const s = novo(); const antes = JSON.stringify(s.blocks);
  const r = trocarUnidade(s, 'mm'); assert.ok(r); assert.equal(trocarUnidade(s, 'mm'), null);
  trocarUnidade(s, 'cm'); assert.equal(JSON.stringify(s.blocks), antes);
});

test('snapshot/restore ida e volta', () => {
  const s = novo(); const snap = JSON.parse(JSON.stringify(snapshot(s)));
  const t = createState(); restore(t, snap);
  assert.equal(t.blocks.length, s.blocks.length);
});

test('insumos: soma, valida e limita', () => {
  const s = createState();
  assert.ok(adicionarInsumo(s, { tipo: 'fita', nome: '', q: '5' }).erro);
  assert.ok(adicionarInsumo(s, { tipo: 'fita', nome: 'Fita', q: '1e400' }).erro);
  adicionarInsumo(s, { tipo: 'fita', nome: 'Fita', q: '5' });
  assert.equal(adicionarInsumo(s, { tipo: 'fita', nome: ' fita ', q: '2' }).somou, true);
  assert.equal(s.insumos[0].q, 7);
  definirQuantidade(s, s.insumos[0].id, '-3'); assert.equal(s.insumos[0].q, 0);
  assert.equal(insumoValido({ id: 'a', nome: 'x', tipo: 'fita', q: 'abc' }), false);
});

test('sobras: cadastro e filtro por bloco', () => {
  const s = createState(); s.unit = 'cm';
  assert.ok(cadastrarSobra(s, { nome: '', esp: 15, c: 10, l: 10, q: 1, veio: true }).erro);
  cadastrarSobra(s, { nome: 'Branco', esp: 15, c: 100, l: 50, q: 2, veio: true });
  assert.equal(s.estoque.length, 2); assert.equal(s.estoque[0].c, 1000);
  const b = newBlock(s); b.nome = 'branco'; b.esp = '15'; b.veio = true; b.usarSobras = true;
  assert.equal(sobrasDoBloco(s, b).length, 2);
  b.esp = '18'; assert.equal(sobrasDoBloco(s, b).length, 0);
});

test('estimate: limites do motor', () => {
  assert.equal(tempoSegundos('abc'), 15); assert.equal(tempoSegundos('9999'), 300); assert.equal(tempoSegundos('0'), 15);
  const c = cfgDoMotor({ K: '500', minRet: '-1', refilo: '2000' });
  assert.deepEqual([c.K, c.minRet, c.refilo], [30, 0, 100]);
});

test('custos sem margem não gera preço de venda', () => {
  const r = custos({ groups: [{ nNovas: 2, preco: 100, fitaPreco: 0, sheets: [], pieces: [] }] }, [{ q: '4', p: '5' }], { mao: '50', margem: '' });
  assert.equal(r.custo, 270); assert.equal(r.venda, 0);
});

test('todos os modelos geram peças', () => {
  const s = createState();
  MODELOS.forEach((m) => {
    const model = abrirModelo(m);
    const g = gerarModelo(model);
    assert.ok(g && (g.pecas || g.length || Object.keys(g).length), m.id);
  });
});

test('backup: pacote ida e volta e lixo rejeitado', () => {
  const s = novo();
  const ok = lerPacote(JSON.stringify(montarPacote(s))); assert.ok(ok.d);
  assert.ok(lerPacote('{{{').erro); assert.ok(lerPacote('{"app":"outro"}').erro);
});

test('status', () => {
  assert.equal(stNome('montado'), 'Montado'); assert.equal(stNome('xx'), 'Orçado');
  assert.deepEqual(resumoAndamento([{ status: 'aprovado', valor: 10 }, { status: 'entregue', valor: 5 }]), { n: 1, valor: 10 });
});

test('xlsx: linhas viram texto com cabeçalho reconhecido', () => {
  const t = linhasParaTexto([['Qtde', 'C', 'L', 'Nome'], [2, 220, 55, 'Lateral']]);
  assert.match(t, /2\t220\t55\tLateral/);
});
