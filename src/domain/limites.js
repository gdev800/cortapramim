// Limites de tudo que entra no app. Os de texto batem com os `check` do banco (supabase/migrations),
// para que um dado aceito aqui nunca seja recusado lá. Analogia: é a régua da serra, igual na tela e na oficina.

export const LIM = {
  id: 64,              // ids de projeto, sobra, insumo e movimento
  nome: 200,           // nome de chapa, peça, projeto, cliente, sobra, insumo
  itemNome: 300,       // nome do item no histórico
  obs: 500,            // observações
  textoLongo: 2000,    // campos de várias linhas da proposta (itens, pagamento)
  colado: 200000,      // texto colado ou aberto de CSV/TXT (~200 KB, milhares de linhas)
  campoNumero: 30,     // campo digitado que deveria ser número ("88,6")
  unidade: 10,
  status: 30,
};

export const MEDIDA_MIN_MM = 1;        // peça ou chapa menor que 1 mm não existe na serra
export const MEDIDA_MAX_MM = 10000;    // 10 m: muito acima de qualquer chapa vendida
export const ESPESSURA_MAX_MM = 100;
export const PRECO_MAX = 1000000;      // R$ por chapa, por metro de fita, por ferragem
export const QTD_MAX = 1000000;        // igual ao check de insumos.q no banco

export const MAX_CHAPAS = 60;          // blocos (materiais) num trabalho
export const MAX_LINHAS = 3000;        // linhas de peças por chapa
export const MAX_FERRAGENS = 300;
export const MAX_ITENS_LISTA = 20000;  // sobras, insumos, movimentos ou projetos guardados

export const MAX_BYTES_BACKUP = 20 * 1024 * 1024;   // arquivo .json de backup
export const MAX_BYTES_LISTA = 2 * 1024 * 1024;     // CSV/TXT da lista de peças
export const MAX_BYTES_PLANILHA = 5 * 1024 * 1024;  // .xlsx
