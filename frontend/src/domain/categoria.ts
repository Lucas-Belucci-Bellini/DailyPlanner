/**
 * Catálogo de categorias da agenda.
 *
 * A categoria é o único ponto do DailyPlanner que decide se um compromisso
 * **pode** virar relatório no Kizeo. A regra vive aqui, e não espalhada pela
 * interface, porque ela é de domínio: quem responde "isto é um registro?" é a
 * natureza do compromisso, não o botão que o usuário vê.
 *
 * `tipoRelatorio` é o contexto que o DailyPlanner envia — nada além disso. Quem
 * escolhe o formulário, os campos e o que será gravado é o Kizeo.
 */

export const CATEGORIAS = [
  {
    id: "aula",
    rotulo: "Aula",
    cor: "#4f7bd0",
    /** Tipo de relatório correspondente no catálogo do Kizeo. `null` = não gera relatório. */
    tipoRelatorio: "AULA",
  },
  {
    id: "monitoria",
    rotulo: "Monitoria",
    cor: "#2f8f6d",
    tipoRelatorio: "MONITORIA",
  },
  {
    id: "estudo",
    rotulo: "Estudo",
    cor: "#8a6fc4",
    // Estudo pessoal não é registro institucional (regra 28 do contrato).
    tipoRelatorio: null,
  },
  {
    id: "projeto",
    rotulo: "Projeto",
    cor: "#c9782f",
    tipoRelatorio: "ATIVIDADE",
  },
  {
    id: "reuniao",
    rotulo: "Reunião",
    cor: "#b3593f",
    tipoRelatorio: "REUNIAO",
  },
  {
    id: "pessoal",
    rotulo: "Pessoal",
    cor: "#6f7d75",
    // Compromisso privado nunca sai da agenda.
    tipoRelatorio: null,
  },
  {
    id: "outro",
    rotulo: "Outro",
    cor: "#5b6f8c",
    // Sem categoria definida não há tipo de relatório previsível: o usuário
    // registra direto no Kizeo se quiser. Melhor exigir a escolha do que
    // adivinhar e produzir lixo.
    tipoRelatorio: null,
  },
] as const;

export type Categoria = (typeof CATEGORIAS)[number];
export type CategoriaId = Categoria["id"];

export const CATEGORIA_PADRAO: CategoriaId = "outro";

const PORID = new Map<string, Categoria>(CATEGORIAS.map((categoria) => [categoria.id, categoria]));

export function isCategoriaId(value: unknown): value is CategoriaId {
  return typeof value === "string" && PORID.has(value);
}

export function categoriaDe(id: string): Categoria {
  return PORID.get(id) ?? PORID.get(CATEGORIA_PADRAO)!;
}

export function rotuloCategoria(id: string): string {
  return categoriaDe(id).rotulo;
}

export function corCategoria(id: string): string {
  return categoriaDe(id).cor;
}

/** Um compromisso desta categoria pode originar um relatório no Kizeo? */
export function geraRelatorio(id: string): boolean {
  return categoriaDe(id).tipoRelatorio !== null;
}

/** Tipo de relatório do Kizeo correspondente, ou `null` quando a categoria não gera registro. */
export function tipoRelatorioDe(id: string): string | null {
  return categoriaDe(id).tipoRelatorio;
}
