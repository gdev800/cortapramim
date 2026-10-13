// O "contexto" é o que todo componente recebe ao ser montado: o estado, o barramento de eventos e os serviços.
// Componentes não importam uns aos outros: falam pelo contexto (ctx.bus) e pedem comandos por ctx.actions.
import { createState } from '../domain/state.js';
import { snapshot, restore } from '../domain/snapshot.js';
import { fmtFor } from '../domain/units.js';
import { createPersistence } from '../infra/persistence.js';
import { createBus } from './bus.js';

export function createContext() {
  const state = createState();
  const bus = createBus();
  const backend = { mode: 'local', db: null, uid: null };
  const pers = createPersistence({
    state, backend,
    notify: { touch() { pers.marcarMudanca(); bus.emit('touched'); }, note(t) { bus.emit('note', t); } },
  });
  return {
    state, bus, backend, pers,
    /** Comandos registrados pelos componentes que sabem executá-los (ex.: actions.calcular). */
    actions: {},
    /** Formata mm na unidade da tela. */
    fu: (mm) => fmtFor(state.unit).fu(mm),
    /** Quantos mm vale 1 unidade da tela. */
    F: () => fmtFor(state.unit).fac,
    /** Mostra a mensagem principal (kind: 'ok' | 'warn' | 'err' | ''). */
    msg: (text, kind) => bus.emit('msg', { text, kind }),
    /** Guarda o rascunho (o que está na tela). */
    save: () => pers.saveDraft(snapshot(state)),
    /** Carrega um trabalho inteiro e avisa todos os componentes. */
    load(d) { restore(state, d); bus.emit('loaded'); },
  };
}
