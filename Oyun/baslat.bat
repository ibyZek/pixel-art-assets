@echo off
echo Pixel Art Botu Baslatiliyor...
if not exist node_modules (
    echo Kutuphaneler eksik, yukleniyor...
    npm install
)
node server.js
pause
