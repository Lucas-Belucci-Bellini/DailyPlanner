# Publicação do Daily Planner

O Daily Planner é uma aplicação estática. A build final contém apenas HTML, CSS e JavaScript gerado pelo TypeScript, portanto não é necessário configurar servidor, banco de dados ou variáveis secretas para o fluxo atual.

## Build local

Na raiz do repositório:

```bash
cd frontend
npm install
npm run build
```

A pasta `frontend/dist` será criada com os arquivos prontos para publicação. Para revisar a build localmente:

```bash
npm run preview
```

## GitHub Pages

O workflow `.github/workflows/deploy-frontend.yml` executa o build automaticamente em cada push para `main` e publica `frontend/dist` no GitHub Pages.

Na primeira publicação, abra **Settings → Pages** no GitHub e selecione **GitHub Actions** como fonte de deploy. Depois, faça um novo push para `main` ou execute o workflow manualmente na aba **Actions**.

## Vercel

O repositório possui um `vercel.json` na raiz. Ele versiona a configuração para que a Vercel instale as dependências em `frontend`, execute o build do Vite e publique `frontend/dist` mesmo quando o projeto for configurado com a raiz do repositório.

1. Importe o repositório `Lucas-Belucci-Bellini/DailyPlanner` na Vercel ou mantenha o projeto `daily-planner` conectado a ele.
2. Defina `main` como **Production Branch**.
3. Se o painel solicitar configurações manuais, use `frontend` como **Root Directory**, `npm run build` como **Build Command** e `dist` como **Output Directory**. Com a raiz do repositório selecionada, o `vercel.json` já fornece os comandos equivalentes.
4. Faça um novo deploy ou aguarde o deploy automático após o merge na `main`.

Nenhuma variável de ambiente é necessária para a versão atual.

## Netlify ou outro servidor estático

Configure o diretório base como `frontend`, o comando de build como `npm run build` e o diretório de publicação como `frontend/dist` ou `dist`, conforme o painel do serviço. O arquivo gerado pode ser servido por qualquer servidor HTTP estático.

## Dados da agenda

Os compromissos são gravados no `localStorage` de cada navegador. Isso significa que o deploy não armazena dados no servidor e que a mesma agenda não aparece automaticamente em outro dispositivo. Para fazer backup, use o botão **Exportar** dentro da aplicação; para restaurar, use **Importar** e selecione o JSON salvo.
