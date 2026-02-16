@echo off
setlocal
title Borsa Terminali Kontrol Paneli
echo ==========================================
echo       BORSA TERMINALI BASLATILIYOR
echo ==========================================
cd /d "%~dp0"

echo [1/3] Python kontrol ediliyor...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Python bulunamadi!
    pause
    exit /b
)

echo [2/3] Bağımlılıklar kontrol ediliyor...
pip install -r requirements.txt

echo [3/3] Sistem baslatiliyor...
:: Backend Baslat
start "Borsa Backend" cmd /k "cd backend && uvicorn main:app --reload"

:: Frontend Baslat
start "Borsa Frontend" cmd /k "cd frontend && powershell -ExecutionPolicy Bypass -Command npm run dev"

echo.
echo Sistem baslatildi! Tarayicinizdan http://localhost:5173 adresine gidin.
pause
