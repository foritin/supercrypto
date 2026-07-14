@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "QUIET=0"
if /i "%~1"=="--quiet" set "QUIET=1"

if "%QUIET%"=="0" echo Stopping SuperCrypto services (Python)...

REM Stop the titled windows created by restart_py.bat, including their children.
call :kill_window "SuperCrypto Python Backend"
call :kill_window "SuperCrypto Next.js Frontend (Py)"

REM Stop only the known service processes listening on the Python ports.
call :kill_port 8001
call :kill_port 3001

REM Remove a stale Next.js development lock after the process has stopped.
set "FRONTEND_DIR=%~dp0..\app\frontend\nextjs"
for %%I in ("%FRONTEND_DIR%") do set "FRONTEND_DIR=%%~fI"
if exist "%FRONTEND_DIR%\.next\dev\lock" del /f /q "%FRONTEND_DIR%\.next\dev\lock" >nul 2>&1

if "%QUIET%"=="0" echo SuperCrypto services (Python) stopped.
endlocal
exit /b 0

:kill_window
taskkill /F /T /FI "WINDOWTITLE eq %~1" >nul 2>&1
exit /b 0

:kill_port
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%~1 .*LISTENING"') do (
    taskkill /F /T /PID %%P >nul 2>&1
)
exit /b 0
