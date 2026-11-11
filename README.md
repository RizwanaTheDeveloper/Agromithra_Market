# Agromitra Market — TypeScript starter

Two independent projects:
- `frontend/` React Native + Expo Router + TypeScript
- `backend/` NestJS + Prisma 6 + PostgreSQL + TypeScript

The backend now provides a marketplace foundation designed from the v1.2 prototype APK. The frontend (Expo + the marketplace UI in `frontend/src`) is connected to it: sign-in by OTP, listings with photo/video upload, buyer verification, contact, quotes/deals and requirements all go through the API. Read [backend setup](backend/README.md) and [backend architecture and API contract](backend/ARCHITECTURE.md) for implemented features, APK integration and remaining provider work. Unused directories containing `.gitkeep` are still placeholders.

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
# Generate OTP_SECRET and paste it into .env:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm install
npx prisma generate
npm run prisma:deploy
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

For a **real Android phone**, replace `MARKET_API_URL` in `frontend/.env` with your **PC LAN IPv4** (`ipconfig`), e.g. `http://192.168.1.10:5000/api/v1`. Keep phone + PC on same Wi-Fi and allow TCP port 5000 through Windows Firewall. Android emulator typically uses `http://10.0.2.2:5000/api/v1`. On web, use `http://localhost:5000/api/v1`.

`MARKET_API_URL` is baked into the client at build time (`npm run web` or `npm start` rebuilds it): never put secrets there. The backend holds `DATABASE_URL` and JWT/provider secrets.

## PostgreSQL local example

Create a database named `agromitra_market` using pgAdmin or:

```sql
CREATE DATABASE agromitra_market;
```

Update `backend/.env` before running Prisma migrations. Prisma is pinned to 6.19.3 in this starter to use the conventional `schema.prisma` datasource URL and Nest PrismaService pattern.

## Backend endpoints

- GET `/api/v1/health` — status + database connectivity
- GET `/api/v1/listings` — active, unexpired marketplace listings

Authentication, profile, verification, contact, request, deal and market routes are documented in [the API contract](backend/ARCHITECTURE.md).

The backend implements development OTP challenges, revocable bearer sessions, listings, buyer verification review, seller contact authorization, buyer requests, deals and market reference imports. Photo and video uploads are stored in PostgreSQL. SMS delivery, AI inference and billing still require provider integrations. The frontend runs against the API when `MARKET_DATA_SOURCE=server` and falls back to the offline demo when `local` or no API URL is set. Verify the whole flow with `npm run test:connected` in `frontend/` (needs `TEST_DATABASE_URL`, a disposable migrated database). See the backend API contract for routes and current limits.

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

## Sign-in, administrators and production settings

- **Login:** the app has a Sign in screen (welcome page and Account). Sign-in is by mobile number and one-time code. Browsing needs no account.
- **Administrators:** put their numbers (e.g. `+919876543210`) in `ADMIN_PHONES` in `backend/.env`. When they sign in, an *Review buyers* entry appears in Account to approve buyer profiles or send them back with a note.
- **Real SMS:** set `OTP_MODE=sms` and the `TWILIO_*` values (see `backend/.env.example`). Codes are then texted and never returned by the API. With `OTP_MODE=development` the code is shown on screen (never in production).
- **Hardening:** security headers (helmet), per-client rate limits (`THROTTLE_LIMIT`, stricter on sign-in) and one log line per request (no bodies or query strings). Behind a proxy set `TRUST_PROXY=1` and serve over HTTPS.
- **Docker:** `docker build -t agromitra-api backend` builds the API image; it applies migrations on start.
- **Not built yet:** payments, AI analysis, push notifications/subscriptions, and object storage for media (uploads are kept in PostgreSQL).
