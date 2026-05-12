# 🛠️ Geliştirme Rehberi

[[Giris|← Ana Sayfa]]

---

## Gereksinimler

- **Node.js** v18+
- **npm** v9+
- **Steam İstemcisi** (çalışır durumda olmalı)
- **Electron** v41 (devDependencies'te mevcut)

---

## Kurulum

```bash
# 1. Projeye git
cd /Users/zekeriya/Desktop/pixelverse-online-main/Oyun

# 2. Bağımlılıkları yükle
npm install

# 3. Steam App ID dosyasını kontrol et
cat steam_appid.txt  # → 4704280 yazmalı
```

---

## Çalıştırma

### Electron Uygulaması (Tam Uygulama)
```bash
npm run app
# veya: npx electron .
```

### Sadece Sunucu (Backend test)
```bash
npm start
# → http://localhost:3000 üzerinde Express başlar
```

---

## Ortam Yapılandırması

### Uzak Sunucu vs Yerel Sunucu

`main.js` satır 27'deki `REMOTE_SERVER_URL` değişkeni sunucu seçimini yapar:

```js
// Uzak sunucu (üretim)
const REMOTE_SERVER_URL = "https://pixelverse-online.onrender.com";

// Yerel sunucu için şu şekilde değiştir:
const REMOTE_SERVER_URL = null; // ya da ""
```

- `REMOTE_SERVER_URL` doluysa → Electron doğrudan o URL'e bağlanır
- Boşsa → `node server.js` çocuk süreç olarak başlatılır, localhost:3000 açılır

### Steam API Anahtarı

`server.js` satır 28:
```js
const STEAM_WEB_API_KEY = process.env.STEAM_WEB_API_KEY || '4B8CB3F7978F66CF39BD57FB05E15315';
```

Üretimde environment variable olarak ayarla:
```bash
export STEAM_WEB_API_KEY="senin_anahtarin"
```

---

## Bağımlılıklar

| Paket | Sürüm | Kullanım |
|-------|-------|----------|
| `electron` | ^41.5.0 | Masaüstü uygulama çerçevesi |
| `express` | ^4.18.2 | HTTP sunucusu |
| `socket.io` | ^4.7.2 | Gerçek zamanlı iletişim |
| `better-sqlite3` | ^12.9.0 | SQLite veritabanı |
| `canvas` | ^3.2.3 | Sunucu taraflı PNG oluşturma |
| `steamworks.js` | ^0.4.0 | Steam SDK entegrasyonu |
| `youtube-chat` | ^2.2.0 | YouTube canlı sohbet (planlı) |

---

## GitHub & Deployment

### Yerel Değişiklikleri Yayına Al
```bash
cd /Users/zekeriya/Desktop/pixelverse-online-main/Oyun

git add .
git commit -m "feat: değişiklik açıklaması"
git push origin main
```

**Render** otomatik olarak `main` branch'ini izler ve her push'ta yeniden deploy eder.

### Render Sunucu URL
```
https://pixelverse-online.onrender.com
```

---

## Geliştirme İpuçları

### Test Koordinatları
Ganimet sistemini test etmek için özel koordinatlar:
```
(1,1) → Legendary renk
(2,2) → Diamond
(3,3) → Gold  
(4,4) → Silver
```

### Böcek HP'yi Kalıcı Değiştirmek
`server.js` satır 489:
```js
hp = 1; // DEV TEST: Bunu kaldır üretimde!
```

### Veritabanını Sıfırlamak
```bash
rm pixel_art.db
# Uygulama bir sonraki başlatmada DB'yi otomatik yeniden oluşturur
```

### Loot Geçmişini Sıfırlamak
```bash
echo '[]' > loot_history.json
```

---

## Klasör Çıktıları

| Çıktı | Konum | Açıklama |
|-------|-------|----------|
| Snapshots | `snapshots/pixel-art-YYYY-MM-DD.png` | Haftalık tual görüntüleri |
| Workshop | `temp_workshop_upload/` | Geçici atölye dosyaları |
| DB | `pixel_art.db` | Tüm oyun verisi |
| Loot Log | `loot_history.json` | Yerel düşürme kayıtları |
