@echo off
setlocal
title Kintana Taller - servidor
cd /d "%~dp0server"
set PB_VER=0.40.5
set PB_SHA=d0980d1f3a8097ff4c03a876e8c98f3008a83c0d42cc03b636bc92b2d4788d1c

if not exist pocketbase.exe (
  echo Descargando PocketBase %PB_VER% desde GitHub...
  curl -fL -o pb.zip https://github.com/pocketbase/pocketbase/releases/download/v%PB_VER%/pocketbase_%PB_VER%_windows_amd64.zip || goto fallo
  certutil -hashfile pb.zip SHA256 | findstr /i "%PB_SHA%" >nul || goto fallo
  tar -xf pb.zip pocketbase.exe || goto fallo
  del pb.zip
)

if not exist pb_data\data.db (
  echo Primera vez: creando la base de datos y los usuarios demo...
  .\pocketbase.exe migrate up || goto fallo
  .\pocketbase.exe seed || goto fallo
  echo Usuarios y claves demo en server\accesos-demo.json
)

echo.
echo  Kintana Taller
echo  En este PC:            http://127.0.0.1:8090
echo  Celulares en el wifi:  http://IP-DE-ESTE-PC:8090   (ver con ipconfig)
echo  Panel tecnico:         http://127.0.0.1:8090/_/
echo.
echo  No cierres esta ventana mientras se use la app.
echo.
start "" http://127.0.0.1:8090
.\pocketbase.exe serve --http=0.0.0.0:8090
goto :eof

:fallo
echo.
echo  No se pudo preparar el servidor. Revisa la conexion a internet y vuelve a intentar.
if exist pb.zip del pb.zip
pause
