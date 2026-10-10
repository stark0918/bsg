@echo off
rem Double-click to rebuild the single-file game from src/.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build.ps1"
echo.
pause
