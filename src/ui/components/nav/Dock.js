// Barra fixa no rodapé: o botão de calcular e o atalho para o resultado ficam sempre ao alcance, sem rolar a página.
import { $ } from '../../dom.js';

export default {
  template: () =>
    '<div id="dock" class="dock" hidden role="region" aria-label="Atalhos do plano">' +
    '<button id="dkCalc" type="button" class="brass">Calcular plano</button>' +
    '<button id="dkRes" type="button" hidden>Ver resultado ↓</button>' +
    '<button id="dkEdit" type="button" hidden>↑ Editar peças</button></div>',
  mount() {
    const dock = $('dock'), res = $('resultado'), entrada = $('t-entrada').closest('section'), calc = $('btnCalc');
    let raf = 0;
    const dentro = (r) => r.bottom > 80 && r.top < innerHeight - 80;
    const atualizar = () => {
      raf = 0;
      const rc = calc.getBoundingClientRect(), re = entrada.getBoundingClientRect();
      const noCalc = dentro(rc), naEntrada = re.top < innerHeight * 0.6 && re.bottom > 80;
      const temRes = !res.hidden, rr = res.getBoundingClientRect(), noRes = temRes && rr.top < innerHeight * 0.5 && rr.bottom > 80;
      const mostraCalc = naEntrada && !noCalc, mostraRes = temRes && !noRes && rr.top >= innerHeight * 0.5 && naEntrada, mostraEdit = noRes && !dentro(re);
      $('dkCalc').hidden = !mostraCalc; $('dkRes').hidden = !mostraRes; $('dkEdit').hidden = !mostraEdit;
      $('dkCalc').disabled = calc.disabled;
      dock.hidden = !(mostraCalc || mostraRes || mostraEdit);
    };
    const agenda = () => { if (!raf) raf = requestAnimationFrame(atualizar); };
    window.addEventListener('scroll', agenda, { passive: true }); window.addEventListener('resize', agenda);
    new MutationObserver(agenda).observe(res, { attributes: true, attributeFilter: ['hidden'] });
    new MutationObserver(agenda).observe(calc, { attributes: true, attributeFilter: ['disabled'] });
    $('dkCalc').addEventListener('click', () => calc.click());
    $('dkRes').addEventListener('click', () => res.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    $('dkEdit').addEventListener('click', () => entrada.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    agenda();
  },
};
