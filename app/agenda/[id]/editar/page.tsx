import { notFound } from 'next/navigation';

import FormularioHorario from '@/app/agenda/FormularioHorario';
import ConfiguracaoPendente from '@/app/ConfiguracaoPendente';
import { bancoConfigurado } from '@/lib/db';
import { buscarPorId } from '@/lib/repositorio';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function EditarHorario({ params }: Props) {
  if (!bancoConfigurado()) return <ConfiguracaoPendente />;

  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero)) notFound();

  const horario = await buscarPorId(numero);
  if (!horario) notFound();

  return (
    <main className="pagina estreita">
      <header className="topo">
        <div>
          <p className="sobrescrito">Daily Planner</p>
          <h1>Editar compromisso</h1>
        </div>
      </header>

      <FormularioHorario edicao valoresIniciais={horario} />

      <footer className="rodape">
        <p>Daily Planner · Next.js + TypeScript + Postgres</p>
      </footer>
    </main>
  );
}
