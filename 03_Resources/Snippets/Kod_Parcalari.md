# ⚡ Pixelverse Kod Parçaları (Snippets)

Bu dosyada projemizde sık kullandığımız kritik kod bloklarını bulabilirsin.

## 🦟 Böcek Sistemi (Server-Side)
```javascript
// Yeni Böcek Oluşturma Şablonu
const newBug = {
    x, y,
    type: 'ciddi',
    hp: 250,
    maxHp: 250,
    clickers: {}
};
```

## 🎨 Renk Paleti (CSS/JS)
```javascript
// Nadir Renklerin Hex Kodları
const RARE_COLORS = {
    DIAMOND: '#B9F2FF',
    GOLD: '#FFD700',
    SILVER: '#C0C0C0'
};
```

## 💾 SQLite Sorguları
```sql
-- Liderlik Tablosunu Getir
SELECT userName, killCount 
FROM bug_leaderboard 
ORDER BY killCount DESC 
LIMIT 10;
```

## 🌐 Socket.io Olayları
```javascript
// Boyama Olayı (Client -> Server)
socket.emit('paint', { x, y, color, steamId, userName });
```
