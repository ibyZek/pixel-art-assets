#!/bin/bash
echo "Pixel Art Botu Baslatiliyor..."
if [ ! -d "node_modules" ]; then
    echo "Kutuphaneler eksik, yukleniyor..."
    npm install
fi
node server.js
