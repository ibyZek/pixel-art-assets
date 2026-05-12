# 🪲 Ganimet & Böcek Sistemi

[[Giris|← Ana Sayfa]]

---

## Ganimet Sistemi (Boyama Sırasında)

Her piksel boyama işlemi sonrasında olasılık hesaplanır.

### Haftalık Sınırlı Düşürme Oranları

```js
const rarityWeights = [
    { rarity: 'GoldKey',    chance: 0.0001, limit: 1  },   // %0.01
    { rarity: 'SilverKey',  chance: 0.0005, limit: 2  },   // %0.05
    { rarity: 'CopperKey',  chance: 0.002,  limit: 5  },   // %0.2
    { rarity: 'GoldLock',   chance: 0.001,  limit: 3  },   // %0.1
    { rarity: 'SilverLock', chance: 0.005,  limit: 10 },   // %0.5
    { rarity: 'CopperLock', chance: 0.02,   limit: 20 },   // %2
];
```

**Akış:**
1. Her `paint` olayında yukarıdan aşağıya sırayla kontrol edilir
2. İlk eşleşen rarity seçilir (tek seferlik)
3. Haftalık limiti aşmışsa atlanır
4. `inventory` tablosuna `status='sealed'` olarak eklenir
5. `loot_history`'ye kaydedilir (haftalık sayaç için)

### Test Koordinatları

```
(1,1) → Legendary renk (Kraliyet Moru)
(2,2) → Diamond
(3,3) → Gold
(4,4) → Silver
```

---

## Böcek Sistemi

### Böcek Türleri

| Tür | HP | Ödül Tipi | Açıklama |
|-----|----|-----------| ---------|
| `normal` | 50 | **Anahtar** | En kolay, her yerden çıkabilir |
| `dev` | 125 | **Kilit** | Orta zorluk |
| `ciddi` | 250 | **Renk** | En zor, nadir renk düşürür |

> ⚠️ Şu an `hp = 1` (test modu) — satır 593, `server.js`

### Doğurma Oranları

```js
const rand = Math.random() * 100;
if (rand <= 10)       bugType = 'ciddi';  // %10
else if (rand <= 40)  bugType = 'dev';    // %30
else                  bugType = 'normal'; // %60
```

### Maksimum Aktif Böcek

- Başlangıçta 20 böcek doğurulur
- Her saniye kontrol edilir, 20'nin altına düşünce kuyruğa eklenir
- Her eksik böcek için +1 dakika gecikme ile yeni böcek doğar

### Kazanan Belirleme (Ağırlıklı Kura)

Böcek öldüğünde, tıklayan herkes katkısı oranında şans kazanır:

```js
function calculateBugWinner(clickers) {
    const totalClicks = Object.values(clickers).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalClicks;
    for (const pid of Object.keys(clickers)) {
        random -= clickers[pid];
        if (random <= 0) return pid;  // Kazanan!
    }
}
```

### Normal Böcek Ödül Oranları (Anahtar)

| Şans | Ödül | DefID |
|------|------|-------|
| %1 | Pırlanta Anahtar | 800 |
| %4 | Elmas Anahtar | 700 |
| %10 | Altın Anahtar | 600 |
| %25 | Gümüş Anahtar | 500 |
| %60 | Bakır Anahtar | 400 |

### Dev Böcek Ödül Oranları (Kilit)

| Şans | Ödül | DefID |
|------|------|-------|
| %1 | Pırlanta Kilit | 320 |
| %4 | Elmas Kilit | 310 |
| %10 | Altın Kilit | 300 |
| %25 | Gümüş Kilit | 200 |
| %60 | Bakır Kilit | 100 |

### Ciddi Böcek Ödül Oranları (Renk)

| Şans | Renk Havuzu | DefID Aralığı |
|------|------------|--------------|
| %10 | Nadir (Rare) | 1031–1035 |
| %30 | Neon | 1021–1030 |
| %60 | Standart | 1001–1020 |

> **Not:** Mevcut kodda ciddi böcek renk havuzu `[1001, 1002]` ile sınırlı (`server.js:535`). Tüm renk aralığının eklenmesi planlanıyor.

---

## Bug Leaderboard (Skor Tablosu)

Her böcek öldürüldüğünde kazananın `kill_count` değeri `bug_leaderboard` tablosunda artırılır.

```sql
SELECT user_name, kill_count 
FROM bug_leaderboard 
ORDER BY kill_count DESC 
LIMIT 10;
```

Frontend'de leaderboard paneli gerçek zamanlı olarak güncellenir.

---

## Socket.io Olayları (Böcek)

| Olay | Yön | Veri | Açıklama |
|------|-----|------|----------|
| `bug_spawned` | Server → Client | `{x, y, type, maxHp, hp, msg}` | Böcek doğdu |
| `bug_click` | Client → Server | `{steamId, userName, x, y}` | Böceğe tıklandı |
| `bug_hit` | Server → Client | `{x, y, hp, lastHitter}` | Böcek vuruldu (hayatta) |
| `bug_killed` | Server → Client | `{winnerId, winnerName, rarity, defId, msg}` | Böcek öldürüldü |

---

## Haftalık Sıfırlama

Her **Çarşamba 00:00**'da:
- Canvas PNG anlık görüntüsü alınır (`snapshots/` klasörüne)
- Ganimet düşürme sayaçları sıfırlanır (haftalık filtre otomatik çalışır)

```js
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        if (now.getDay() === 3) createSnapshot(); // 3 = Çarşamba
    }
}, 60000);
```
