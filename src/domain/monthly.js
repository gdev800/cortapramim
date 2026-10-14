// Relatório mensal: soma o histórico de movimentações por mês. Funções puras, sem DOM.
// Analogia: o histórico é o extrato do banco; aqui fazemos o "fechamento do mês".
// O mês de cada movimento é o do horário local (o mesmo que a tela mostra).
import { toStr } from './units.js';

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const r2 = (v) => Math.round(v * 100) / 100;
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Ano e mês (1–12) de um movimento, ou null se a data não vale. */
export function mesDe(m) {
  const d = new Date(m && m.data);
  return isNaN(d) ? null : { ano: d.getFullYear(), mes: d.getMonth() + 1 };
}

/** Volta (ou avança) `delta` meses a partir de ano/mês, cuidando da virada de ano. */
export function somarMeses(ano, mes, delta) {
  const t = ano * 12 + (mes - 1) + delta;
  return { ano: Math.floor(t / 12), mes: (t % 12) + 1 };
}

export const rotuloMes = (ano, mes) => MESES[mes - 1] + ' de ' + ano;
export const rotuloCurto = (ano, mes) => MESES[mes - 1].slice(0, 3) + '/' + String(ano).slice(-2);

/**
 * Soma as saídas (e conta entradas/ajustes) de um mês.
 * @param {object[]} historico state.historico
 * @param {number} ano ex.: 2026
 * @param {number} mes 1 a 12
 */
export function resumoDoMes(historico, ano, mes) {
  const r = {
    ano, mes, rotulo: rotuloMes(ano, mes), projetos: 0, nomesProjetos: [], pecas: 0, chapas: 0, porMaterial: [],
    sobrasUsadas: 0, sobrasNovas: 0, fitaM: 0, ferragens: [], areaPecas: 0, areaChapas: 0, areaPerda: 0,
    aproveitamento: null, custo: 0, economia: 0, entradas: 0, ajustes: 0, vazio: true,
  };
  const mats = new Map(), ferr = new Map();
  (historico || []).forEach((m) => {
    const k = mesDe(m);
    if (!k || k.ano !== ano || k.mes !== mes) return;
    if (m.tipo === 'entrada') { r.entradas++; return; }
    if (m.tipo === 'ajuste') { r.ajustes++; return; }
    if (m.tipo !== 'saida') return;
    r.projetos++;
    if (m.projeto && !r.nomesProjetos.includes(m.projeto)) r.nomesProjetos.push(m.projeto);
    r.pecas += num(m.pecas);
    (m.chapas || []).forEach((c) => {
      const chave = String(c.nome || '').trim().toLowerCase() + '|' + num(c.esp);
      const it = mats.get(chave) || { nome: String(c.nome || '').trim() || 'Sem nome', esp: num(c.esp), chapas: 0, projetos: 0, _ult: null };
      it.chapas += num(c.q);
      if (it._ult !== m) { it.projetos++; it._ult = m; }
      mats.set(chave, it); r.chapas += num(c.q);
    });
    r.sobrasUsadas += num(m.sobrasUsadas); r.sobrasNovas += num(m.sobrasNovas); r.fitaM += num(m.fitaM);
    (m.ferragens || []).forEach((f) => {
      const chave = String(f.nome || '').trim().toLowerCase();
      const it = ferr.get(chave) || { nome: String(f.nome || '').trim(), q: 0 };
      it.q += num(f.q); ferr.set(chave, it);
    });
    r.areaPecas += num(m.areaPecas); r.areaChapas += num(m.areaChapas); r.areaPerda += num(m.areaPerda);
    r.custo += num(m.custo); r.economia += num(m.economia);
  });
  r.porMaterial = [...mats.values()].map(({ _ult, ...x }) => x).sort((a, b) => b.chapas - a.chapas || a.nome.localeCompare(b.nome, 'pt-BR') || a.esp - b.esp);
  r.ferragens = [...ferr.values()].sort((a, b) => b.q - a.q || a.nome.localeCompare(b.nome, 'pt-BR'));
  ['fitaM', 'areaPecas', 'areaChapas', 'areaPerda', 'custo', 'economia'].forEach((k) => { r[k] = r2(r[k]); });
  // aproveitamento médio ponderado pela área: área das peças / área das chapas (em %)
  r.aproveitamento = r.areaChapas > 0 ? Math.round((r.areaPecas / r.areaChapas) * 1000) / 10 : null;
  r.vazio = r.projetos === 0 && r.entradas === 0 && r.ajustes === 0;
  return r;
}

/**
 * Os últimos `n` meses terminando em ate (padrão: mês atual), do mais antigo para o mais novo.
 * @returns {{ano,mes,rotulo,pecas,chapas,projetos,aproveitamento,economia,custo,fitaM}[]}
 */
export function serieMensal(historico, n, ate) {
  const fim = ate || { ano: new Date().getFullYear(), mes: new Date().getMonth() + 1 };
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const { ano, mes } = somarMeses(fim.ano, fim.mes, -i), s = resumoDoMes(historico, ano, mes);
    out.push({ ano, mes, rotulo: rotuloCurto(ano, mes), pecas: s.pecas, chapas: s.chapas, projetos: s.projetos, aproveitamento: s.aproveitamento, economia: s.economia, custo: s.custo, fitaM: s.fitaM });
  }
  return out;
}

const brl = (v) => 'R$ ' + num(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const formatarReais = brl;

/** Os cartões do topo (texto pronto para a tela e o PDF). */
export function cartoesDoMes(r) {
  return [
    { k: 'pecas', rotulo: 'Peças cortadas', valor: toStr(r.pecas), sub: r.projetos + (r.projetos === 1 ? ' projeto' : ' projetos') },
    { k: 'chapas', rotulo: 'Chapas novas', valor: toStr(r.chapas), sub: toStr(r.areaChapas) + ' m² de chapa' },
    { k: 'aprov', rotulo: 'Aproveitamento', valor: r.aproveitamento == null ? '–' : toStr(r.aproveitamento) + '%', sub: toStr(r.areaPerda) + ' m² de perda' },
    { k: 'fita', rotulo: 'Fita de borda', valor: toStr(r.fitaM) + ' m', sub: r.sobrasUsadas + ' sobras usadas · ' + r.sobrasNovas + ' novas' },
    { k: 'eco', rotulo: 'Economia com sobras', valor: brl(r.economia), sub: 'custo do mês ' + brl(r.custo) },
  ];
}

const cel = (v) => { const s = String(v == null ? '' : v); return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const dec = (v) => (v == null ? '' : String(r2(v)).replace('.', ','));

/**
 * CSV do mês (separador ";" e vírgula decimal, como o Excel em português abre).
 * Sem BOM: quem entrega o arquivo (ui/deliver.js) já põe o BOM nos .csv.
 */
export function csvMensal(r, serie) {
  const L = [];
  const lin = (...c) => L.push(c.map(cel).join(';'));
  lin('Relatório do mês', r.rotulo);
  lin('Projetos', r.projetos); lin('Peças cortadas', r.pecas); lin('Chapas novas', r.chapas);
  lin('Área das peças (m²)', dec(r.areaPecas)); lin('Área das chapas (m²)', dec(r.areaChapas)); lin('Perda (m²)', dec(r.areaPerda));
  lin('Aproveitamento (%)', dec(r.aproveitamento));
  lin('Fita de borda (m)', dec(r.fitaM)); lin('Sobras usadas', r.sobrasUsadas); lin('Sobras novas', r.sobrasNovas);
  lin('Custo (R$)', dec(r.custo)); lin('Economia com sobras (R$)', dec(r.economia));
  lin('Entradas no estoque', r.entradas); lin('Ajustes no estoque', r.ajustes);
  if (r.nomesProjetos.length) lin('Projetos do mês', r.nomesProjetos.join(', '));
  L.push('');
  lin('Material', 'Espessura (mm)', 'Chapas', 'Projetos');
  r.porMaterial.forEach((m) => lin(m.nome, m.esp || '', m.chapas, m.projetos));
  if (r.ferragens.length) { L.push(''); lin('Ferragem', 'Quantidade'); r.ferragens.forEach((f) => lin(f.nome, dec(f.q))); }
  if (serie && serie.length) {
    L.push(''); lin('Mês', 'Projetos', 'Peças', 'Chapas', 'Aproveitamento (%)', 'Fita (m)', 'Custo (R$)', 'Economia (R$)');
    serie.forEach((s) => lin(s.rotulo, s.projetos, s.pecas, s.chapas, dec(s.aproveitamento), dec(s.fitaM), dec(s.custo), dec(s.economia)));
  }
  return L.join('\r\n');
}

/** Nome do arquivo: relatorio-2026-10.csv / .pdf */
export const nomeArquivoMes = (ano, mes, ext) => 'relatorio-' + ano + '-' + String(mes).padStart(2, '0') + '.' + ext;
