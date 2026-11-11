# Starts database, backend (http://localhost:5000) and frontend (http://localhost:4173) together.
# Run from the repository root:  .\dev.ps1
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

docker info *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker is not running. Start Docker Desktop, wait until it says "running", then run this again. (Or point DATABASE_URL in backend/.env at your own PostgreSQL and skip the docker lines.)' }

Push-Location "$root\backend"
docker compose up -d --wait
if ($LASTEXITCODE -ne 0) { throw 'Database did not start.' }
if (!(Test-Path node_modules)) { npm install }
npx prisma generate
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw 'Migration failed. Check DATABASE_URL in backend/.env.' }
npm run build
Pop-Location

if (!(Test-Path "$root\frontend\node_modules")) { Push-Location "$root\frontend"; npm install; Pop-Location }

Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$root\backend'; npm start"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$root\frontend'; npm run web"
Write-Host 'Backend: http://localhost:5000/api/v1/health   Frontend: http://localhost:4173'
Write-Host 'Sign in on the frontend; the one-time code is shown on screen in development mode.'
