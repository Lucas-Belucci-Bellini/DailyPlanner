'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  acharConflito,
  mensagemDeConflito,
  temErro,
  validarCampos,
  type DadosHorario,
  type ErrosDeCampo,
} from '@/lib/agenda';
import * as repo from '@/lib/repositorio';

export type EstadoFormulario = {
  erros: ErrosDeCampo;
  /** O que a pessoa digitou, devolvido para o formulario nao apagar tudo no erro. */
  valores: DadosHorario;
};

function lerFormulario(dados: FormData): DadosHorario {
  const idBruto = String(dados.get('id') ?? '').trim();
  const descricao = String(dados.get('descricao') ?? '').trim();
  return {
    id: idBruto ? Number(idBruto) : undefined,
    titulo: String(dados.get('titulo') ?? '').trim(),
    descricao: descricao || null,
    data: String(dados.get('data') ?? ''),
    horaInicio: String(dados.get('horaInicio') ?? ''),
    horaFim: String(dados.get('horaFim') ?? ''),
    concluido: dados.get('concluido') === 'on',
  };
}

/**
 * Cria ou atualiza um compromisso.
 *
 * A validacao de campo roda antes de tocar no banco; so depois vem a checagem
 * de conflito, que precisa consultar o dia. Se algo falha, o retorno traz os
 * erros E os valores digitados — perder o que a pessoa escreveu por causa de um
 * campo errado e o jeito mais rapido de fazer alguem desistir do formulario.
 */
export async function salvarHorario(
  _anterior: EstadoFormulario,
  dadosDoForm: FormData,
): Promise<EstadoFormulario> {
  const dados = lerFormulario(dadosDoForm);

  const erros = validarCampos(dados);
  if (temErro(erros)) return { erros, valores: dados };

  const doDia = await repo.doMesmoDia(dados.data);
  const conflitante = acharConflito(dados, doDia);
  if (conflitante) {
    return {
      erros: { horaInicio: mensagemDeConflito(conflitante) },
      valores: dados,
    };
  }

  const paraGravar = {
    titulo: dados.titulo,
    descricao: dados.descricao ?? null,
    data: dados.data,
    horaInicio: dados.horaInicio,
    horaFim: dados.horaFim,
    concluido: dados.concluido ?? false,
  };

  if (dados.id) {
    const atualizado = await repo.atualizar(dados.id, paraGravar);
    if (!atualizado) {
      return { erros: { titulo: 'Esse compromisso nao existe mais' }, valores: dados };
    }
  } else {
    await repo.criar(paraGravar);
  }

  revalidatePath('/agenda');
  redirect(`/agenda?data=${dados.data}`);
}

export async function alternarConclusao(dadosDoForm: FormData): Promise<void> {
  const id = Number(dadosDoForm.get('id'));
  const atualizado = await repo.alternarConclusao(id);
  revalidatePath('/agenda');
  redirect(`/agenda?data=${atualizado?.data ?? ''}`);
}

export async function removerHorario(dadosDoForm: FormData): Promise<void> {
  const id = Number(dadosDoForm.get('id'));
  const data = String(dadosDoForm.get('data') ?? '');
  await repo.remover(id);
  revalidatePath('/agenda');
  redirect(`/agenda?data=${data}`);
}
