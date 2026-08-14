# Frontend do Daily Planner

Este diretório contém a aplicação estática do Daily Planner. O código utiliza TypeScript sem framework de componentes, Vite para desenvolvimento e build, e `localStorage` para persistir os compromissos localmente.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Verificação e build

```bash
npm run check
npm run build
npm run preview
```

A aplicação possui quatro áreas principais:

| Arquivo | Responsabilidade |
| --- | --- |
| `src/main.ts` | Renderização da interface, eventos e operações de CRUD. |
| `src/types.ts` | Tipos, formatação de datas, duração e regras de validação. |
| `src/storage.ts` | Leitura e gravação segura dos compromissos no navegador. |
| `src/style.css` | Layout, identidade visual, responsividade e acessibilidade. |
