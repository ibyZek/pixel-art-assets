# 🎨 Eşya Sistemi

[[Giris|← Ana Sayfa]]

Pixelverse'deki tüm eşyaların ayrıntılı referansı.

---

## Eşya Kategorileri

```
Eşyalar
├── Kilit (Lock)  → 10x10 alanı belirli süre korur
├── Anahtar (Key) → Genişleme bölgesinde blok kalıcı açar
└── Renk (Color)  → Paleti genişletir
```

---

## Kilit Eşyaları

| DefID | Ad | Süre | HEX |
|-------|----|------|-----|
| 100 | 🟫 Bakır Kilit | 30 dk | `#CD7F32` |
| 200 | ⚪ Gümüş Kilit | 1 saat | `#C0C0C0` |
| 300 | 🟡 Altın Kilit | 2 saat | `#FFD700` |
| 310 | 💎 Elmas Kilit | 6 saat | `#00FFFF` |
| 320 | 🔮 Pırlanta Kilit | 12 saat | `#E5E4E2` |

**Kullanım:** 10x10 piksel blok seçilir → o blok `lockExpires` süresince başkaları tarafından boyanamaaz.

---

## Anahtar Eşyaları

| DefID | Ad | Açılan Alan | HEX |
|-------|----|------------|-----|
| 400 | 🟫 Bakır Anahtar | 10×10 (1 blok) | `#4AE2FF` |
| 500 | ⚪ Gümüş Anahtar | 20×20 (4 blok) | `#A34AFF` |
| 600 | 🟡 Altın Anahtar | 40×40 (16 blok) | `#FF4A4A` |
| 700 | 💎 Elmas Anahtar | 60×60 (36 blok) | `#00FFFF` |
| 800 | 🔮 Pırlanta Anahtar | 80×80 (64 blok) | `#E5E4E2` |

**Kullanım:** `unlocked_areas` tablosuna blok koordinatları kalıcı yazılır.

---

## Renk Eşyaları

### Standart Renkler (DefID 1001–1020)

| DefID | Ad | HEX |
|-------|----|-----|
| 1001 | Kraliyet Moru | `#6A0DAD` |
| 1002 | Zümrüt Yeşili | `#50C878` |
| 1003 | Mercan Kırmızısı | `#FF6B6B` |
| 1004 | Okyanus Mavisi | `#0077B6` |
| 1005 | Gün Batımı | `#FF8C42` |
| 1006 | Lavanta | `#B57EDC` |
| 1007 | Deniz Mavisi | `#008080` |
| 1008 | Gül Pembesi | `#FF007F` |
| 1009 | Zeytin Yeşili | `#6B8E23` |
| 1010 | Gök Mavisi | `#87CEEB` |
| 1011 | Koyu Kırmızı | `#DC143C` |
| 1012 | Orman Yeşili | `#228B22` |
| 1013 | Çivit | `#4B0082` |
| 1014 | Şeftali | `#FFBE98` |
| 1015 | Turkuaz | `#40E0D0` |
| 1016 | Bordo | `#800000` |
| 1017 | Nane Yeşili | `#98FF98` |
| 1018 | Arduvaz Mavisi | `#6A5ACD` |
| 1019 | Kehribar | `#FFBF00` |
| 1020 | Pudra Pembesi | `#DCAE96` |

### Neon Renkler (DefID 1021–1030)

| DefID | Ad | HEX |
|-------|----|-----|
| 1021 | Neon Pink | `#FF6EC7` |
| 1022 | Neon Green | `#39FF14` |
| 1023 | Neon Blue | `#4D4DFF` |
| 1024 | Neon Yellow | `#FFFF33` |
| 1025 | Neon Orange | `#FF6700` |
| 1026 | Neon Purple | `#BC13FE` |
| 1027 | Neon Cyan | `#00FFFF` |
| 1028 | Neon Red | `#FF073A` |
| 1029 | Neon Lime | `#CCFF00` |
| 1030 | Neon Magenta | `#FF00FF` |

### Nadir Renkler (DefID 1031–1035)

| DefID | Ad | HEX |
|-------|----|-----|
| 1031 | Elmas Parıltısı | `#B9F2FF` |
| 1032 | Altın Işıltısı | `#FFD700` |
| 1033 | Gümüş Parıltısı | `#C0C0C0` |
| 1034 | Yakut Kırmızısı | `#E0115F` |
| 1035 | Safir Mavisi | `#0F52BA` |

### Özel Eşya

| DefID | Ad | Açıklama |
|-------|----|----------|
| 2000 | Haftalık Tual Koleksiyonu | NFT-benzeri haftalık canvas snapshot'ı |

---

## Eşya Kullanım Akışı

```
Steam Envanterinde (sealed)
    ↓ Oyuncu "Aç" butonuna basar
    → /api/inventory/open
    ↓ Yerel envanterde (opened)
    
    [Kilit ise]          [Anahtar ise]        [Renk ise]
    ↓ Blok seç           ↓ Blok seç            ↓ "Aktive Et"
    → /api/inventory/spend  → /api/inventory/spend  → /api/inventory/activate-color
    ↓ Silinir            ↓ Silinir             ↓ user_colors'a eklenir
    (pixels kilitlendi)  (unlocked_areas'a     (palette'e eklenir)
                          eklendi)
```

---

## `rarity` Değerleri Referansı

```
Kilit:   CopperLock | SilverLock | GoldLock | DiamondLock | PlatinumLock
Anahtar: CopperKey  | SilverKey  | GoldKey  | DiamondKey  | PlatinumKey
Renk:    Color-{defId}  (örn: Color-1031)
Eski:    Legendary | Diamond | Gold | Silver (eski format, migration edilmedi)
```
