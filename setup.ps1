# Run in PowerShell from the extracted Agromitra_Market directory.
$ErrorActionPreference = 'Stop'
if (!(Test-Path 'frontend/.env')) { Copy-Item 'frontend/.env.example' 'frontend/.env' }
if (!(Test-Path 'backend/.env')) { Copy-Item 'backend/.env.example' 'backend/.env' }
Write-Host 'Installing backend packages...'
Push-Location backend
npm install
if ($LASTEXITCODE -ne 0) { throw 'Backend npm install failed' }
Pop-Location
Write-Host 'Installing frontend packages...'
Push-Location frontend
npm install
if ($LASTEXITCODE -ne 0) { throw 'Frontend npm install failed' }
npx expo install --fix
if ($LASTEXITCODE -ne 0) { throw 'Expo dependency check failed' }
Pop-Location
Write-Host 'Packages installed. Configure backend/.env and frontend/.env, then run Prisma migrate and both dev servers. See README.md.'
