import Link from 'next/link';

import { alternarConclusao, removerHorario } from '@/app/actions';
import { formatarDuracao, duracaoEmMinutos, resumoDoDia } from '@/lib/agenda';
import { hojeISO, porExtenso, somarDias } from '@/lib/datas';
import ConfiguracaoPendente from '@/app/ConfiguracaoPendente';
import { bancoConfigurado } from '@/lib/db';
import { listarPorDia } from '@/lib/repositorio';

// A agenda muda a cada gravacao, entao a pagina e sempre montada na hora.
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ data?: string }> };

export default async function AgendaDoDia({ searchParams }: Props) {
  if (!bancoConfigurado()) return <ConfiguracaoPendente />;

  const { data } = await searchParams;
  const hoje = hojeISO();
  const dia = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : hoje;

  const horarios = await listarPorDia(dia);
  const resumo = resumoDoDia(horarios);

  return (
    <main className="pagina">
      <header className="topo">
        <div>
          <p className="sobrescrito">Daily Planner</p>
          <h1>{porExtenso(dia)}</h1>
        </div>
        <Link className="botao primario" href={`/agenda/novo?data=${dia}`}>
          + Novo compromisso
        </Link>
      </header>

      <nav className="navegacao">
        <Link className="botao" href={`/agenda?data=${somarDias(dia, -1)}`}>
          &larr; Dia anterior
        </Link>

        <form className="ir-para-data" method="get" action="/agenda">
          <label className="oculto" htmlFor="campo-data">Escolher data</label>
          <input id="campo-data" type="date" name="data" defaultValue={dia} />
          <button className="botao" type="submit">Ir</button>
        </form>

        <Link className={`botao${dia === hoje ? ' ativo' : ''}`} href={`/agenda?data=${hoje}`}>
          Hoje
        </Link>
        <Link className="botao" href={`/agenda?data=${somarDias(dia, 1)}`}>
          Proximo dia &rarr;
        </Link>
      </nav>

      {resumo.total > 0 && (
        <section className="resumo">
          <div className="cartao">
            <span className="numero">{resumo.total}</span>
            <span className="rotulo">compromissos</span>
          </div>
          <div className="cartao">
            <span className="numero">{resumo.pendentes}</span>
            <span className="rotulo">pendentes</span>
          </div>
          <div className="cartao">
            <span className="numero">{resumo.tempoOcupado}</span>
            <span className="rotulo">ocupado</span>
          </div>
          <div className="cartao">
            <span className="numero">{resumo.tempoLivre}</span>
            <span className="rotulo">livre</span>
          </div>
          <div className="cartao progresso">
            <span className="numero">{resumo.percentualConcluido}%</span>
            <progress value={resumo.percentualConcluido} max={100} />
            <span className="rotulo">
              {resumo.concluidos} de {resumo.total} concluidos
            </span>
          </div>
        </section>
      )}

      {horarios.length === 0 ? (
        <p className="vazio">
          Nenhum compromisso marcado para este dia. O dia inteiro esta livre.
        </p>
      ) : (
        <ol className="linha-do-tempo">
          {horarios.map((h) => (
            <li key={h.id} className={h.concluido ? 'concluido' : undefined}>
              <div className="faixa">
                <span className="inicio">{h.horaInicio}</span>
                <span className="fim">{h.horaFim}</span>
                <span className="duracao">{formatarDuracao(duracaoEmMinutos(h))}</span>
              </div>

              <div className="conteudo">
                <h2>{h.titulo}</h2>
                {h.descricao && <p className="descricao">{h.descricao}</p>}
              </div>

              <div className="acoes">
                <form action={alternarConclusao}>
                  <input type="hidden" name="id" value={h.id} />
                  <button className="botao pequeno" type="submit">
                    {h.concluido ? 'Reabrir' : 'Concluir'}
                  </button>
                </form>
                <Link className="botao pequeno" href={`/agenda/${h.id}/editar`}>
                  Editar
                </Link>
                <form action={removerHorario}>
                  <input type="hidden" name="id" value={h.id} />
                  <input type="hidden" name="data" value={h.data} />
                  <button className="botao pequeno perigo" type="submit">
                    Remover
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ol>
      )}

      <footer className="rodape">
        <p>Daily Planner · Next.js + TypeScript + Postgres · paginas montadas no servidor</p>
      </footer>
    </main>
  );
}
