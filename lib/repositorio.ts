import { and, asc, between, eq } from 'drizzle-orm';

import { ordenarPorHorario, type Horario } from './agenda';
import { db } from './db';
import { horarios as tabela, type LinhaHorario } from './db/schema';

/**
 * Acesso ao banco. Nenhuma regra de negocio mora aqui — as regras estao em
 * `lib/agenda.ts`, que roda sem banco e por isso e testada de verdade.
 *
 * O Postgres devolve `time` como "09:00:00". A tela e os <input type="time">
 * trabalham com "HH:mm", entao o corte acontece na fronteira, uma vez so, em
 * vez de espalhar `.slice(0, 5)` por toda a interface.
 */
function paraHorario(linha: LinhaHorario): Horario {
  return {
    id: linha.id,
    titulo: linha.titulo,
    descricao: linha.descricao,
    data: linha.data,
    horaInicio: linha.horaInicio.slice(0, 5),
    horaFim: linha.horaFim.slice(0, 5),
    concluido: linha.concluido,
  };
}

export async function listarPorDia(data: string): Promise<Horario[]> {
  const linhas = await db
    .select()
    .from(tabela)
    .where(eq(tabela.data, data))
    .orderBy(asc(tabela.horaInicio), asc(tabela.horaFim));
  return ordenarPorHorario(linhas.map(paraHorario));
}

export async function listarPorPeriodo(inicio: string, fim: string): Promise<Horario[]> {
  const linhas = await db
    .select()
    .from(tabela)
    .where(between(tabela.data, inicio, fim))
    .orderBy(asc(tabela.data), asc(tabela.horaInicio));
  return linhas.map(paraHorario);
}

export async function buscarPorId(id: number): Promise<Horario | undefined> {
  const [linha] = await db.select().from(tabela).where(eq(tabela.id, id)).limit(1);
  return linha ? paraHorario(linha) : undefined;
}

type ParaGravar = {
  titulo: string;
  descricao: string | null;
  data: string;
  horaInicio: string;
  horaFim: string;
  concluido: boolean;
};

export async function criar(dados: ParaGravar): Promise<Horario> {
  const [linha] = await db.insert(tabela).values(dados).returning();
  return paraHorario(linha);
}

export async function atualizar(id: number, dados: ParaGravar): Promise<Horario | undefined> {
  const [linha] = await db.update(tabela).set(dados).where(eq(tabela.id, id)).returning();
  return linha ? paraHorario(linha) : undefined;
}

export async function alternarConclusao(id: number): Promise<Horario | undefined> {
  const atual = await buscarPorId(id);
  if (!atual) return undefined;
  const [linha] = await db
    .update(tabela)
    .set({ concluido: !atual.concluido })
    .where(eq(tabela.id, id))
    .returning();
  return linha ? paraHorario(linha) : undefined;
}

export async function remover(id: number): Promise<boolean> {
  const apagadas = await db.delete(tabela).where(eq(tabela.id, id)).returning({ id: tabela.id });
  return apagadas.length > 0;
}

/** Compromissos do dia que podem disputar o intervalo, para a checagem de conflito. */
export async function doMesmoDia(data: string): Promise<Horario[]> {
  return listarPorDia(data);
}

export { and };
