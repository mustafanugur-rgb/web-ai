@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [1/3] Sanal ortam olusturuluyor...

where py >nul 2>&1
if %errorlevel%==0 (
  echo    py -3 -m venv .venv kullaniliyor...
  py -3 -m venv .venv
  if %errorlevel%==0 goto install
)

where python >nul 2>&1
if %errorlevel%==0 (
  echo    python -m venv .venv kullaniliyor...
  python -m venv .venv
  if %errorlevel%==0 goto install
)

echo.
echo Python bulunamadi.
echo   - Windows icin: https://www.python.org/downloads/  Indirin, kurarken "Add python.exe to PATH" secin.
echo   - Veya Microsoft Store'dan "Python 3.12" yukleyin.
echo   - Kurulumdan sonra bu pencereyi kapatip YONETICI olarak yeni CMD acin ve tekrar calistirin.
echo.
pause
exit /b 1

:install
echo [2/3] pip ve paketler yukleniyor...
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
  echo pip hatasi.
  pause
  exit /b 1
)

echo [3/3] Tamam.
if not exist .env (
  copy /Y .env.example .env >nul
  echo .env olusturuldu (.env.example kopyasi). OPENAI_API_KEY ekleyin.
) else (
  echo .env zaten var.
)
echo.
echo Sonraki adim: .env dosyasini acip OPENAI_API_KEY yazin.
echo Calistirma: cd ..\..  sonra  npm run sales-agent  veya  npm run start:all
echo.
pause
