import { describe, expect, it } from 'vitest';

import {
  acharConflito,
  conflita,
  dataValida,
  duracaoEmMinutos,
  emMinutos,
  formatarDuracao,
  horaValida,
  mensagemDeConflito,
  ordenarPorHorario,
  resumoDoDia,
  temErro,
  validarCampos,
  type Horario,
} from '@/lib/agenda';

const DIA = '2026-08-04';

function h(id: number, titulo: string, inicio: string, fim: string, extras: Partial<Horario> = {}): Horario {
  return {
    id,
    titulo,
    descricao: null,
    data: DIA,
    horaInicio: inicio,
    horaFim: fim,
    concluido: false,
    ...extras,
  };
}

describe('leitura de hora e data', () => {
  it('converte hora para minutos desde a meia-noite', () => {
    expect(emMinutos('00:00')).toBe(0);
    expect(emMinutos('09:30')).toBe(570);
    expect(emMinutos('23:59')).toBe(1439);
  });

  it('recusa hora fora do relogio', () => {
    expect(horaValida('24:00')).toBe(false);
    expect(horaValida('09:60')).toBe(false);
    expect(horaValida('9:00')).toBe(false);
    expect(horaValida('')).toBe(false);
  });

  it('recusa data que nao existe no calendario', () => {
    expect(dataValida('2026-08-04')).toBe(true);
    // 2026 nao e bissexto: 29/02 nao existe e nao pode virar 01/03 sozinho.
    expect(dataValida('2026-02-29')).toBe(false);
    expect(dataValida('2026-13-01')).toBe(false);
    expect(dataValida('04/08/2026')).toBe(false);
  });
});

describe('duracao', () => {
  it('calcula os minutos entre inicio e fim', () => {
    expect(duracaoEmMinutos(h(1, 'a', '09:00', '10:30'))).toBe(90);
  });

  it('e zero quando o intervalo e invalido', () => {
    expect(duracaoEmMinutos(h(1, 'a', '10:00', '09:00'))).toBe(0);
    expect(duracaoEmMinutos(h(1, 'a', '10:00', '10:00'))).toBe(0);
  });

  it('formata para leitura', () => {
    expect(formatarDuracao(90)).toBe('1h30');
    expect(formatarDuracao(120)).toBe('2h');
    expect(formatarDuracao(45)).toBe('45min');
    expect(formatarDuracao(0)).toBe('0min');
  });
});

describe('conflito de horario', () => {
  it('detecta sobreposicao no mesmo dia', () => {
    expect(conflita(h(1, 'a', '09:00', '11:00'), h(2, 'b', '10:00', '12:00'))).toBe(true);
    expect(conflita(h(1, 'a', '09:00', '12:00'), h(2, 'b', '10:00', '11:00'))).toBe(true);
    expect(conflita(h(1, 'a', '10:00', '11:00'), h(2, 'b', '09:00', '12:00'))).toBe(true);
  });

  it('nao considera conflito quando um encosta no outro', () => {
    expect(conflita(h(1, 'a', '09:00', '10:00'), h(2, 'b', '10:00', '11:00'))).toBe(false);
  });

  it('nao considera conflito em dias diferentes', () => {
    const amanha = h(2, 'b', '09:00', '10:00', { data: '2026-08-05' });
    expect(conflita(h(1, 'a', '09:00', '10:00'), amanha)).toBe(false);
  });

  it('acha o compromisso que ja ocupa o intervalo', () => {
    const existentes = [h(1, 'Reuniao', '09:00', '11:00'), h(2, 'Almoco', '12:00', '13:00')];
    const achado = acharConflito(
      { titulo: 'Dentista', data: DIA, horaInicio: '10:00', horaFim: '12:00' },
      existentes,
    );
    expect(achado?.titulo).toBe('Reuniao');
    expect(mensagemDeConflito(achado!)).toContain('Reuniao');
    expect(mensagemDeConflito(achado!)).toContain('09:00');
  });

  it('na edicao, o compromisso nao conflita consigo mesmo', () => {
    const existentes = [h(1, 'Estudo', '09:00', '11:00')];
    const achado = acharConflito(
      { id: 1, titulo: 'Estudo', data: DIA, horaInicio: '09:00', horaFim: '12:00' },
      existentes,
    );
    expect(achado).toBeUndefined();
  });
});

describe('validacao dos campos', () => {
  const base = { titulo: 'Estudo', data: DIA, horaInicio: '09:00', horaFim: '10:00' };

  it('aceita um compromisso bem preenchido', () => {
    expect(temErro(validarCampos(base))).toBe(false);
  });

  it('exige titulo que nao seja so espaco', () => {
    expect(validarCampos({ ...base, titulo: '   ' }).titulo).toBe('Informe o titulo da tarefa');
  });

  it('limita o tamanho do titulo e da descricao', () => {
    expect(validarCampos({ ...base, titulo: 'x'.repeat(121) }).titulo).toContain('120');
    expect(validarCampos({ ...base, descricao: 'x'.repeat(501) }).descricao).toContain('500');
  });

  it('exige termino depois do inicio', () => {
    expect(validarCampos({ ...base, horaInicio: '10:00', horaFim: '09:00' }).horaFim)
      .toBe('O termino precisa ser depois do inicio');
    expect(validarCampos({ ...base, horaInicio: '10:00', horaFim: '10:00' }).horaFim)
      .toBe('O termino precisa ser depois do inicio');
  });

  it('cobra os campos obrigatorios', () => {
    const erros = validarCampos({ titulo: '', data: '', horaInicio: '', horaFim: '' });
    expect(erros.titulo).toBeDefined();
    expect(erros.data).toBeDefined();
    expect(erros.horaInicio).toBeDefined();
    expect(erros.horaFim).toBeDefined();
  });
});

describe('resumo do dia', () => {
  it('soma tempo ocupado e conta os concluidos', () => {
    const resumo = resumoDoDia([
      h(1, 'Estudo', '09:00', '11:00'),
      h(2, 'Almoco', '12:00', '13:00', { concluido: true }),
    ]);
    expect(resumo.total).toBe(2);
    expect(resumo.concluidos).toBe(1);
    expect(resumo.pendentes).toBe(1);
    expect(resumo.percentualConcluido).toBe(50);
    expect(resumo.tempoOcupado).toBe('3h');
    expect(resumo.tempoLivre).toBe('21h');
  });

  it('dia vazio tem 24h livres e nenhum percentual', () => {
    const resumo = resumoDoDia([]);
    expect(resumo.total).toBe(0);
    expect(resumo.percentualConcluido).toBe(0);
    expect(resumo.tempoLivre).toBe('24h');
  });
});

describe('ordenacao', () => {
  it('coloca o dia na ordem em que ele acontece', () => {
    const fora = [h(1, 'Almoco', '12:00', '13:00'), h(2, 'Estudo', '09:00', '11:00')];
    expect(ordenarPorHorario(fora).map((x) => x.titulo)).toEqual(['Estudo', 'Almoco']);
  });

  it('desempata pelo horario de termino', () => {
    const fora = [h(1, 'Longo', '09:00', '12:00'), h(2, 'Curto', '09:00', '10:00')];
    expect(ordenarPorHorario(fora).map((x) => x.titulo)).toEqual(['Curto', 'Longo']);
  });
});
