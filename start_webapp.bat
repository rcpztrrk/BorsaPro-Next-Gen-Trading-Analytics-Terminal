@echo off
echo Baslatiliyor...

:: Backend Baslat (Yeni Pencerede)
start "Borsa Backend" cmd /k "cd backend && uvicorn main:app --reload"

:: Frontend Baslat (Yeni Pencerede - Guvenlik Politikasi Bypass ile)
start "Borsa Frontend" cmd /k "cd frontend && powershell -ExecutionPolicy Bypass -Command npm run dev"

echo Sistem baslatildi! Tarayicinizdan http://localhost:5173 adresine gidin.
pause
