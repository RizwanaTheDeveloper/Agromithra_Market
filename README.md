# Agromitra Market — TypeScript starter

Two independent projects:
- `frontend/` React Native + Expo Router + TypeScript
- `backend/` NestJS + Prisma 6 + PostgreSQL + TypeScript

This is a **starter template**, not a reconstruction of the prototype APK or an implemented marketplace. All unused modules are placeholders.

## Requirements
- Node.js 22 LTS or later (compatible with the installed Expo/Nest versions)
- npm
- PostgreSQL running locally (or a hosted database)
- Android phone with compatible Expo Go / Android emulator

## Windows PowerShell: install

Open the extracted `Agromitra_Market` folder in VS Code.

### Terminal 1 — PostgreSQL / backend

```powershell
cd backend
Copy-Item .env.example .env
# Edit .env: set DATABASE_URL to your actual PostgreSQL credentials and database.
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

Backend: http://localhost:5000/api/v1/health

### Terminal 2 — mobile frontend

```powershell
cd frontend
Copy-Item .env.example .env
npm install
# Adjust Expo packages to match the chosen SDK if npm reports a mismatch:
npx expo install --fix
npx expo start --clear
```

For a **real Android phone**, replace `EXPO_PUBLIC_API_URL` with your **PC LAN IPv4** (`ipconfig`), e.g. `http://192.168.1.10:5000/api/v1`. Keep phone + PC on same Wi-Fi and allow TCP port 5000 through Windows Firewall. Android emulator typically uses `http://10.0.2.2:5000/api/v1`. On web, use `http://localhost:5000/api/v1`.

`EXPO_PUBLIC_*` variables are baked into the client: never put secrets there. The backend holds `DATABASE_URL` and JWT/provider secrets.

## PostgreSQL local example

Create a database named `agromitra_market` using pgAdmin or:

```sql
CREATE DATABASE agromitra_market;
```

Update `backend/.env` before running Prisma migrations. Prisma is pinned to 6.19.3 in this starter to use the conventional `schema.prisma` datasource URL and Nest PrismaService pattern.

## Available starter endpoints

- GET `/api/v1/health` — status + database connectivity
- GET `/api/v1/listings` — sample empty list (not production listings)

No real OTP, JWT, media upload, pricing, AI, billing or buyer contact authorization is implemented. These directories are architectural placeholders and MUST NOT be treated as secure APIs.

## Expo Router
`frontend/package.json` main points to `expo-router/entry`; `src/app/` is the route root, with root and tabs layouts.

## Validation

```powershell
# backend
cd backend
npm run build
npx prisma validate

# frontend
cd ../frontend
npx tsc --noEmit
npx expo-doctor
```

Dependency metadata was prepared without accessing the npm registry in this environment. Use `npx expo install --fix` to resolve Expo's native peer dependency matrix for your environment.
