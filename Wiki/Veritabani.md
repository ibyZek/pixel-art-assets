# 🗄️ Veritabanı

[[Giris|← Ana Sayfa]]

Pixelverse, **SQLite** veritabanını `better-sqlite3` kütüphanesiyle kullanır.  
Dosya: `pixel_art.db` (proje kökünde otomatik oluşturulur)

---

## Tablo Şeması

### `pixels` — Tual Durumu

Her pikselin mevcut rengi, kilidi ve boyama geçmişini tutar.

```sql
CREATE TABLE pixels (
    x            INTEGER,
    y            INTEGER,
    color        TEXT,          -- HEX renk kodu (#RRGGBB)
    lastPaint    DATETIME,      -- Son boyama zamanı
    lockExpires  DATETIME,      -- Kilit bitiş zamanı
    lockedBy     TEXT,          -- Kilitleyen kullanıcının Steam ID'si
    lockedByName TEXT,          -- Kilitleyen kullanıcının adı
    PRIMARY KEY (x, y)
)
```

> **Bellekte önbellek:** Tüm pikseller başlangıçta `canvasState` Map'ine yüklenir.  
> Boyama hem Map'e hem DB'ye yazılır.

---

### `inventory` — Oyun Envanteri

Oyuncuların kazandığı eşyaları (kilit, anahtar, renk) tutar.

```sql
CREATE TABLE inventory (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    steamId     TEXT,      -- Oyuncunun Steam 64-bit ID'si
    itemType    TEXT,      -- 'Key' | 'Lock' | 'Color'
    rarity      TEXT,      -- 'CopperKey', 'Color-1031' vb.
    status      TEXT,      -- 'sealed' | 'opened' | 'activated'
    steamItemId TEXT,      -- Steam Envanter eşya ID'si (opsiyonel)
    foundAt     DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**`status` akışı:**
```
sealed → (Kullanıcı açar) → opened → (Kullanıcı harcar/aktive eder) → [silinir veya activated]
```

**`rarity` örnekleri:**

| rarity değeri | Açıklama |
|--------------|----------|
| `CopperLock` | Bakır Kilit |
| `GoldKey` | Altın Anahtar |
| `Color-1031` | Elmas Parıltısı rengi (defId=1031) |
| `Legendary` | Efsanevi renk (eski format) |

---

### `pixel_history` — Piksel Geçmişi (Time-Lapse)

Her boyama işlemini kaydeder; Time-Lapse için kullanılır.

```sql
CREATE TABLE pixel_history (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    x         INTEGER,
    y         INTEGER,
    color     TEXT,
    userId    TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

### `loot_history` — Ganimet Geçmişi

Haftalık ganimet limitlerini kontrol etmek için kullanılır.

```sql
CREATE TABLE loot_history (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    steamId   TEXT,
    rarity    TEXT,
    itemType  TEXT,
    foundAt   DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Haftalık limit kontrolü (server.js):**
```js
SELECT COUNT(*) as total FROM loot_history 
WHERE steamId = ? AND rarity = ? 
AND foundAt >= date('now', 'weekday 0', '-7 days')
```

---

### `unlocked_areas` — Açık Bölgeler

Anahtarla kalıcı olarak aktif edilen genişleme blokları.

```sql
CREATE TABLE unlocked_areas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    steamId     TEXT,
    x_block     INTEGER,   -- 10'un katı (blok başlangıç X)
    y_block     INTEGER,   -- 10'un katı (blok başlangıç Y)
    unlockedAt  DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

> Ana tual: **960x540** piksel. Bu alanın dışındaki bölgeler başlangıçta kilitlidir.  
> Anahtarla aktif edilen bloklar bu tabloya kaydedilir.

---

### `user_colors` — Kalıcı Renkler

Oyuncunun paletine kalıcı olarak eklenen özel renkler.

```sql
CREATE TABLE user_colors (
    steamId   TEXT,
    colorCode TEXT,   -- HEX renk kodu
    PRIMARY KEY (steamId, colorCode)
)
```

---

### `weekly_stats` — Haftalık Boyama İstatistikleri

```sql
CREATE TABLE weekly_stats (
    steamId    TEXT PRIMARY KEY,
    pixelCount INTEGER DEFAULT 0,
    steamName  TEXT
)
```

---

### `snapshot_history` — Anlık Görüntü Geçmişi

```sql
CREATE TABLE snapshot_history (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    filename           TEXT,
    winnerSteamId      TEXT,
    winnerName         TEXT,
    totalParticipants  INTEGER,
    createdAt          DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

## Migration (Otomatik Geçiş)

`server.js` başlangıçta hataları yutarak eksik kolonları ekler:

```js
try { db.exec("ALTER TABLE inventory ADD COLUMN steamItemId TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE inventory RENAME COLUMN findDate TO foundAt"); } catch(e) {}
try { db.exec("ALTER TABLE pixels ADD COLUMN lockedBy TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE pixels ADD COLUMN lockedByName TEXT"); } catch(e) {}
```

> ⚠️ Yeni kolon eklerken bu pattern'i kullan — mevcut veritabanlarını bozmaz.

---

## Dual-Database Mimarisi (SQLite + PostgreSQL)

Pixelverse, **çift veritabanı** modunda çalışır:

| Mod | Koşul | Kullanım |
|-----|-------|----------|
| **SQLite** (yerel) | `DATABASE_URL` yok | Geliştirme, yerel test |
| **PostgreSQL** (bulut) | `DATABASE_URL` var | Render üretim ortamı |

`server.js` içinde bir **bridge nesnesi** (`db`) her iki motoru da saran senkron bir API sağlar. PostgreSQL modu aktifken bridge, async sorguları yönetir.

```js
// Bridge örneği (server.js)
const db = {
    prepare: (sql) => ({
        get: (...p) => pgPool ? pgPool.query(...) : sqliteDb.prepare(sql).get(...p),
        run: (...p) => pgPool ? pgPool.query(...) : sqliteDb.prepare(sql).run(...p),
        all: (...p) => pgPool ? pgPool.query(...) : sqliteDb.prepare(sql).all(...p),
    })
};
```

> **Not:** PostgreSQL kolon isimleri `snake_case` kullanır (`steam_id`, `found_at`), SQLite ise `camelCase` (`steamId`, `foundAt`).

---

### `bug_leaderboard` — Böcek Öldürme Skor Tablosu

Oyuncuların böcek öldürme istatistiklerini tutar.

```sql
CREATE TABLE IF NOT EXISTS bug_leaderboard (
    steam_id   TEXT PRIMARY KEY,
    user_name  TEXT,
    kill_count INTEGER DEFAULT 0,
    last_kill  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

> Her `bug_killed` olayında kazananın `kill_count` değeri artırılır.

---

## Sık Kullanılan Sorgular

```js
// Kullanıcı envanterini getir
db.prepare('SELECT * FROM inventory WHERE steamId = ? ORDER BY foundAt DESC').all(steamId);

// Haftalık piksel sayısını artır
db.prepare(`INSERT INTO weekly_stats (steamId, pixelCount, steamName) VALUES (?, 1, ?)
    ON CONFLICT(steamId) DO UPDATE SET pixelCount = pixelCount + 1, steamName = ?`
).run(userId, userName, userName);

// Bölgenin açık olup olmadığını kontrol et
db.prepare('SELECT id FROM unlocked_areas WHERE steamId = ? AND x_block = ? AND y_block = ?')
  .get(userId, blockX, blockY);

// Leaderboard'u getir
db.prepare('SELECT user_name, kill_count FROM bug_leaderboard ORDER BY kill_count DESC LIMIT 10').all();
```
