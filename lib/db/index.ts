import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

type Banco = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Conexao com o Postgres, aberta so na primeira consulta.
 *
 * A preguica e proposital. Se a conexao fosse criada ao importar o modulo,
 * `next build` quebraria em qualquer maquina sem banco configurado — inclusive
 * no CI, que so precisa compilar e rodar os testes das regras. Adiando para a
 * primeira consulta, o build passa e quem realmente vai ao banco e que recebe o
 * erro, com uma mensagem que diz o que fazer.
 *
 * `max: 1` nao e economia: em funcao serverless cada invocacao pode subir um
 * processo novo, e um pool grande por processo esgota o limite de conexoes do
 * banco assim que chega trafego.
 */
/**
 * Ha banco configurado?
 *
 * As telas perguntam isso ANTES de consultar. Sem essa checagem, a falta da
 * variavel vira uma excecao no meio da renderizacao e o visitante recebe a
 * pagina de erro 500 do Next, que nao diz nada a quem esta so olhando o site.
 * Com ela, a aplicacao explica o que falta configurar.
 */
export function bancoConfigurado(): boolean {
  return Boolean(process.env.POSTGRES_URL ?? process.env.DATABASE_URL);
}

function urlDoBanco(): string {
  const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'Banco nao configurado: defina POSTGRES_URL ou DATABASE_URL. '
      + 'Na Vercel, use Storage -> Create Database (Postgres), que injeta a '
      + 'variavel sozinha. Localmente, copie .env.example para .env.local.',
    );
  }
  return url;
}

// Em desenvolvimento o Next recarrega os modulos a cada edicao. Sem guardar a
// conexao no globalThis, cada recarga abriria mais uma e o banco recusaria
// novas conexoes depois de algumas dezenas de salvamentos.
const global_ = globalThis as unknown as {
  __conexaoDailyPlanner?: ReturnType<typeof postgres>;
  __dbDailyPlanner?: Banco;
};

function abrir(): Banco {
  if (global_.__dbDailyPlanner) return global_.__dbDailyPlanner;

  const conexao = global_.__conexaoDailyPlanner ?? postgres(urlDoBanco(), { max: 1 });
  const banco = drizzle(conexao, { schema });

  if (process.env.NODE_ENV !== 'production') {
    global_.__conexaoDailyPlanner = conexao;
    global_.__dbDailyPlanner = banco;
  }
  return banco;
}

/**
 * Fachada preguicosa: qualquer acesso a uma propriedade abre a conexao na hora,
 * e importar este modulo continua sendo de graca.
 */
export const db = new Proxy({} as Banco, {
  get(_alvo, propriedade, receptor) {
    const banco = abrir();
    const valor = Reflect.get(banco as object, propriedade, receptor);
    return typeof valor === 'function' ? valor.bind(banco) : valor;
  },
});
