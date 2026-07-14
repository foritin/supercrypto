@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo  Starting SuperCrypto services (Python)
echo ========================================

REM Stop old Python backend/frontend instances before starting new ones.
call "%~dp0stop_py.bat" --quiet >nul 2>&1

echo [1/2] Starting Python backend (port 8001)...
set "BACKEND_DIR=%~dp0..\app\backend"
for %%I in ("%BACKEND_DIR%") do set "BACKEND_DIR=%%~fI"
set "POLY_CONFIG=config.dev.yaml"
start "SuperCrypto Python Backend" /D "%BACKEND_DIR%" cmd.exe /d /c "set POLY_CONFIG=config.dev.yaml&& .venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Next.js frontend (port 3001)...
set "FRONTEND_DIR=%~dp0..\app\frontend\nextjs"
for %%I in ("%FRONTEND_DIR%") do set "FRONTEND_DIR=%%~fI"
if exist "%FRONTEND_DIR%\pnpm-lock.yaml" (
    where pnpm >nul 2>&1
    if errorlevel 1 (
        start "SuperCrypto Next.js Frontend (Py)" /D "%FRONTEND_DIR%" cmd.exe /d /c "set PORT=3001&& set NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1&& set NEXT_PUBLIC_WS_URL=ws://localhost:8001/ws&& npm run dev"
    ) else (
        start "SuperCrypto Next.js Frontend (Py)" /D "%FRONTEND_DIR%" cmd.exe /d /c "set PORT=3001&& set NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1&& set NEXT_PUBLIC_WS_URL=ws://localhost:8001/ws&& pnpm dev"
    )
) else (
    start "SuperCrypto Next.js Frontend (Py)" /D "%FRONTEND_DIR%" cmd.exe /d /c "set PORT=3001&& set NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1&& set NEXT_PUBLIC_WS_URL=ws://localhost:8001/ws&& npm run dev"
)

echo.
echo Services are starting:
echo   Frontend: http://localhost:3001
echo   Backend:  http://localhost:8001/api/v1
echo   Health:   http://localhost:8001/health
echo   Docs:     http://localhost:8001/docs

endlocal
exit /b 0
