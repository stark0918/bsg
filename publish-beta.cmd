@echo off
rem Build the beta game, then copy index.html into the main worktree's beta folder.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish-beta.ps1"
echo.
pause
