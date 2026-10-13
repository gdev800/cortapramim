// Barra do topo: marca, atalhos e o aviso de onde os dados ficam.
import html from './template.html';
import './nav.css';
import { $ } from '../../dom.js';

export default {
  template: () => html,
  mount(ctx) {
    const update = () => {
      const cloud = ctx.backend.mode === 'cloud';
      $('navStore').classList.toggle('on', cloud);
      $('navStoreTxt').textContent = cloud ? 'Na sua conta' : 'Neste navegador';
    };
    ctx.bus.on('storage', update);
    update();

    // Onde você está: o link da seção visível fica marcado. "Resultado" só vale depois de calcular.
    const links = [...document.querySelectorAll('.nav-links a[data-sec]')];
    const topo = (id) => { const e = id === 'resultado' ? $('resultado') : $(id); return e && !e.hidden ? e.getBoundingClientRect().top : null; };
    let raf = 0;
    const marcar = () => {
      raf = 0; let atual = null;
      links.forEach((a) => { const t = topo(a.dataset.sec); if (t !== null && t <= 120) atual = a; });
      links.forEach((a) => { if (a === atual) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    };
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(marcar); }, { passive: true });
    const res = $('resultado'), navRes = $('navRes');
    const sync = () => { navRes.setAttribute('aria-disabled', String(res.hidden)); marcar(); };
    new MutationObserver(sync).observe(res, { attributes: true, attributeFilter: ['hidden'] });
    navRes.addEventListener('click', (ev) => { if (res.hidden) ev.preventDefault(); });
    sync();
  },
};
