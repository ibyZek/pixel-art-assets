# 🎮 Pixelverse Wiki — Ana Sayfa

> **Pixelverse**, Steam entegrasyonlu, gerçek zamanlı çok oyunculu bir piksel sanat tual uygulamasıdır.  
> *r/place'den ilham alınmıştır.*

---

## ⚡ [🚀 Kontrol Paneline Git (Dashboard)]([[00_Dashboard]])

---

## 📚 Wiki Bölümleri

| Bölüm | Açıklama |
|-------|----------|
| [[Mimari]] | Üç katmanlı sistem mimarisi (Electron + Node.js + Frontend) |
| [[Veritabani]] | SQLite şema detayları ve tablo yapıları |
| [[Steam_Entegrasyonu]] | Steamworks, Envanter, Atölye ve Cloud sistemi |
| [[Esya_Sistemi]] | Kilit, Anahtar ve Renk eşyaları, nadirlik seviyeleri |
| [[Ganimmet_ve_Bocek_Sistemi]] | Böcek olayları, düşürme mantığı, haftalık limitler |
| [[API_Referansi]] | Tüm REST endpoint'leri ve Socket.io olayları |
| [[Gelistirme_Rehberi]] | Kurulum, çalıştırma, ortam yapılandırması |
| [[Proje_Durumu]] | Tamamlananlar, sıradaki adımlar, bilinen sorunlar |

---

## 🚀 Hızlı Başlangıç

```bash
# Ana dizinden (root) uygulamayı başlat
./baslat.sh

# Veya manuel olarak
cd Oyun
npm run app
```

---

## 🏗️ Mimariye Hızlı Bakış

```
Electron (main.js)
    ↕ IPC
Frontend (script.js + index.html)
    ↕ Socket.io / HTTP
Node.js Backend (server.js)
    ↕ better-sqlite3
SQLite (pixel_art.db)
    ↕ Steam Web API
Steam Partner API
```

---

## 🔗 Bağlantılar

- **Uzak Sunucu:** https://pixelverse-online.onrender.com
- **GitHub:** https://github.com/ibyZek/pixel-art-assets
- **Steam App ID:** `4704280`
- **Proje Dizini:** `/Users/zekeriya/Desktop/pixelverse-online-main/Oyun`

---

*Son güncelleme: 12 Mayıs 2026*

