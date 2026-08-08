'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { salvarHorario, type EstadoFormulario } from '@/app/actions';
import { LIMITE_DESCRICAO, LIMITE_TITULO, type DadosHorario } from '@/lib/agenda';

type Props = { valoresIniciais: DadosHorario; edicao: boolean };

/**
 * O formulario de criar e editar.
 *
 * `useActionState` guarda os erros E o que foi digitado: no erro, os campos
 * voltam preenchidos em vez de zerados. Como a action e um Server Action ligado
 * direto no `action` do <form>, o envio continua sendo um POST de formulario
 * comum — a validacao que vale e a do servidor, nao a do navegador.
 */
export default function FormularioHorario({ valoresIniciais, edicao }: Props) {
  const [estado, acao, enviando] = useActionState<EstadoFormulario, FormData>(
    salvarHorario,
    { erros: {}, valores: valoresIniciais },
  );

  const v = estado.valores ?? valoresIniciais;
  const erros = estado.erros ?? {};

  return (
    <form className="formulario" action={acao}>
      {v.id ? <input type="hidden" name="id" defaultValue={v.id} /> : null}

      <div className="campo">
        <label htmlFor="titulo">Titulo</label>
        <input
          id="titulo"
          name="titulo"
          type="text"
          maxLength={LIMITE_TITULO}
          defaultValue={v.titulo}
          placeholder="Ex.: Estudar para a prova"
          autoFocus
        />
        {erros.titulo && <p className="erro">{erros.titulo}</p>}
      </div>

      <div className="campo">
        <label htmlFor="data">Data</label>
        <input id="data" name="data" type="date" defaultValue={v.data} />
        {erros.data && <p className="erro">{erros.data}</p>}
      </div>

      <div className="linha">
        <div className="campo">
          <label htmlFor="horaInicio">Comeca as</label>
          <input id="horaInicio" name="horaInicio" type="time" defaultValue={v.horaInicio} />
          {erros.horaInicio && <p className="erro">{erros.horaInicio}</p>}
        </div>
        <div className="campo">
          <label htmlFor="horaFim">Termina as</label>
          <input id="horaFim" name="horaFim" type="time" defaultValue={v.horaFim} />
          {erros.horaFim && <p className="erro">{erros.horaFim}</p>}
        </div>
      </div>

      <div className="campo">
        <label htmlFor="descricao">
          Descricao <span className="opcional">(opcional)</span>
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          maxLength={LIMITE_DESCRICAO}
          defaultValue={v.descricao ?? ''}
          placeholder="Detalhes, link da reuniao, o que precisa levar..."
        />
        {erros.descricao && <p className="erro">{erros.descricao}</p>}
      </div>

      <label className="caixa">
        <input type="checkbox" name="concluido" defaultChecked={v.concluido ?? false} />
        <span>Ja esta concluido</span>
      </label>

      <div className="acoes-formulario">
        <button className="botao primario" type="submit" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar'}
        </button>
        <Link className="botao" href={`/agenda?data=${v.data}`}>
          Cancelar
        </Link>
      </div>

      <p className="oculto" aria-live="polite">
        {edicao ? 'Editando compromisso' : 'Novo compromisso'}
      </p>
    </form>
  );
}
