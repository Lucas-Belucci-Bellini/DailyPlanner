import { afterEach, describe, expect, it } from 'vitest';

import { bancoConfigurado } from '@/lib/db';

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe('deteccao de banco configurado', () => {
  it('aceita POSTGRES_URL, que e o nome injetado pela Vercel', () => {
    delete process.env.DATABASE_URL;
    process.env.POSTGRES_URL = 'postgresql://u:s@host:5432/db';
    expect(bancoConfigurado()).toBe(true);
  });

  it('aceita DATABASE_URL, usado por Supabase, Neon e Postgres local', () => {
    delete process.env.POSTGRES_URL;
    process.env.DATABASE_URL = 'postgresql://u:s@host:5432/db';
    expect(bancoConfigurado()).toBe(true);
  });

  it('sem nenhuma das duas, a aplicacao sabe que falta configurar', () => {
    delete process.env.POSTGRES_URL;
    delete process.env.DATABASE_URL;
    expect(bancoConfigurado()).toBe(false);
  });

  it('string vazia conta como ausente, e nao como banco valido', () => {
    process.env.POSTGRES_URL = '';
    process.env.DATABASE_URL = '';
    expect(bancoConfigurado()).toBe(false);
  });
});
