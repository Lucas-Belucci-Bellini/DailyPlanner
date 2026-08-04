Deployment instructions

Backend (Docker) — build and run locally

1. Build the Docker image (requires Docker installed):

```bash
docker build -t dailyplanner-backend:latest .
```

2. Run the container (expose port 8080):

```bash
docker run -e TELEGRAM_TOKEN=your_token -e TELEGRAM_CHATID=your_chat_id -p 8080:8080 dailyplanner-backend:latest
```

Notes about environment variables:
- Spring reads properties from env vars when available. The properties `telegram.token` and `telegram.chatId` can be provided as the environment variables `TELEGRAM_TOKEN` and `TELEGRAM_CHATID` (dots -> underscores, uppercase). Example: `-e TELEGRAM_TOKEN=... -e TELEGRAM_CHATID=...`.
- To use a managed Postgres in production, set `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` (or use the provider's `DATABASE_URL` mapping). Render/Railway usually expose a `DATABASE_URL` you can map to Spring's properties.

Deploy to Render / Railway / Fly

- Create a new Web Service on Render or Railway and connect your GitHub repo.
- Use the Dockerfile (recommended) or set the build command `./mvnw -DskipTests package` and start command `java -jar target/*.jar`.
- Configure environment variables/secrets in the service dashboard (telegram token, chat id, database creds).

Frontend (Vite) — Vercel

- In the Vercel dashboard, create a new project and import this repository.
- Set the Root Directory to `frontend`.
- Build Command: `npm run build`.
- Output Directory: `dist`.
- Define environment variable `VITE_API_URL` pointing to your backend public URL.

Local frontend dev:

```bash
cd frontend
npm install
npm run dev
```
