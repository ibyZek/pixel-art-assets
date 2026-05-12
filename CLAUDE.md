# CLAUDE.md

Bu dosya, Pixelverse projesi üzerinde çalışırken AI asistanına (Claude, Antigravity vb.) rehberlik eder.

## 🎯 Temel Kurallar
1. **İletişim**: Her zaman **Türkçe** konuşulacak.
2. **Kaynak kodu**: `Oyun/` dizininde yaşar (server.js, main.js, script.js, index.html, style.css).
3. **Wiki**: `Wiki/` dizininde Obsidian formatında Türkçe dokümanlar.
4. **Git**: Her önemli değişiklikten sonra `git add . && git commit && git push`.

---

## 📁 Proje Yapısı

```
pixelverse-online-main/
├── Oyun/                ← ASIL OYUN KODU
│   ├── main.js          ← Electron ana süreç + Steam SDK
│   ├── server.js        ← Express + Socket.io backend (1018 satır)
│   ├── script.js        ← Frontend mantığı + Canvas
│   ├── index.html       ← UI şablonu
│   ├── style.css        ← Stillendirme
│   ├── utils.js         ← RARITY_CONFIG, GRID_DIMENSIONS
│   ├── steam_item_defs.json ← 38 Steam eşya tanımı
│   └── package.json     ← Bağımlılıklar
├── Wiki/                ← Obsidian Wiki dokümanları
│   ├── 00_Dashboard.md  ← Kontrol paneli
│   ├── Giris.md         ← Ana sayfa
│   ├── Mimari.md        ← 3 katmanlı mimari
│   ├── Veritabani.md    ← SQLite/PG şeması
│   ├── Steam_Entegrasyonu.md
│   ├── Esya_Sistemi.md
│   ├── Ganimmet_ve_Bocek_Sistemi.md
│   ├── API_Referansi.md
│   ├── Gelistirme_Rehberi.md
│   ├── Proje_Durumu.md
│   └── 01_Gorevler/Kanban.md
├── 01_Projects/         ← PARA: Aktif projeler
├── 06_Metadata/         ← Şablonlar ve referanslar
└── CLAUDE.md            ← Bu dosya
```

---

## 🏗️ Mimari Özet

**Üç katmanlı mimari:**
- **Electron Main** (`Oyun/main.js`): Steam SDK, Envanter, Workshop, Cloud, Rich Presence.
- **Node.js Backend** (`Oyun/server.js`): Express, Socket.io, SQLite/PG bridge, böcek sistemi, ganimet.
- **Frontend** (`Oyun/script.js`): Canvas rendering, palet, UI, bildirimler, leaderboard.

**Dual-Database:**
- `DATABASE_URL` yoksa → SQLite (`pixel_art.db`)
- `DATABASE_URL` varsa → PostgreSQL (Render)

---

## 📊 Güncel Durum (12 Mayıs 2026)

### ✅ Çalışan Sistemler
- Gerçek zamanlı piksel boyama + 10s kilit
- Böcek sistemi (3 tür: normal/dev/ciddi) + ağırlıklı kura
- Bug Leaderboard (skor tablosu)
- Haftalık sınırlı ganimet (6 nadirlik seviyesi)
- 35 renk + kilit/anahtar mekanikleri
- Genişleme bölgesi + anahtar ile kalıcı açma
- Steam Envanter (AddItem/ConsumeItem/ModifyItems)
- Steam Workshop + Cloud + Rich Presence
- Sohbet, aktivite akışı, minimap
- Nadir renk efektleri (shimmer/blink)

### ⚠️ Bilinen Sorunlar
- `hp = 1` test modu aktif (`server.js:593`)
- Ciddi böcek renk havuzu sınırlı (`server.js:535` — sadece `[1001, 1002]`)
- Steam API key hardcoded fallback var

### 🚀 Sıradaki
- [ ] Spotify entegrasyonu
- [ ] Steam Başarımları
- [ ] Böcek HP test modunu kapat
- [ ] Ciddi böcek renk havuzunu genişlet

---

## 🔧 Geliştirme Komutları

```bash
# Electron uygulamasını başlat
cd Oyun && npm run app

# macOS tek tıkla başlat
./Oyun/Pixelverse.command

# Sadece sunucu
cd Oyun && npm start

# GitHub'a gönder
git add . && git commit -m "feat: açıklama" && git push origin main
```

---

## 🔑 Önemli Sabitler

| Sabit | Değer | Konum |
|-------|-------|-------|
| `APP_ID` | `4704280` | main.js, server.js |
| `REMOTE_SERVER_URL` | `https://pixelverse-online.onrender.com` | main.js:27 |
| `STEAM_WEB_API_KEY` | `process.env` veya fallback | server.js:29 |
| `GRID_DIMENSIONS` | `{WIDTH: 1200, HEIGHT: 800}` | utils.js |

## 🗄️ Veritabanı Tabloları (9 adet)

`pixels` · `inventory` · `pixel_history` · `loot_history` · `unlocked_areas` · `user_colors` · `weekly_stats` · `snapshot_history` · `bug_leaderboard`
