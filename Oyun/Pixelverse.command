#!/bin/bash
# Pixelverse Başlatıcı (macOS)
cd "$(dirname "$0")"
clear
echo "------------------------------------------"
echo "🚀 PIXELVERSE BAŞLATILIYOR..."
echo "------------------------------------------"

# Kütüphane kontrolü
if [ ! -d "node_modules" ]; then
    echo "📦 Bağımlılıklar eksik, yükleniyor (biraz vakit alabilir)..."
    npm install
fi

# Uygulamayı başlat
echo "🎮 Oyun açılıyor, iyi eğlenceler!"
npm start
