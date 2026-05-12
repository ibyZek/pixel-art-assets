# 🎮 Steam Entegrasyonu

[[Giris|← Ana Sayfa]]

Pixelverse, Steam platformuyla dört farklı katmanda entegre çalışır.

---

## 1. Kimlik Doğrulama & Rich Presence

`main.js` → `steamworks.js` (yerel SDK)

```js
// Steam başlatma
steamClient = steamworks.init(4704280);

// Kullanıcı bilgilerini al
steamUser.name = steamClient.localplayer.getName();
steamUser.id   = steamClient.localplayer.getSteamId().steamId64.toString();

// Rich Presence güncelle
steamClient.localplayer.setRichPresence('status', "Tualde Keşif Yapıyor");
```

**Avatar Çekme:**  
Steam XML API üzerinden (`steamcommunity.com/profiles/{id}/?xml=1`) avatar URL'si ayrıştırılır ve `steamUser.avatar`'a atanır.

---

## 2. Steam Envanter Servisi

Tüm Steam API çağrıları `server.js` üzerinden **proxy** olarak yapılır.

### Steam Partner API URL'si
```
https://partner.steam-api.com/{service}/{method}/{version}/
```

### Eşya Düşürme (AddItem)
```
POST /api/steam/add-item
Body: { steamId, itemDefId }
→ IInventoryService/AddItem/v1
```

### Eşya Tüketme (ConsumeItem)
```
POST /api/steam/consume-item  
Body: { steamId, itemId }
→ IInventoryService/ConsumeItem/v1
```

### Metadata Güncelleme (ModifyItems)
```
POST /api/steam/modify-item
Body: { steamId, itemId, properties }
→ IInventoryService/ModifyItems/v1
```
Örnek metadata:
```json
{
  "discovery_location": "X: 120, Y: 45",
  "discovery_time": "11.05.2026",
  "found_by": "ibyZek"
}
```

### Envanter Listeleme (GetInventory)
```
GET /api/steam/get-inventory/:steamId
→ IInventoryService/GetInventory/v1
```

### API Sabitleri
```js
const STEAM_WEB_API_KEY = '4B8CB3F7978F66CF39BD57FB05E15315';
const APP_ID = 4704280;
```

---

## 3. Steam Cloud

Oyuncu ayarları Steam Cloud'a kaydedilir.

```js
// Kaydetme (main.js)
steamClient.cloud.writeFile('settings.json', JSON.stringify(settings));

// Yükleme (main.js)
const data = steamClient.cloud.readFile('settings.json');
```

IPC üzerinden Frontend tetikler:
- `ipcRenderer.send('save-settings', settings)`
- `ipcRenderer.invoke('load-settings')`

---

## 4. Steam Workshop (Atölye)

Oyuncular tual üzerindeki alanları şablon olarak Atölye'ye yükleyebilir.

### Yükleme Akışı

```
Frontend: "Alanı Seç" → Seçim koordinatları al
    → "JPG Kaydet" → Yerel dosyaya yaz
    → Workshop modal'ından yükle
        → IPC: 'workshop-upload'
            → main.js: steamClient.workshop.createItem(1)
            → 5 saniye bekle (Steam sync)
            → steamClient.workshop.updateItem(itemId, { title, previewPath, contentPath })
```

**Hata Yönetimi:** "busy" hataları için 3 deneme yapılır, her denemede 3 saniye beklenir.

### Abone Olunanları Listeleme
```js
ipcMain.handle('get-workshop-items', async () => {
    return steamClient.workshop.getSubscribedItems();
});
```

---

## 5. Steam Eşya Tanımları (`steam_item_defs.json`)

Toplam **38 eşya** tanımlanmıştır:

### Kilit Eşyaları (Locks)

| DefID | Ad | Süre | Renk |
|-------|----|------|------|
| 100 | Bakır Kilit | 30 dk | `#CD7F32` |
| 200 | Gümüş Kilit | 1 saat | `#C0C0C0` |
| 300 | Altın Kilit | 2 saat | `#FFD700` |
| 310 | Elmas Kilit | 6 saat | `#00FFFF` |
| 320 | Pırlanta Kilit | 12 saat | `#E5E4E2` |

### Anahtar Eşyaları (Keys)

| DefID | Ad | Alan | Renk |
|-------|----|------|------|
| 400 | Bakır Anahtar | 10x10 (1 blok) | `#4AE2FF` |
| 500 | Gümüş Anahtar | 20x20 (4 blok) | `#A34AFF` |
| 600 | Altın Anahtar | 40x40 (16 blok) | `#FF4A4A` |
| 700 | Elmas Anahtar | 60x60 (36 blok) | `#00FFFF` |
| 800 | Pırlanta Anahtar | 80x80 (64 blok) | `#E5E4E2` |

### Renk Eşyaları (Colors)

| Grup | DefID Aralığı | Adet |
|------|--------------|------|
| Standart | 1001–1020 | 20 renk |
| Neon | 1021–1030 | 10 renk |
| Nadir (Rare) | 1031–1035 | 5 renk |

Ayrıca: `2000` — Haftalık Tual Koleksiyonu (özel NFT-benzeri koleksiyon eşyası)

---

## Hata Giderme

| Sorun | Çözüm |
|-------|-------|
| Steam başlatılamadı | Steam istemcisinin çalıştığından emin ol |
| `getAllItems` hatası | Artık Steam Web API kullanılıyor (düzeltildi) |
| Workshop "busy" hatası | Otomatik 3 deneme yapılıyor |
| Envanter çekilmiyor | `REMOTE_SERVER_URL` ayarlı mı kontrol et |
