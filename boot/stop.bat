@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "QUIET=0"
if /i "%~1"=="--quiet" set "QUIET=1"

if "%QUIET%"=="0" echo Stopping SuperCrypto services...

REM Stop the titled windows created by restart.bat, including their children.
call :kill_window "SuperCrypto Rust Backend"
call :kill_window "SuperCrypto Next.js Frontend"

REM Force kill any remaining backend / build processes related to this project.
taskkill /F /IM backend.exe >nul 2>&1
taskkill /F /IM cargo.exe >nul 2>&1
for /f "tokens=2" %%P in ('tasklist /FI "IMAGENAME eq rustc.exe" /NH 2^>nul') do taskkill /F /T /PID %%P >nul 2>&1
for /f "tokens=2" %%P in ('tasklist /FI "IMAGENAME eq rust-analyzer.exe" /NH 2^>nul') do taskkill /F /T /PID %%P >nul 2>&1

REM Give the OS a moment to actually release handles and windows.
timeout /t 2 /nobreak >nul 2>&1

REM Kill processes listening on the application ports (safer than killing all node.exe)
call :kill_port 8000
call :kill_port 3000

REM Wait for ports to actually be released by the OS before returning.
call :wait_port_free 8000
call :wait_port_free 3000

REM Remove a stale Next.js development lock after the process has stopped.
set "FRONTEND_DIR=%~dp0..\app\frontend\nextjs"
for %%I in ("%FRONTEND_DIR%") do set "FRONTEND_DIR=%%~fI"
if exist "%FRONTEND_DIR%\.next\dev\lock" del /f /q "%FRONTEND_DIR%\.next\dev\lock" >nul 2>&1

if "%QUIET%"=="0" echo SuperCrypto services stopped.
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

:wait_port_free
REM Waits up to ~15 seconds for port %~1 to be released.
set "_port=%~1"
set "_tries=30"
:wait_loop
netstat -ano | findstr /R /C:":%_port% .*LISTENING" >nul 2>&1
if errorlevel 1 (
    REM Port is free
    exit /b 0
)
set /a "_tries-=1"
if %_tries% leq 0 (
    if "%QUIET%"=="0" echo WARNING: Port %_port% still in use after 15s, proceeding anyway.
    exit /b 1
)
timeout /t 1 /nobreak >nul 2>&1
goto :wait_loop
