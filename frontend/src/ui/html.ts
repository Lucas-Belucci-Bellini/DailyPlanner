/** Utilitários de renderização. Só string, sem estado. */

export function escaparHtml(valor: string): string {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Escapa para uso dentro de um atributo `style` — não deixa fechar aspas nem injetar propriedade. */
export function escaparCor(valor: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(valor) ? valor : "currentColor";
}

export function classes(...valores: (string | false | null | undefined)[]): string {
  return valores.filter(Boolean).join(" ");
}
