// Recomeçar (domain/recomecar.js): o que sai e o que fica ao limpar o plano ou o trabalho inteiro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../../src/domain/state.js';
import { restore, EXEMPLO } from '../../../src/domain/snapshot.js';
import { contarPecas, resumoDoTrabalho, fotoSemPlano, fotoDoZero, guardarParaDesfazer, PROP_DA_OFICINA } from '../../../src/domain/recomecar.js';

function trabalhoCheio() {
  const s = createState(); restore(s, EXEMPLO);
  s.unit = 'mm'; s.aj = { ...s.aj, K: '4', refilo: '10', tempo: '40', fitaEsp: '1', fases: '2' };
  s.prop = { ...s.prop, marcenaria: 'Marcenaria do Gilmar', contato: '11 9999-0000', pagamento: '50% na entrada', prazo: '30 dias', validade: '20', mostrarMat: false,
    cliente: 'Dona Maria', servico: 'Cozinha', itens: 'Corpo\nPortas', valor: '5000' };
  s.orc = { mao: '1200', margem: '30' };
  s.proj = { id: 'p1', nome: 'Cozinha da Maria' }; s.status = 'aprovado';
  s.res = { groups: [{ mat: 'Branco', sheets: [] }] }; s.approved = true; s.estAtual = true;
  return s;
}

test('fotoDoZero: tira o trabalho, mantém o que é da oficina', () => {
  const s = trabalhoCheio();
  const d = fotoDoZero(s);
  const n = createState(); restore(n, d);
  // fica
  assert.equal(n.unit, 'mm');
  assert.equal(n.aj.K, '4'); assert.equal(n.aj.refilo, '10'); assert.equal(n.aj.tempo, '40'); assert.equal(n.aj.fitaEsp, '1'); assert.equal(n.aj.fases, '2');
  PROP_DA_OFICINA.forEach((k) => assert.deepEqual(n.prop[k], s.prop[k], k));
  assert.equal(n.orc.margem, '30');
  // sai
  assert.equal(n.blocks.length, 1);
  assert.equal(contarPecas(n.blocks[0]), 0);
  assert.deepEqual(n.ferr, []);
  for (const k of ['cliente', 'servico', 'itens', 'valor']) assert.equal(n.prop[k], '', k);
  assert.equal(n.orc.mao, '');
  assert.deepEqual(n.proj, { id: null, nome: '' });
  assert.equal(n.status, 'orcado');
  assert.equal(n.res, null);
  assert.equal(n.approved, false);
});

test('antes, "Começar do zero" voltava unidade e serra ao padrão; a foto nova não', () => {
  const s = trabalhoCheio();
  const antigo = createState(); restore(antigo, { blocks: [{}] });
  assert.equal(antigo.unit, 'cm');            // o comportamento antigo (registrado para comparação)
  assert.notEqual(antigo.aj.K, '4');
  const novo = createState(); restore(novo, fotoDoZero(s));
  assert.equal(novo.unit, 'mm');
  assert.equal(novo.aj.K, '4');
});

test('fotoSemPlano: mesmas peças e cliente, sem o plano', () => {
  const s = trabalhoCheio();
  const n = createState(); restore(n, fotoSemPlano(s));
  assert.equal(n.res, null);
  assert.equal(n.blocks.length, s.blocks.length);
  assert.equal(n.blocks.reduce((t, b) => t + contarPecas(b), 0), s.blocks.reduce((t, b) => t + contarPecas(b), 0));
  assert.equal(n.prop.cliente, 'Dona Maria');
  assert.equal(n.proj.id, 'p1');
});

test('guardarParaDesfazer devolve o trabalho com plano e as marcas', () => {
  const s = trabalhoCheio();
  const a = guardarParaDesfazer(s);
  assert.equal(a.aprovado, true);
  assert.equal(a.estAtual, true);
  const n = createState(); restore(n, a.foto);
  assert.ok(n.res && n.res.groups.length);
  assert.equal(n.proj.nome, 'Cozinha da Maria');
});

test('contarPecas: digitadas (quantidade) e coladas', () => {
  assert.equal(contarPecas({ mode: 'form', rows: [{ q: '2', c: '50', l: '30' }, { q: '', c: '40', l: '' }, { q: '5', c: '', l: '' }] }), 3);
  assert.equal(contarPecas({ mode: 'paste', paste: '2 = 50 x 30 = A\n3\t40\t20\tB\nlixo' }), 5);
  assert.equal(contarPecas(null), 0);
});

test('resumoDoTrabalho: conta o que sai e reconhece o trabalho vazio', () => {
  const r = resumoDoTrabalho(trabalhoCheio());
  assert.ok(r.pecas > 0 && r.chapas > 0);
  assert.equal(r.temPlano, true); assert.equal(r.aprovado, true); assert.equal(r.estoqueAtualizado, true);
  assert.equal(r.projeto, 'Cozinha da Maria');
  assert.equal(r.cliente, 'Dona Maria');
  assert.equal(r.vazio, false);
  const v = createState(); restore(v, { blocks: [{}] });
  assert.equal(resumoDoTrabalho(v).vazio, true);
});
