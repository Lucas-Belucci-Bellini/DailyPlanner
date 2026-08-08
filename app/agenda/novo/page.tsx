import FormularioHorario from '@/app/agenda/FormularioHorario';
import { hojeISO } from '@/lib/datas';

type Props = { searchParams: Promise<{ data?: string }> };

export default async function NovoHorario({ searchParams }: Props) {
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
