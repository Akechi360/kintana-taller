@echo off
rem Deja los datos de demostracion como nuevos (borra todo lo que se haya creado).
cd /d "%~dp0server"
.\pocketbase.exe seed reset
echo.
echo  Listo. Usuarios y claves en server\accesos-demo.json
pause
