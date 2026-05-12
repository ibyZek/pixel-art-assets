# 🔌 API Referansı

[[Giris|← Ana Sayfa]]

Tüm REST endpoint'leri ve Socket.io olayları.

---

## REST API Endpoint'leri

### Envanter

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/inventory/:userId` | Kullanıcının tüm envanterini getir |
| `POST` | `/api/inventory/open` | Sealed eşyayı aç (`sealed → opened`) |
| `POST` | `/api/inventory/spend` | Eşyayı harca (kilit/anahtar kullan) |
| `POST` | `/api/inventory/activate-color` | Rengi pakete kalıcı ekle |
| `POST` | `/api/inventory/add-unlocked` | Steam'den açılmış eşya ekle |

**`/api/inventory/open` gövdesi:**
```json
{ "itemId": 42, "steamId": "76561197960287930" }
```

**`/api/inventory/spend` gövdesi:**
```json
{
  "itemId": 42,
  "steamId": "76561197960287930",
  "coords": [{ "x": 960, "y": 540 }]
}
```

---

### Steam Proxy Endpoint'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/api/steam/add-item` | Steam'e eşya ver (AddItem) |
| `POST` | `/api/steam/consume-item` | Steam'den eşya tüket |
| `POST` | `/api/steam/modify-item` | Eşya metadata güncelle |
| `GET` | `/api/steam/get-inventory/:steamId` | Steam envanterini getir |

---

### Genel API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/snapshots` | Anlık görüntü listesi |
| `GET` | `/api/history/:xmin/:ymin/:xmax/:ymax` | Time-Lapse piksel geçmişi |
| `GET` | `/api/week-info` | Sonraki haftalık sıfırlama zamanı |

---

## Socket.io Olayları

### Bağlantı Kurulduğunda (Server → Client)

```js
socket.emit('init_data', { 
    pixels: {},        // Tüm piksel durumu
    activeBugs: [],    // Aktif böcekler
    unlocked: [],      // Açık bloklar [{x_block, y_block}]
    unlockedColors: [] // Açık renk kodları ['#RRGGBB', ...]
});

socket.emit('init_chat', chatHistory); // Son 50 mesaj
```

**Bağlantı URL parametresi:**
```
socket.io?steamId=76561197960287930
```

---

### Piksel İşlemleri

| Olay | Yön | Veri | Açıklama |
|------|-----|------|----------|
| `paint` | Client → Server | `{x, y, color, steamId, userName}` | Piksel boya |
| `update` | Server → All | `{x, y, color, user, lockExpires}` | Piksel güncellendi |
| `error` | Server → Client | `{success: false, msg}` | Boyama reddedildi |

---

### Ganimet Olayları

| Olay | Yön | Veri | Açıklama |
|------|-----|------|----------|
| `loot_found` | Server → Client | `{rarity, steamDefinitionId, x, y, msg}` | Ganimet bulundu |
| `loot_announcement` | Server → All | `{userName, rarity, msg}` | Global duyuru |

---

### Böcek Olayları

| Olay | Yön | Veri | Açıklama |
|------|-----|------|----------|
| `bug_spawned` | Server → All | `{x, y, type, maxHp, hp, msg}` | Böcek doğdu |
| `bug_click` | Client → Server | `{steamId, userName, x, y}` | Böceğe tıkla |
| `bug_hit` | Server → All | `{x, y, hp, lastHitter}` | Böcek vuruldu |
| `bug_killed` | Server → All | `{winnerId, winnerName, rarity, defId, msg}` | Böcek öldürüldü |

---

### Diğer Olaylar

| Olay | Yön | Veri | Açıklama |
|------|-----|------|----------|
| `chat_message` | Client → Server | `{text, userName, steamId, avatar}` | Sohbet mesajı gönder |
| `new_chat_message` | Server → All | `{id, text, userName, steamId, avatar, timestamp}` | Yeni mesaj |
| `unlock_color` | Client → Server | `{steamId, colorCode}` | Rengi kalıcı kaydet |
| `share_reference` | Client → Server | `{imageData, x, y, scale, opacity, userName}` | Referans görsel paylaş |
| `reference_shared` | Server → All | `{...refData, timestamp}` | Referans yayınlandı |
| `area_unlocked` | Server → All | `{steamId, coords}` | Bölge anahtar ile açıldı |
| `area_lock` | Server → All | `{coords, size, expires, lockedBy}` | Bölge kilitlendi |
