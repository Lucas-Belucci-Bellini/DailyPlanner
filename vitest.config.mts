import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  // O mesmo alias "@/" do tsconfig. Sem repeti-lo aqui, o TypeScript resolve os
  // imports mas o Vitest nao, e a bateria quebra na importacao.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    // Os testes cobrem as regras puras de lib/, que rodam sem banco e sem DOM.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
