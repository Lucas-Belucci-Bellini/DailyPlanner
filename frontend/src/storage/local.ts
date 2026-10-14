/**
 * Acesso ao `localStorage` que nunca lança.
 *
 * Navegador em aba anônima, cookies de terceiros bloqueados ou cota estourada
 * fazem `localStorage` lançar no *acesso*, não só na escrita. A agenda precisa
 * continuar utilizável nesse caso — só deixa de lembrar entre visitas.
 */

export interface ResultadoEscrita {
  ok: boolean;
  motivo?: string;
}

function armazem(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function lerBruto(chave: string): string | null {
  try {
    return armazem()?.getItem(chave) ?? null;
  } catch {
    return null;
  }
}

export function escreverBruto(chave: string, valor: string): ResultadoEscrita {
  try {
    const alvo = armazem();
    if (!alvo) return { ok: false, motivo: "Este navegador bloqueou o armazenamento local." };
    alvo.setItem(chave, valor);
    return { ok: true };
  } catch (erro) {
    const excedeuCota =
      erro instanceof DOMException &&
      (erro.name === "QuotaExceededError" || erro.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return {
      ok: false,
      motivo: excedeuCota
        ? "O armazenamento do navegador está cheio."
        : "Não foi possível salvar neste navegador.",
    };
  }
}

export function removerBruto(chave: string): void {
  try {
    armazem()?.removeItem(chave);
  } catch {
    // Sem armazenamento não há o que remover.
  }
}

export function armazenamentoDisponivel(): boolean {
  const chave = "daily-planner.probe";
  const escrita = escreverBruto(chave, "1");
  if (escrita.ok) removerBruto(chave);
  return escrita.ok;
}
