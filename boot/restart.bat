@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo  Starting SuperCrypto services
echo ========================================

REM Point to the real DB for both compile-time sqlx macros and runtime.
set "DATABASE_URL=sqlite:E:/cryptoplatform-data/app.sqlite"

REM Stop old backend/frontend instances before starting new ones.
call "%~dp0stop.bat" --quiet

echo [1/2] Starting Rust backend...
set "BACKEND_DIR=%~dp0..\app\backend_rust"
for %%I in ("%BACKEND_DIR%") do set "BACKEND_DIR=%%~fI"
start "SuperCrypto Rust Backend" /D "%BACKEND_DIR%" cmd.exe /d /k "set DATABASE_URL=sqlite:E:/cryptoplatform-data/app.sqlite&& cargo run --bin backend || (echo BACKEND BUILD FAILED - check errors above & pause)"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Next.js frontend...
set "FRONTEND_DIR=%~dp0..\app\frontend\nextjs"
for %%I in ("%FRONTEND_DIR%") do set "FRONTEND_DIR=%%~fI"
REM Ensure node/pnpm are on PATH (VS Code terminal may not include them)
REM Dynamically add common Node.js / pnpm install locations
if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%APPDATA%\npm" set "PATH=%APPDATA%\npm;%PATH%"
if exist "%FRONTEND_DIR%\pnpm-lock.yaml" (
    where pnpm >nul 2>&1
    if errorlevel 1 (
        start "SuperCrypto Next.js Frontend" /D "%FRONTEND_DIR%" cmd.exe /d /c "npm run dev"
    ) else (
        start "SuperCrypto Next.js Frontend" /D "%FRONTEND_DIR%" cmd.exe /d /c "pnpm dev"
    )
) else (
    start "SuperCrypto Next.js Frontend" /D "%FRONTEND_DIR%" cmd.exe /d /c "npm run dev"
)

echo.
echo Services are starting:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000/api/v1
echo   Health:   http://localhost:8000/health

endlocal
exit /b 0
