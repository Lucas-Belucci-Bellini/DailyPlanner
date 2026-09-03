/**
 * A entidade central da agenda: um compromisso.
 *
 * Convenção de nomes do projeto: **os campos persistidos são em inglês** — eles
 * são contrato (arquivo exportado pelo usuário e pacote de integração) e não
 * podem mudar de nome sem quebrar dados já salvos. **O código em volta é em
 * português**, como o resto da documentação do repositório.
 *
 * Camada pura: nada de DOM, nada de `localStorage`.
 */

import { CATEGORIA_PADRAO, type CategoriaId, geraRelatorio, isCategoriaId } from "./categoria.ts";
import { durationInMinutes, formatTime, isISODate, isTime, normalizeTime } from "./datetime.ts";
import { precisaRegistro, type ReferenciaRelatorio } from "./integracao.ts";

export type Prioridade = "baixa" | "normal" | "alta";

export const PRIORIDADES: { id: Prioridade; rotulo: string }[] = [
  { id: "baixa", rotulo: "Baixa" },
  { id: "normal", rotulo: "Normal" },
  { id: "alta", rotulo: "Alta" },
];

export interface Compromisso {
  id: string;
  title: string;
  /** Observação curta. A descrição longa é do relatório, não da agenda. */
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  category: CategoriaId;
  priority: Prioridade;
  completed: boolean;
  createdAt: string;
  /** Liga as ocorrências de uma mesma série recorrente. `null` para avulsos. */
  seriesId: string | null;
  /** Referência mínima ao relatório no Kizeo. `null` = nunca foi registrado. */
  report: ReferenciaRelatorio | null;
}

/** O que o formulário produz: o compromisso sem os campos que o domínio controla. */
export type RascunhoCompromisso = Pick<
  Compromisso,
  "title" | "description" | "date" | "startTime" | "endTime" | "category" | "priority"
>;

export interface ErroValidacao {
  campo: "title" | "date" | "startTime" | "endTime" | "description" | "form";
  message: string;
}

export const LIMITE_TITULO = 120;
export const LIMITE_DESCRICAO = 500;

export function isPrioridade(value: unknown): value is Prioridade {
  return value === "baixa" || value === "normal" || value === "alta";
}

/**
 * Identificador único.
 *
 * `crypto.randomUUID` só existe em contexto seguro. Servir a agenda por
 * `vite --host` e abri-la pelo IP da rede local (http://, para testar no
 * celular) deixa `randomUUID` indefinido e quebrava o cadastro. O fallback
 * cobre esse caso — não precisa de qualidade criptográfica, só de unicidade
 * dentro de um `localStorage`.
 */
export function novoId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const aleatorio = Math.random().toString(36).slice(2, 10);
  return `dp-${Date.now().toString(36)}-${aleatorio}`;
}

export function ordenarCompromissos(compromissos: Compromisso[]): Compromisso[] {
  return [...compromissos].sort((primeiro, segundo) => {
    const porData = primeiro.date.localeCompare(segundo.date);
    if (porData !== 0) return porData;
    const porInicio = primeiro.startTime.localeCompare(segundo.startTime);
    if (porInicio !== 0) return porInicio;
    return primeiro.title.localeCompare(segundo.title, "pt-BR");
  });
}

export function compromissosDoDia(compromissos: Compromisso[], date: string): Compromisso[] {
  return ordenarCompromissos(compromissos.filter((item) => item.date === date));
}

export function compromissosNoIntervalo(
  compromissos: Compromisso[],
  inicio: string,
  fim: string,
): Compromisso[] {
  return ordenarCompromissos(
    compromissos.filter((item) => item.date >= inicio && item.date <= fim),
  );
}

/** Dois compromissos ocupam o mesmo espaço na agenda? Bordas encostadas não colidem. */
export function conflitam(
  primeiro: Pick<Compromisso, "date" | "startTime" | "endTime">,
  segundo: Pick<Compromisso, "date" | "startTime" | "endTime">,
): boolean {
  return (
    primeiro.date === segundo.date &&
    primeiro.startTime < segundo.endTime &&
    primeiro.endTime > segundo.startTime
  );
}

/** O primeiro compromisso que conflita com o rascunho, ignorando o que está sendo editado. */
export function acharConflito(
  rascunho: Pick<Compromisso, "date" | "startTime" | "endTime">,
  existentes: Compromisso[],
  idEmEdicao?: string,
): Compromisso | null {
  return existentes.find((item) => item.id !== idEmEdicao && conflitam(rascunho, item)) ?? null;
}

export function validarCompromisso(
  rascunho: RascunhoCompromisso,
  existentes: Compromisso[],
  idEmEdicao?: string,
): ErroValidacao | null {
  if (!rascunho.title.trim()) {
    return { campo: "title", message: "Digite um título para o compromisso." };
  }
  if (rascunho.title.trim().length > LIMITE_TITULO) {
    return { campo: "title", message: `O título deve ter no máximo ${LIMITE_TITULO} caracteres.` };
  }
  if (!rascunho.date || !isISODate(rascunho.date)) {
    return { campo: "date", message: "Escolha uma data válida." };
  }
  if (!rascunho.startTime || !isTime(rascunho.startTime)) {
    return { campo: "startTime", message: "Informe o horário de início." };
  }
  if (!rascunho.endTime || !isTime(rascunho.endTime)) {
    return { campo: "endTime", message: "Informe o horário de término." };
  }
  if (rascunho.endTime <= rascunho.startTime) {
    return { campo: "endTime", message: "O término precisa ser depois do início." };
  }
  if (rascunho.description.trim().length > LIMITE_DESCRICAO) {
    return {
      campo: "description",
      message: `A observação deve ter no máximo ${LIMITE_DESCRICAO} caracteres.`,
    };
  }
  if (!isCategoriaId(rascunho.category)) {
    return { campo: "form", message: "Escolha uma categoria." };
  }
  if (!isPrioridade(rascunho.priority)) {
    return { campo: "form", message: "Escolha uma prioridade." };
  }

  const conflito = acharConflito(rascunho, existentes, idEmEdicao);
  if (conflito) {
    return {
      campo: "startTime",
      message: `Este horário conflita com “${conflito.title}” (${formatTime(conflito.startTime)}–${formatTime(conflito.endTime)}).`,
    };
  }
  return null;
}

export function criarCompromisso(
  rascunho: RascunhoCompromisso,
  extras: { date?: string; seriesId?: string | null } = {},
): Compromisso {
  return {
    id: novoId(),
    title: rascunho.title.trim(),
    description: rascunho.description.trim(),
    date: extras.date ?? rascunho.date,
    startTime: rascunho.startTime,
    endTime: rascunho.endTime,
    category: rascunho.category,
    priority: rascunho.priority,
    completed: false,
    createdAt: new Date().toISOString(),
    seriesId: extras.seriesId ?? null,
    report: null,
  };
}

/**
 * Normaliza um objeto de origem desconhecida (arquivo importado, dado antigo do
 * `localStorage`) num compromisso válido, ou devolve `null`.
 *
 * Os horários passam por `normalizeTime` porque a comparação de conflito é feita
 * por string: `"9:00"` seria considerado *maior* que `"10:00"` e a sobreposição
 * passaria despercebida.
 */
export function normalizarCompromisso(valor: unknown): Compromisso | null {
  if (!valor || typeof valor !== "object") return null;
  const bruto = valor as Record<string, unknown>;

  const title = typeof bruto.title === "string" ? bruto.title.trim() : "";
  const date = typeof bruto.date === "string" ? bruto.date : "";
  const startTime = typeof bruto.startTime === "string" ? normalizeTime(bruto.startTime) : null;
  const endTime = typeof bruto.endTime === "string" ? normalizeTime(bruto.endTime) : null;

  if (!title || !isISODate(date) || !startTime || !endTime || endTime <= startTime) return null;

  return {
    id: typeof bruto.id === "string" && bruto.id ? bruto.id : novoId(),
    title: title.slice(0, LIMITE_TITULO),
    description:
      typeof bruto.description === "string" ? bruto.description.trim().slice(0, LIMITE_DESCRICAO) : "",
    date,
    startTime,
    endTime,
    category: isCategoriaId(bruto.category) ? bruto.category : CATEGORIA_PADRAO,
    priority: isPrioridade(bruto.priority) ? bruto.priority : "normal",
    completed: bruto.completed === true,
    createdAt:
      typeof bruto.createdAt === "string" && bruto.createdAt
        ? bruto.createdAt
        : new Date().toISOString(),
    seriesId: typeof bruto.seriesId === "string" && bruto.seriesId ? bruto.seriesId : null,
    report: normalizarReferencia(bruto.report),
  };
}

function normalizarReferencia(valor: unknown): ReferenciaRelatorio | null {
  if (!valor || typeof valor !== "object") return null;
  const bruto = valor as Record<string, unknown>;
  if (typeof bruto.integrationId !== "string" || !bruto.integrationId) return null;

  const statusValidos = ["pendente", "rascunho", "criado", "enviado", "erro"];
  const status = typeof bruto.status === "string" && statusValidos.includes(bruto.status)
    ? (bruto.status as ReferenciaRelatorio["status"])
    : "pendente";

  return {
    integrationId: bruto.integrationId,
    status,
    reportId: typeof bruto.reportId === "string" ? bruto.reportId : null,
    reportUrl: typeof bruto.reportUrl === "string" ? bruto.reportUrl : null,
    reportType: typeof bruto.reportType === "string" ? bruto.reportType : null,
    updatedAt: typeof bruto.updatedAt === "string" ? bruto.updatedAt : new Date().toISOString(),
    message: typeof bruto.message === "string" ? bruto.message : null,
  };
}

export interface ResumoDoDia {
  total: number;
  concluidos: number;
  pendentes: number;
  minutos: number;
  percentual: number;
  /** Compromissos que podem virar relatório e ainda não foram registrados. */
  relatoriosPendentes: number;
}

export function resumirDia(compromissos: Compromisso[]): ResumoDoDia {
  const minutos = compromissos.reduce(
    (total, item) => total + durationInMinutes(item.startTime, item.endTime),
    0,
  );
  const concluidos = compromissos.filter((item) => item.completed).length;
  return {
    total: compromissos.length,
    concluidos,
    pendentes: compromissos.length - concluidos,
    minutos,
    percentual: compromissos.length ? Math.round((concluidos / compromissos.length) * 100) : 0,
    relatoriosPendentes: compromissos.filter(aguardandoRelatorio).length,
  };
}

/**
 * O compromisso é de uma categoria que gera relatório e ainda não tem um
 * registrado? É isso que alimenta o aviso "relatórios que precisam ser
 * registrados" — e é só um aviso: a agenda nunca cria relatório sozinha.
 */
export function aguardandoRelatorio(compromisso: Compromisso): boolean {
  return geraRelatorio(compromisso.category) && precisaRegistro(compromisso.report);
}
