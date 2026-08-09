/**
 * Tela mostrada quando a aplicacao esta no ar mas ainda nao tem banco.
 *
 * Esse estado e normal logo depois do primeiro deploy: o codigo sobe, o banco
 * e um passo separado. Sem esta tela, o visitante receberia a pagina de erro
 * 500 do Next -- que nao explica nada e parece que o sistema esta quebrado.
 * Aqui ele ve que falta um passo de configuracao, e quem administra ve qual.
 */
export default function ConfiguracaoPendente() {
  return (
    <main className="pagina estreita">
      <header className="topo">
        <div>
          <p className="sobrescrito">Daily Planner</p>
          <h1>Falta conectar o banco</h1>
        </div>
      </header>

      <p className="aviso falha">
        A aplicacao subiu, mas ainda nao existe banco de dados para guardar os
        compromissos.
      </p>

      <div className="formulario">
        <p>
          Os dados ficam num Postgres, que e criado separadamente do deploy.
          Dois passos resolvem:
        </p>

        <ol className="passos">
          <li>
            Na Vercel, abra o projeto e va em <strong>Storage → Create Database
            → Postgres</strong>. A variavel <code>POSTGRES_URL</code> passa a ser
            injetada sozinha, e o proximo deploy ja a enxerga.
          </li>
          <li>
            Crie a tabela rodando <code>npm run db:push</code> uma vez apontando
            para esse banco.
          </li>
        </ol>

        <p className="descricao">
          Rodando na sua maquina? Copie <code>.env.example</code> para{' '}
          <code>.env.local</code> e aponte <code>POSTGRES_URL</code> para um
          Postgres seu.
        </p>
      </div>

      <footer className="rodape">
        <p>Daily Planner · Next.js + TypeScript + Postgres</p>
      </footer>
    </main>
  );
}
