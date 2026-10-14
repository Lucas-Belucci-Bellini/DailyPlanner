/**
 * Busca e filtros da agenda. Camada pura: recebe compromissos, devolve
 * compromissos. Quem guarda o estado do filtro é a interface.
 */

import { aguardandoRelatorio, type Compromisso, ordenarCompromissos } from "./compromisso.ts";
import { rotuloCategoria } from "./categoria.ts";

export type FiltroStatus = "todos" | "pendentes" | "concluidos" | "sem-relatorio";

export const FILTROS: { id: FiltroStatus; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "pendentes", rotulo: "Pendentes" },
  { id: "concluidos", rotulo: "Concluídos" },
  { id: "sem-relatorio", rotulo: "Sem relatório" },
];

export interface CriteriosAgenda {
  status: FiltroStatus;
  /** `null` = todas as categorias. */
  categoria: string | null;
  busca: string;
}

export const CRITERIOS_PADRAO: CriteriosAgenda = {
  status: "todos",
  categoria: null,
  busca: "",
};

function normalizarTexto(valor: string): string {
  // `NFD` + remoção de diacríticos faz "reuniao" encontrar "Reunião".
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function atendeStatus(compromisso: Compromisso, status: FiltroStatus): boolean {
  switch (status) {
    case "pendentes":
      return !compromisso.completed;
    case "concluidos":
      return compromisso.completed;
    case "sem-relatorio":
      return aguardandoRelatorio(compromisso);
    default:
      return true;
  }
}

function atendeBusca(compromisso: Compromisso, busca: string): boolean {
  const termo = normalizarTexto(busca);
  if (!termo) return true;
  const alvo = normalizarTexto(
    `${compromisso.title} ${compromisso.description} ${rotuloCategoria(compromisso.category)}`,
  );
  return alvo.includes(termo);
}

export function atendeCriterios(compromisso: Compromisso, criterios: CriteriosAgenda): boolean {
  if (!atendeStatus(compromisso, criterios.status)) return false;
  if (criterios.categoria && compromisso.category !== criterios.categoria) return false;
  return atendeBusca(compromisso, criterios.busca);
}

export function filtrarAgenda(
  compromissos: Compromisso[],
  criterios: CriteriosAgenda,
): Compromisso[] {
  return ordenarCompromissos(
    compromissos.filter((compromisso) => atendeCriterios(compromisso, criterios)),
  );
}

export function temFiltroAtivo(criterios: CriteriosAgenda): boolean {
  return (
    criterios.status !== "todos" || criterios.categoria !== null || criterios.busca.trim() !== ""
  );
}

/** Quantos compromissos existem por categoria, para os contadores da interface. */
export function contarPorCategoria(compromissos: Compromisso[]): Map<string, number> {
  const contagem = new Map<string, number>();
  for (const compromisso of compromissos) {
    contagem.set(compromisso.category, (contagem.get(compromisso.category) ?? 0) + 1);
  }
  return contagem;
}
