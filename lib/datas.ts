/**
 * Datas escritas em portugues, sem depender do fuso de quem executa.
 *
 * Toda conta e feita sobre a string ISO "aaaa-mm-dd" ancorada em UTC. Usar
 * `new Date("2026-08-04")` e ler com getDate() local devolveria 03 para quem
 * esta a oeste de Greenwich — o dia da agenda mudaria conforme o servidor, que
 * e exatamente o tipo de bug que so aparece em producao.
 */

const DIAS = [
  'domingo', 'segunda-feira', 'terca-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sabado',
];

const MESES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function comoUTC(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** Hoje em ISO, no fuso de Brasilia (UTC-3), que e o fuso de quem usa a agenda. */
export function hojeISO(agora: Date = new Date()): string {
  const brasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return brasilia.toISOString().slice(0, 10);
}

export function somarDias(iso: string, dias: number): string {
  const d = comoUTC(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * "Segunda-feira, 4 de agosto de 2026".
 *
 * So a primeira letra e maiuscula. Fazer isso aqui, e nao com
 * `text-transform: capitalize` no CSS, evita "Segunda-Feira, 4 De Agosto De".
 */
export function porExtenso(iso: string): string {
  const d = comoUTC(iso);
  const texto = `${DIAS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "04/08/2026" */
export function curta(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
