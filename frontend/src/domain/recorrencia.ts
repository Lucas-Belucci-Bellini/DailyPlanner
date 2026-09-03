/**
 * Recorrência de compromissos.
 *
 * A agenda **materializa** a série no momento da criação: uma regra recorrente
 * vira N compromissos concretos, cada um com o seu próprio id e ligados por um
 * `serieId`. Não existe "ocorrência virtual".
 *
 * A alternativa — guardar a regra e expandir na leitura — obrigaria a manter
 * exceções por ocorrência (esta foi concluída, aquela virou relatório, a outra
 * foi movida). Como conflito de horário, conclusão e referência de relatório
 * são todos por ocorrência, materializar mantém `Compromisso` plano e faz o
 * resto da aplicação funcionar sem saber que recorrência existe.
 *
 * O preço: editar a série inteira depois da criação não é possível — só excluir
 * a série ou editar ocorrência por ocorrência. É um preço consciente.
 */

import { daysBetween, isISODate, isWeekday, shiftDate } from "./datetime.ts";

export type FrequenciaRecorrencia = "diaria" | "dias-uteis" | "semanal";

export interface Recorrencia {
  frequencia: FrequenciaRecorrencia;
  /** A cada N dias (`diaria`) ou N semanas (`semanal`). `dias-uteis` ignora o intervalo. */
  intervalo: number;
  /** Última data possível da série, inclusive (`YYYY-MM-DD`). */
  ate: string;
}

/** Teto de ocorrências por série. Protege o `localStorage` e a renderização. */
export const LIMITE_OCORRENCIAS = 180;

/** Horizonte máximo de uma série, em dias. Uma agenda pessoal não precisa de mais. */
export const LIMITE_DIAS = 366;

export const FREQUENCIAS: { id: FrequenciaRecorrencia; rotulo: string }[] = [
  { id: "diaria", rotulo: "Todos os dias" },
  { id: "dias-uteis", rotulo: "De segunda a sexta" },
  { id: "semanal", rotulo: "Toda semana, no mesmo dia" },
];

export function isFrequencia(value: unknown): value is FrequenciaRecorrencia {
  return value === "diaria" || value === "dias-uteis" || value === "semanal";
}

export function isRecorrencia(value: unknown): value is Recorrencia {
  if (!value || typeof value !== "object") return false;
  const candidato = value as Partial<Recorrencia>;
  return (
    isFrequencia(candidato.frequencia) &&
    typeof candidato.intervalo === "number" &&
    Number.isInteger(candidato.intervalo) &&
    candidato.intervalo >= 1 &&
    typeof candidato.ate === "string" &&
    isISODate(candidato.ate)
  );
}

export interface ErroRecorrencia {
  message: string;
}

export function validarRecorrencia(inicio: string, regra: Recorrencia): ErroRecorrencia | null {
  if (!isRecorrencia(regra)) {
    return { message: "A regra de repetição está incompleta." };
  }
  if (regra.ate < inicio) {
    return { message: "A repetição precisa terminar depois da data inicial." };
  }
  if (daysBetween(inicio, regra.ate) > LIMITE_DIAS) {
    return { message: `A repetição pode cobrir no máximo ${LIMITE_DIAS} dias.` };
  }
  if (regra.intervalo > 52) {
    return { message: "O intervalo de repetição é grande demais." };
  }
  return null;
}

/**
 * Expande a regra nas datas concretas da série, incluindo a data inicial.
 *
 * `dias-uteis` avança dia a dia e descarta sábados e domingos; se a data inicial
 * cair num fim de semana ela é mantida mesmo assim, porque foi o usuário quem a
 * escolheu — a regra filtra o que a série gera, não o que ele pediu.
 */
export function expandirRecorrencia(inicio: string, regra: Recorrencia): string[] {
  if (validarRecorrencia(inicio, regra)) return [inicio];

  const datas: string[] = [inicio];
  const passo = regra.frequencia === "semanal" ? regra.intervalo * 7 : regra.intervalo;
  let atual = inicio;

  while (datas.length < LIMITE_OCORRENCIAS) {
    atual = shiftDate(atual, regra.frequencia === "dias-uteis" ? 1 : passo);
    if (atual > regra.ate) break;
    if (regra.frequencia === "dias-uteis" && !isWeekday(atual)) continue;
    datas.push(atual);
  }

  return datas;
}

export function descreverRecorrencia(regra: Recorrencia): string {
  const base =
    regra.frequencia === "dias-uteis"
      ? "De segunda a sexta"
      : regra.frequencia === "semanal"
        ? regra.intervalo === 1
          ? "Toda semana"
          : `A cada ${regra.intervalo} semanas`
        : regra.intervalo === 1
          ? "Todos os dias"
          : `A cada ${regra.intervalo} dias`;
  return base;
}

/** Identificador da série. Só precisa ser único dentro do armazenamento local. */
export function novoIdSerie(): string {
  return `serie-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
