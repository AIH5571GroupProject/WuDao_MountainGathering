@echo off
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
  echo Run npm ci in this folder before starting the preview.
  pause
  exit /b 1
)
echo Preparing WuDao. Once ready, open http://127.0.0.1:5173/
echo Keep this window open while reviewing.
node "scripts\start-preview.mjs"
if errorlevel 1 pause
