// Monta a página e liga o app. A ordem em `PAGINA` é a ordem na tela.
import { coletar } from '../domain/collect.js';
import { detectarBackend, detectarDownloads } from '../infra/platform.js';
import { createContext } from './context.js';
import { $ } from './dom.js';
import Nav from './components/nav/index.js';
import Hero from './components/hero/index.js';
import Bento from './components/bento/index.js';
import ProjectPanel from './components/project/ProjectPanel.js';
import ModelsPanel from './components/models/index.js';
import EntryPanel from './components/entry/EntryPanel.js';
import ScrapsPanel from './components/scraps/index.js';
import SuppliesPanel from './components/supplies/index.js';
import HistoryPanel from './components/history/index.js';
import MonthlyPanel from './components/monthly/index.js';
import ShoppingPanel from './components/shopping/index.js';
import ResultPanel from './components/result/ResultPanel.js';
import Datalists from './components/shared/datalists.js';
import Dock from './components/nav/Dock.js';
import Stock from './components/stock/Stock.js';
import { secHeader } from './templates.js';

const FOOTER = '<footer class="foot">Confira sempre as medidas reais da chapa com o fornecedor antes de cortar.</footer>';

/** Cada item tem template() (HTML) e mount(ctx) (liga eventos). A ordem aqui é a ordem na página. */
const PAGINA = [
  { c: Hero }, { c: Bento },
  { html: secHeader('montar', 'Monte o plano', 'Do caderno para o corte.', 'Nomeie o projeto, descreva cada chapa com suas peças e calcule. Tudo que você digita fica guardado.') },
  { c: ProjectPanel }, { c: ModelsPanel }, { c: EntryPanel },
  { c: ResultPanel },
  { html: Stock.abre }, { c: ShoppingPanel }, { c: ScrapsPanel }, { c: SuppliesPanel }, { c: HistoryPanel }, { c: MonthlyPanel }, { html: Stock.fecha },
  { html: FOOTER },
];
const todos = [Nav, ...PAGINA.filter((p) => p.c).map((p) => p.c), Stock, Dock, Datalists];

export async function startApp(root) {
  const ctx = createContext();
  const { state, bus, pers } = ctx;

  root.innerHTML = Nav.template(ctx) + '<main class="wrap" id="topo">' +
    PAGINA.map((p) => (p.c ? p.c.template(ctx) : p.html)).join('\n') + Datalists.template() + '</main>' + Dock.template();
  todos.forEach((c) => c.mount(ctx));

  detectarDownloads((dl) => { state.dl = dl; bus.emit('dl'); });

  // 1) o que estava na tela da última vez, ou o exemplo
  const d = pers.loadDraft();
  let carregou = false;
  if (d && Array.isArray(d.blocks) && d.blocks.length) { try { ctx.load(d); carregou = true; } catch (e) { /* rascunho inválido: ignora */ } }
  if (!carregou) ctx.actions.carregarExemplo();
  bus.emit('touched');

  // 2) dados guardados (na conta ou no navegador)
  Object.assign(ctx.backend, await detectarBackend());
  bus.emit('storage');
  await pers.loadEstoque(); await pers.loadProjetos(); await pers.loadInsumos(); await pers.loadHistorico();
  bus.emit('estoque'); bus.emit('projetos'); bus.emit('insumos'); bus.emit('historico'); bus.emit('blocks');
  if (!carregou) ctx.actions.calcular(4, true);

  // Atalho para testes automáticos e para quem quer inspecionar pelo console.
  window.__pc = { state, store: ctx.backend, coletar: () => coletar(state), calcular: (...a) => ctx.actions.calcular(...a) };
  return ctx;
}
