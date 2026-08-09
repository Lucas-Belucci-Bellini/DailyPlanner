import FormularioHorario from '@/app/agenda/FormularioHorario';
import ConfiguracaoPendente from '@/app/ConfiguracaoPendente';
import { hojeISO } from '@/lib/datas';
import { bancoConfigurado } from '@/lib/db';

// Sob demanda, e nao estatica: a checagem de banco le uma variavel de
// ambiente. Prerenderizada, ela congelaria o resultado do momento do build, e
// a tela de "falta conectar o banco" continuaria aparecendo mesmo depois de o
// banco existir.
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ data?: string }> };

export default async function NovoHorario({ searchParams }: Props) {
  if (!bancoConfigurado()) return <ConfiguracaoPendente />;

  const { data } = await searchParams;
  const dia = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : hojeISO();

  return (
    <main className="pagina estreita">
      <header className="topo">
        <div>
          <p className="sobrescrito">Daily Planner</p>
          <h1>Novo compromisso</h1>
        </div>
      </header>

      <FormularioHorario
        edicao={false}
        valoresIniciais={{
          titulo: '',
          descricao: '',
          data: dia,
          horaInicio: '',
          horaFim: '',
          concluido: false,
        }}
      />

      <footer className="rodape">
        <p>Daily Planner · Next.js + TypeScript + Postgres</p>
      </footer>
    </main>
  );
}
