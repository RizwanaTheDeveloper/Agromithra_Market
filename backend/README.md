# Backend setup

NestJS + Prisma 6 + PostgreSQL. See [architecture and API contract](ARCHITECTURE.md) for the APK feature mapping, permissions, request fields and planned integrations.

Run `npm.cmd run db:status` inside `backend` to print the effective PostgreSQL host, port, database, schema and record counts without exposing credentials. `npm.cmd run studio` starts Prisma Studio against this backend's schema. Connect pgAdmin to that same host/port/database and inspect `public."Listing"` or `public."BuyerRequest"`; Prisma Studio and pgAdmin are viewers of the same database, not separate storage destinations.

## Local setup (PowerShell)

Run from `backend/`:

```powershell
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste the generated value into OTP_SECRET in .env.
# Set DATABASE_URL to your actual PostgreSQL connection string.
npm.cmd ci
npx.cmd prisma generate
npm.cmd run prisma:deploy
npm.cmd run start:dev
```

For a new local database, start Docker Desktop and run `docker compose up -d`. The included Compose service uses database `agromitra_market`, user `agromitra`, password `local_development_only`, and port 5432 bound to localhost. Its connection string is:

```text
postgresql://agromitra:local_development_only@localhost:5432/agromitra_market?schema=public
```

Use the initial migration on a new database. If you previously created the starter's `User` table, review and baseline or migrate that existing database before deploying this initial migration; it intentionally does not drop existing data.

The API listens at `http://localhost:5000/api/v1`. `GET /health` checks PostgreSQL. CORS origins come from `.env`; use HTTPS for deployment. Development OTP codes appear in the challenge response only when `OTP_MODE=development` and `NODE_ENV` is not production. Real SMS delivery is not implemented.

## Quick authentication check

```powershell
$challenge = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/v1/auth/otp/request -ContentType application/json -Body '{"phone":"+919876543210"}'
$payload = @{ challengeId = $challenge.challengeId; code = $challenge.developmentCode } | ConvertTo-Json
$session = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/v1/auth/otp/verify -ContentType application/json -Body $payload
$headers = @{ Authorization = "Bearer $($session.accessToken)" }
Invoke-RestMethod -Uri http://localhost:5000/api/v1/users/me -Headers $headers
```

The phone is an example for local development, not a configured account. Repeated challenge requests are rate limited. Never expose development mode to real users.

## Checks

```powershell
npm.cmd test
npm.cmd run check
npx.cmd prisma validate
```

`npm test` builds the backend and runs permission, validation, date/price and authentication guard tests. A separate PostgreSQL API suite exercises OTP replay rejection, seller ownership, phone privacy, contact consent/blocking, idempotent quotes, concurrent stock reservation and cancellation.

Create a dedicated disposable PostgreSQL database, apply migrations to it, then run:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://USER:PASSWORD@localhost:5432/agromitra_market_test?schema=public'
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npm.cmd run prisma:deploy
npm.cmd run test:integration
```

The integration test inserts test users and cleans up its own records. It skips when `TEST_DATABASE_URL` is absent. Never point this setting at production. No sample marketplace prices or approvals are installed by a seed.

Before launch, complete the production requirements in the architecture document, especially SMS, shared abuse controls, media handling, observability and backup/restore validation.
