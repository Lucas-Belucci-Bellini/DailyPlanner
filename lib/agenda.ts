/**
 * As regras da agenda, sem banco e sem React.
 *
 * Tudo aqui e funcao pura: recebe dados, devolve dados. E de proposito — as
 * regras que definem o produto (nao marcar dois compromissos no mesmo minuto,
 * terminar depois de comecar) sao as que mais precisam de teste, e teste de
 * funcao pura roda em milissegundos sem precisar de Postgres no ar.
 *
 * Horas viajam como texto "HH:mm" e datas como texto ISO "aaaa-mm-dd", que e o
 * formato que <input type="time"> e <input type="date"> mandam e leem. Manter o
 * mesmo formato de ponta a ponta evita conversao de fuso no meio do caminho —
 * um compromisso das 09:00 e as 09:00 de quem marcou, nao um instante UTC.
 */

export type Horario = {
  id: number;
  titulo: string;
  descricao: string | null;
  /** ISO: "2026-08-04" */
  data: string;
  /** "HH:mm" */
  horaInicio: string;
  /** "HH:mm" */
  horaFim: string;
  concluido: boolean;
};

/** O que um formulario manda; ainda nao passou pela validacao. */
export type DadosHorario = {
  id?: number;
  titulo: string;
  descricao?: string | null;
  data: string;
  horaInicio: string;
  horaFim: string;
  concluido?: boolean;
};

/** Erros por campo, no formato que o formulario exibe. */
export type ErrosDeCampo = Partial<
  Record<'titulo' | 'descricao' | 'data' | 'horaInicio' | 'horaFim', string>
>;

export const LIMITE_TITULO = 120;
export const LIMITE_DESCRICAO = 500;

const RE_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Minutos desde a meia-noite. Torna comparacao de horario uma conta de inteiros. */
export function emMinutos(hora: string): number {
  const casada = RE_HORA.exec(hora);
  if (!casada) return NaN;
  return Number(casada[1]) * 60 + Number(casada[2]);
}

export function horaValida(hora: string): boolean {
  return RE_HORA.test(hora);
}

export function dataValida(data: string): boolean {
  if (!RE_DATA.test(data)) return false;
  // Rejeita 2026-02-31: o construtor aceita e "corrige" para marco, o que
  // guardaria no banco um dia diferente do que a pessoa digitou.
  const d = new Date(`${data}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === data;
}

export function duracaoEmMinutos(h: Pick<Horario, 'horaInicio' | 'horaFim'>): number {
  const inicio = emMinutos(h.horaInicio);
  const fim = emMinutos(h.horaFim);
  if (Number.isNaN(inicio) || Number.isNaN(fim) || fim <= inicio) return 0;
  return fim - inicio;
}

/** "1h30", "2h", "45min" — pronto para a tela. */
export function formatarDuracao(minutos: number): string {
  const seguro = Math.max(0, Math.round(minutos));
  const horas = Math.floor(seguro / 60);
  const resto = seguro % 60;
  if (horas > 0 && resto > 0) return `${horas}h${String(resto).padStart(2, '0')}`;
  if (horas > 0) return `${horas}h`;
  return `${resto}min`;
}

/**
 * Os dois disputam algum minuto do mesmo dia?
 *
 * Encostar o fim de um no inicio do outro (10:00-11:00 e 11:00-12:00) NAO e
 * conflito: por isso a comparacao e estrita nas duas pontas.
 */
export function conflita(
  a: Pick<Horario, 'data' | 'horaInicio' | 'horaFim'>,
  b: Pick<Horario, 'data' | 'horaInicio' | 'horaFim'>,
): boolean {
  if (a.data !== b.data) return false;
  return emMinutos(a.horaInicio) < emMinutos(b.horaFim)
    && emMinutos(a.horaFim) > emMinutos(b.horaInicio);
}

/**
 * Valida os campos isoladamente. Nao consulta o banco — conflito com outro
 * compromisso e checado a parte, porque depende do que ja esta gravado.
 */
export function validarCampos(dados: DadosHorario): ErrosDeCampo {
  const erros: ErrosDeCampo = {};

  const titulo = dados.titulo?.trim() ?? '';
  if (!titulo) {
    erros.titulo = 'Informe o titulo da tarefa';
  } else if (titulo.length > LIMITE_TITULO) {
    erros.titulo = `O titulo pode ter no maximo ${LIMITE_TITULO} caracteres`;
  }

  if ((dados.descricao?.length ?? 0) > LIMITE_DESCRICAO) {
    erros.descricao = `A descricao pode ter no maximo ${LIMITE_DESCRICAO} caracteres`;
  }

  if (!dados.data) erros.data = 'Informe a data';
  else if (!dataValida(dados.data)) erros.data = 'Data invalida';

  if (!dados.horaInicio) erros.horaInicio = 'Informe a hora de inicio';
  else if (!horaValida(dados.horaInicio)) erros.horaInicio = 'Hora de inicio invalida';

  if (!dados.horaFim) erros.horaFim = 'Informe a hora de termino';
  else if (!horaValida(dados.horaFim)) erros.horaFim = 'Hora de termino invalida';

  if (!erros.horaInicio && !erros.horaFim
      && emMinutos(dados.horaFim) <= emMinutos(dados.horaInicio)) {
    erros.horaFim = 'O termino precisa ser depois do inicio';
  }

  return erros;
}

export function temErro(erros: ErrosDeCampo): boolean {
  return Object.keys(erros).length > 0;
}

/**
 * O primeiro compromisso ja gravado que disputa o intervalo, ou undefined.
 * Na edicao, o proprio compromisso e ignorado — senao ele conflitaria consigo.
 */
export function acharConflito(dados: DadosHorario, existentes: Horario[]): Horario | undefined {
  return existentes.find((h) => h.id !== dados.id && conflita(dados, h));
}

export function mensagemDeConflito(conflitante: Horario): string {
  return `Esse intervalo ja esta ocupado por "${conflitante.titulo}" `
    + `(${conflitante.horaInicio} as ${conflitante.horaFim})`;
}

export type ResumoDoDia = {
  total: number;
  concluidos: number;
  pendentes: number;
  minutosOcupados: number;
  percentualConcluido: number;
  tempoOcupado: string;
  tempoLivre: string;
};

const MINUTOS_NO_DIA = 24 * 60;

export function resumoDoDia(horarios: Horario[]): ResumoDoDia {
  const total = horarios.length;
  const concluidos = horarios.filter((h) => h.concluido).length;
  const minutosOcupados = horarios.reduce((soma, h) => soma + duracaoEmMinutos(h), 0);
  return {
    total,
    concluidos,
    pendentes: total - concluidos,
    minutosOcupados,
    percentualConcluido: total === 0 ? 0 : Math.round((concluidos * 100) / total),
    tempoOcupado: formatarDuracao(minutosOcupados),
    tempoLivre: formatarDuracao(Math.max(0, MINUTOS_NO_DIA - minutosOcupados)),
  };
}

/** Ordena por inicio e, em empate, por fim — a ordem em que o dia acontece. */
export function ordenarPorHorario(horarios: Horario[]): Horario[] {
  return [...horarios].sort(
    (a, b) => emMinutos(a.horaInicio) - emMinutos(b.horaInicio)
      || emMinutos(a.horaFim) - emMinutos(b.horaFim),
  );
}
