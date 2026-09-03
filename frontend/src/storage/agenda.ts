/**
 * Persistência da agenda, com esquema versionado e migração explícita.
 *
 * O formato v1 (`daily-planner.tasks.v1`) era um array cru de compromissos sem
 * categoria, prioridade, série nem referência de relatório. O v2 é um envelope
 * com número de versão, o que torna a próxima migração possível sem adivinhação.
 *
 * A chave v1 **não é apagada** depois de migrada: ela é a única cópia do dado
 * anterior do usuário e ocupa pouco. Se a migração tiver saído errada, ela ainda
 * está lá.
 */

import {
  type Compromisso,
  normalizarCompromisso,
  ordenarCompromissos,
} from "../domain/compromisso.ts";
import { escreverBruto, lerBruto, type ResultadoEscrita } from "./local.ts";

const CHAVE_V1 = "daily-planner.tasks.v1";
const CHAVE_V2 = "daily-planner.agenda.v2";

export const VERSAO_ESQUEMA = 2;

interface EnvelopeAgenda {
  versao: number;
  compromissos: unknown;
}

function normalizarLista(valor: unknown): Compromisso[] {
  if (!Array.isArray(valor)) return [];
  const compromissos = valor
    .map(normalizarCompromisso)
    .filter((item): item is Compromisso => item !== null);
  return ordenarCompromissos(deduplicarPorId(compromissos));
}

/** Dois compromissos com o mesmo id são o mesmo compromisso: fica o primeiro. */
function deduplicarPorId(compromissos: Compromisso[]): Compromisso[] {
  const vistos = new Set<string>();
  return compromissos.filter((item) => {
    if (vistos.has(item.id)) return false;
    vistos.add(item.id);
    return true;
  });
}

function lerJson(chave: string): unknown {
  const bruto = lerBruto(chave);
  if (!bruto) return null;
  try {
    return JSON.parse(bruto);
  } catch {
    return null;
  }
}

export interface CargaAgenda {
  compromissos: Compromisso[];
  /** `true` quando o dado veio do formato v1 e acabou de ser convertido. */
  migrado: boolean;
}

export function carregarAgenda(): CargaAgenda {
  const atual = lerJson(CHAVE_V2);
  if (atual && typeof atual === "object") {
    const envelope = atual as Partial<EnvelopeAgenda>;
    if (envelope.versao === VERSAO_ESQUEMA) {
      return { compromissos: normalizarLista(envelope.compromissos), migrado: false };
    }
  }

  const antigo = lerJson(CHAVE_V1);
  if (Array.isArray(antigo)) {
    const compromissos = normalizarLista(antigo);
    salvarAgenda(compromissos);
    return { compromissos, migrado: compromissos.length > 0 };
  }

  return { compromissos: [], migrado: false };
}

export function salvarAgenda(compromissos: Compromisso[]): ResultadoEscrita {
  const envelope: EnvelopeAgenda = {
    versao: VERSAO_ESQUEMA,
    compromissos: ordenarCompromissos(compromissos),
  };
  return escreverBruto(CHAVE_V2, JSON.stringify(envelope));
}

/** Lê a lista de um arquivo exportado. Aceita o envelope v2 e o array cru do v1. */
export function lerExportacao(texto: string): Compromisso[] | null {
  let conteudo: unknown;
  try {
    conteudo = JSON.parse(texto);
  } catch {
    return null;
  }

  if (Array.isArray(conteudo)) {
    const lista = normalizarLista(conteudo);
    return lista.length ? lista : null;
  }
  if (conteudo && typeof conteudo === "object") {
    const envelope = conteudo as Partial<EnvelopeAgenda>;
    const lista = normalizarLista(envelope.compromissos);
    return lista.length ? lista : null;
  }
  return null;
}

export function montarExportacao(compromissos: Compromisso[]): string {
  return JSON.stringify(
    { versao: VERSAO_ESQUEMA, compromissos: ordenarCompromissos(compromissos) },
    null,
    2,
  );
}

export type ModoImportacao = "mesclar" | "substituir";

export interface ResultadoImportacao {
  compromissos: Compromisso[];
  adicionados: number;
  ignorados: number;
}

/**
 * Junta os compromissos importados aos existentes.
 *
 * O comportamento antigo era destrutivo — importar apagava a agenda inteira sem
 * aviso. `mesclar` é o padrão agora: compromissos com id já conhecido são
 * ignorados, e os demais entram. Substituir continua possível, mas explícito.
 */
export function mesclarImportacao(
  atuais: Compromisso[],
  importados: Compromisso[],
  modo: ModoImportacao,
): ResultadoImportacao {
  if (modo === "substituir") {
    return {
      compromissos: ordenarCompromissos(importados),
      adicionados: importados.length,
      ignorados: 0,
    };
  }

  const conhecidos = new Set(atuais.map((item) => item.id));
  const novos = importados.filter((item) => !conhecidos.has(item.id));
  return {
    compromissos: ordenarCompromissos([...atuais, ...novos]),
    adicionados: novos.length,
    ignorados: importados.length - novos.length,
  };
}
