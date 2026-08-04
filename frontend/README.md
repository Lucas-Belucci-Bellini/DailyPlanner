Front-end mínimo para o DailyPlanner usando Vite (vanilla JS).

Configurar:
- Defina `VITE_API_URL` apontando para a API Java (ex: https://meu-backend.example.com)

Rodar em dev:

```bash
cd frontend
npm install
npm run dev
```

Build para produção:

```bash
npm run build
```

No Vercel: selecione o diretório `frontend`, comando de build `npm run build` e output `dist`.
