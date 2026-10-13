// Seção "Resultado": só reúne os cartões; cada um sabe se desenhar quando o plano muda.
import html from './template.html';
import './result.css';
import Summary from './Summary.js';
import Needs from './Needs.js';
import Compare from './Compare.js';
import Approve from './Approve.js';
import Export from './Export.js';
import Sheets from './Sheets.js';
import Editor from './Editor.js';
import Zoom from './Zoom.js';

const FILHOS = [Summary, Needs, Compare, Approve, Export, Sheets, Editor, Zoom];

export default {
  template: () => html,
  mount(ctx) {
    const { state, bus } = ctx;
    const mostrar = () => { document.getElementById('resultado').hidden = !state.res; };
    FILHOS.forEach((c) => c.mount(ctx));
    bus.on('result', mostrar); bus.on('loaded', mostrar);
  },
};
