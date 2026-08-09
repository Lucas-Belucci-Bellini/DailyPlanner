import { describe, expect, it } from 'vitest';

import { curta, hojeISO, porExtenso, somarDias } from '@/lib/datas';

describe('datas em portugues', () => {
  it('escreve a data por extenso', () => {
    expect(porExtenso('2026-08-04')).toBe('Terca-feira, 4 de agosto de 2026');
    expect(porExtenso('2026-12-25')).toBe('Sexta-feira, 25 de dezembro de 2026');
  });

  it('deixa maiuscula so a primeira letra', () => {
    const texto = porExtenso('2026-12-25');
    expect(texto).not.toContain(' De ');
    expect(texto).not.toContain('-Feira');
  });

  it('escreve a data curta', () => {
    expect(curta('2026-08-04')).toBe('04/08/2026');
  });
});

describe('navegacao entre dias', () => {
  it('anda para frente e para tras', () => {
    expect(somarDias('2026-08-04', 1)).toBe('2026-08-05');
    expect(somarDias('2026-08-04', -1)).toBe('2026-08-03');
  });

  it('atravessa virada de mes e de ano', () => {
    expect(somarDias('2026-08-31', 1)).toBe('2026-09-01');
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(somarDias('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('respeita ano bissexto', () => {
    expect(somarDias('2028-02-28', 1)).toBe('2028-02-29');
    expect(somarDias('2026-02-28', 1)).toBe('2026-03-01');
  });
});

describe('hoje', () => {
  it('usa o fuso de Brasilia, nao o do servidor', () => {
    // 04/08 as 02:00 UTC ainda e dia 03 em Brasilia (UTC-3). Num servidor da
    // Vercel rodando em UTC, ler a data local mostraria o dia seguinte para
    // quem abre a agenda de madrugada.
    expect(hojeISO(new Date('2026-08-04T02:00:00Z'))).toBe('2026-08-03');
    expect(hojeISO(new Date('2026-08-04T12:00:00Z'))).toBe('2026-08-04');
  });
});
