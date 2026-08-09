import { boolean, date, pgTable, serial, time, varchar } from 'drizzle-orm/pg-core';

/**
 * A tabela da agenda.
 *
 * `data` e `date` e as horas sao `time` sem fuso, de proposito: um compromisso
 * das 09:00 do dia 4 e as 09:00 do dia 4 para quem marcou, independentemente de
 * onde o servidor da Vercel estiver rodando. Guardar como timestamp com fuso
 * faria o horario andar sozinho conforme a regiao.
 */
export const horarios = pgTable('horarios', {
  id: serial('id').primaryKey(),
  titulo: varchar('titulo', { length: 120 }).notNull(),
  descricao: varchar('descricao', { length: 500 }),
  data: date('data').notNull(),
  horaInicio: time('hora_inicio').notNull(),
  horaFim: time('hora_fim').notNull(),
  concluido: boolean('concluido').notNull().default(false),
});

export type LinhaHorario = typeof horarios.$inferSelect;
