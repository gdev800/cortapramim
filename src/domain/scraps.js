// Estoque de sobras (retalhos guardados).
import { norm, pIn, fac } from './units.js';
import { RETALHO_MIN_LISTA } from '../core/constants.js';

let seq = 0;
export const newSid = () => 's' + Date.now().toString(36) + (++seq);

/** Sobras do estoque que servem para uma chapa: mesmo nome, mesma espessura e, se a chapa tem veio, sobra com veio. */
export function sobrasDoBloco(state, b) {
  if (!b.usarSobras || !norm(b.nome)) return [];
  const esp = pIn(b.esp) || 0;
  return state.estoque.filter((s) => norm(s.nome) === norm(b.nome) && Math.abs((s.esp || 0) - esp) < 0.01 && (!b.veio || s.veio));
}

/** Sobras do estoque que parecem servir para a chapa mas não servem, com o motivo (nome diferente, espessura, veio). */
export function sobrasDescartadas(state, b) {
  const nome = norm(b.nome);
  if (!nome) return [];
  const esp = pIn(b.esp) || 0, out = [];
  state.estoque.forEach((s) => {
    const n = norm(s.nome), igual = n === nome;
    if (!igual && !(n && (n.includes(nome) || nome.includes(n)))) return;
    const espOk = Math.abs((s.esp || 0) - esp) < 0.01, veioOk = !b.veio || !!s.veio;
    if (igual && espOk && veioOk) return; // essa serve
    const motivos = [];
    if (!igual) motivos.push('o nome é "' + s.nome + '"');
    if (!espOk) motivos.push('tem ' + s.esp + ' mm (a chapa é ' + esp + ' mm)');
    if (!veioOk) motivos.push('não tem veio e a chapa tem');
    out.push({ sobra: s, motivos });
  });
  return out;
}

/** Quanto de chapa nova o plano evitou por usar sobras: peças que saíram de retalho, em área, chapas equivalentes e valor. */
export function economiaSobras(res) {
  const r = { nSobras: 0, nPecas: 0, areaPecas: 0, chapasEq: 0, valor: 0 };
  if (!res) return r;
  res.groups.forEach((g) => g.sheets.forEach((s) => {
    if (!s.sobra) return;
    const eq = s.area / (g.cfg.SW * g.cfg.SH);
    r.nSobras++; r.nPecas += s.pecas.length; r.areaPecas += s.area; r.chapasEq += eq; r.valor += eq * (g.preco || 0);
  }));
  return r;
}

function sobraDe(state, g, r) {
  return {
    nome: g.mat, esp: g.esp, c: Math.round(g.veio ? r.w : Math.max(r.w, r.h)), l: Math.round(g.veio ? r.h : Math.min(r.w, r.h)),
    veio: g.veio, obs: 'sobra do projeto ' + (state.proj.nome || ''),
  };
}

/** Todos os retalhos de uma chapa que dá para guardar (lado menor de pelo menos RETALHO_MIN_LISTA). i = posição em sheet.restos. */
export function retalhosDaChapa(sheet) {
  return (sheet.restos || [])
    .map((r, i) => ({ i, w: r.w, h: r.h, util: !!r.util, guardado: !!r.guardado }))
    .filter((r) => Math.min(r.w, r.h) >= RETALHO_MIN_LISTA);
}

/** Guarda um retalho da chapa `n` no estoque de sobras, qualquer que seja o tamanho. Não duplica. */
export function guardarRetalho(state, n, i) {
  if (!state.res) return { ok: false, msg: 'Calcule o plano primeiro.' };
  for (const g of state.res.groups) {
    for (const s of g.sheets) {
      if (s.n !== n) continue;
      const r = s.restos[i];
      if (!r || Math.min(r.w, r.h) < RETALHO_MIN_LISTA) return { ok: false, msg: 'Esse retalho é pequeno demais para guardar.' };
      if (r.guardado) return { ok: false, msg: 'Esse retalho já foi guardado.' };
      const novo = sobraDe(state, g, r); novo.id = newSid();
      state.estoque.push(novo); r.guardado = true;
      return { ok: true, msg: 'Retalho de ' + novo.c + ' × ' + novo.l + ' mm guardado no estoque de sobras.' };
    }
  }
  return { ok: false, msg: 'Chapa não encontrada.' };
}

/** O que muda no estoque se este plano for aprovado: sobras usadas saem, retalhos úteis entram. */
export function pendEstoque(state) {
  const usados = [], novos = [];
  state.res.groups.forEach((g) => {
    g.sheets.forEach((s) => {
      if (s.sobra) usados.push(s.sobra.id);
      s.restos.forEach((r) => {
        if (!r.util || r.guardado) return; // os já guardados à mão não entram de novo
        novos.push(sobraDe(state, g, r));
      });
    });
  });
  return { usados, novos };
}

/** Aplica no estoque o que pendEstoque() calculou. */
export function aplicarPlanoNoEstoque(state) {
  const pe = pendEstoque(state), gone = new Set(pe.usados);
  state.estoque = state.estoque.filter((s) => !gone.has(s.id));
  pe.novos.forEach((n) => { n.id = newSid(); state.estoque.push(n); });
  state.res.groups.forEach((g) => g.sheets.forEach((s) => s.restos.forEach((r) => { if (r.util) r.guardado = true; })));
  state.estAtual = true;
}

/**
 * Cadastra sobras a mão. Medidas vêm na unidade da tela.
 * @returns {{erro?: string, n?: number}}
 */
export function cadastrarSobra(state, { nome, esp, c, l, q, veio }) {
  const mm = { c: pIn(c) * fac(state.unit), l: pIn(l) * fac(state.unit) };
  const qtd = Math.max(1, parseInt(q, 10) || 1);
  if (!String(nome).trim() || !(mm.c > 0) || !(mm.l > 0)) return { erro: 'Informe o nome da chapa e as duas medidas.' };
  const n = Math.min(qtd, 50);
  for (let i = 0; i < n; i++) {
    state.estoque.push({ id: newSid(), nome: String(nome).trim(), esp: pIn(esp) || 0, c: Math.round(mm.c * 100) / 100, l: Math.round(mm.l * 100) / 100, veio: !!veio, obs: '' });
  }
  return { n };
}
