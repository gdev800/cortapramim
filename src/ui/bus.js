// Barramento de eventos: os componentes conversam por aqui, sem se conhecerem.
// Topics usados (veja ARQUITETURA.md):
//   loaded    um trabalho inteiro foi carregado no estado (abrir projeto, novo, exemplo)
//   unit      a unidade mudou (payload { cv })
//   blocks    a lista de chapas mudou por fora do editor (modelo, sobras, backup)
//   edited    o usuário mexeu em algo que muda a estimativa de tempo
//   estoque   o estoque de sobras mudou
//   insumos   o estoque de fita e ferragens mudou
//   result    um novo plano foi calculado (ou o plano mudou)
//   approved  o plano foi aprovado ou voltou a edição
//   projetos  a lista de projetos mudou
//   touched   algo foi salvo (atualiza o aviso de backup)
//   msg       mensagem principal (payload { text, kind })
//   note      aviso sobre onde os dados ficam (payload texto)
//   storage   o modo de armazenamento mudou
//   dl        a capacidade de download ficou disponível
export function createBus() {
  const subs = {};
  return {
    on(topic, fn) { (subs[topic] = subs[topic] || []).push(fn); },
    emit(topic, payload) { (subs[topic] || []).slice().forEach((fn) => fn(payload)); },
  };
}
