/**
 * Contrato de integração com o Kizeo Forms — lado DailyPlanner.
 *
 * Este arquivo define **apenas o formato dos dados que atravessam a fronteira**.
 * Nada aqui conhece a estrutura interna do Kizeo: não há tabela, endpoint,
 * schema de formulário nem campo de relatório. O DailyPlanner entrega contexto
 * de horário e recebe de volta uma referência mínima.
 *
 * A camada que transporta isso (janela, URL, postMessage) fica em
 * `src/integration/kizeo.ts`. Trocar o transporte não deve tocar este arquivo.
 */

/** Versão do contrato. Sobe quando o formato do handoff muda de forma incompatível. */
export const VERSAO_CONTRATO = 1;

/** A origem que o DailyPlanner declara ao Kizeo. */
export const ORIGEM = "dailyplanner";

/**
 * O horário exportado para fora da agenda — o "quando" que vira contexto de
 * relatório. É deliberadamente magro: título, categoria e janela de tempo.
 * Nenhum campo de relatório mora aqui.
 */
export interface PlannerSchedule {
  id: string;
  date: string;
  start: string;
  end: string;
  title: string;
  category: string;
  notes?: string;
}

/** Estado do relatório conforme conhecido *pela agenda*. A verdade oficial é do Kizeo. */
export type StatusRelatorio = "pendente" | "rascunho" | "criado" | "enviado" | "erro";

/**
 * Tudo o que o DailyPlanner guarda sobre um relatório: uma referência.
 * Sem campos, sem anexos, sem conteúdo — esses pertencem ao Kizeo.
 */
export interface ReferenciaRelatorio {
  /** Chave de idempotência determinística: reenviar não duplica o relatório. */
  integrationId: string;
  status: StatusRelatorio;
  reportId: string | null;
  reportUrl: string | null;
  reportType: string | null;
  /** Última vez que a agenda soube algo sobre este relatório (ISO 8601). */
  updatedAt: string;
  /** Motivo, quando `status === "erro"`. */
  message: string | null;
}

/** O pacote de contexto que viaja do DailyPlanner para o Kizeo. */
export interface ContextoRelatorio {
  v: number;
  source: typeof ORIGEM;
  integrationId: string;
  schedule: PlannerSchedule;
  reportType: string;
}

/** A resposta que o Kizeo devolve. É o único formato que a agenda aceita de volta. */
export interface RespostaRelatorio {
  integrationId: string;
  status: StatusRelatorio;
  reportId: string | null;
  reportUrl: string | null;
  reportType: string | null;
}

/**
 * Chave de idempotência: determinística a partir de origem + horário + tipo.
 *
 * O mesmo compromisso reenviado — depois de um timeout, de uma aba fechada ou
 * de um clique repetido — produz a mesma chave, e o Kizeo reconhece o relatório
 * que já existe em vez de criar um segundo. Trocar o tipo (o usuário mudou a
 * categoria do compromisso) produz outra chave de propósito: é outro registro.
 */
export function criarIntegrationId(scheduleId: string, reportType: string): string {
  return `${ORIGEM}:${scheduleId}:${reportType}`;
}

function isTexto(value: unknown): value is string {
  return typeof value === "string";
}

/** Valida uma resposta vinda de fora. Nada entra na agenda sem passar por aqui. */
export function isRespostaRelatorio(value: unknown): value is RespostaRelatorio {
  if (!value || typeof value !== "object") return false;
  const candidato = value as Partial<RespostaRelatorio>;
  const statusValidos: StatusRelatorio[] = ["pendente", "rascunho", "criado", "enviado", "erro"];
  return (
    isTexto(candidato.integrationId) &&
    candidato.integrationId.length > 0 &&
    isTexto(candidato.status) &&
    statusValidos.includes(candidato.status) &&
    (candidato.reportId === null || isTexto(candidato.reportId)) &&
    (candidato.reportUrl === null || isTexto(candidato.reportUrl)) &&
    (candidato.reportType === null || isTexto(candidato.reportType))
  );
}

const ROTULOS: Record<StatusRelatorio, string> = {
  pendente: "Registro pendente",
  rascunho: "Rascunho no Kizeo",
  criado: "Relatório criado",
  enviado: "Relatório enviado",
  erro: "Falha ao registrar",
};

export function rotuloStatus(status: StatusRelatorio): string {
  return ROTULOS[status];
}

/** Sem referência guardada, o relatório simplesmente não existe para a agenda. */
export function rotuloReferencia(referencia: ReferenciaRelatorio | null): string {
  return referencia ? ROTULOS[referencia.status] : "Relatório não criado";
}

/**
 * Um relatório ainda precisa da atenção do usuário?
 *
 * Só `criado` e `enviado` encerram o ciclo. **`rascunho` continua pendente**: um
 * rascunho é um relatório começado e não terminado, e some da lista de coisas a
 * fazer justamente quando o usuário ainda precisa voltar nele.
 */
export function precisaRegistro(referencia: ReferenciaRelatorio | null): boolean {
  if (!referencia) return true;
  return referencia.status !== "criado" && referencia.status !== "enviado";
}
