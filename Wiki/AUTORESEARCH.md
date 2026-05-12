# 🧪 Pixelverse Otonom Araştırma Protokolü

Bu dosya, Antigravity'nin (AI) Pixelverse projesini otonom olarak nasıl geliştireceğini ve hangi deneyleri yapacağını tanımlar.

## ✅ Tamamlanan Araştırmalar
- **Döngü #1: Merkezi Denge Sistemi.** Tüm oranlar `GAME_BALANCE` objesinde toplandı ve kod otonom müdahaleye hazır hale getirildi.

- **Döngü #2: Dinamik Zorluk.** Oyuncu sayısına göre HP ölçeklendirmesi başarıyla eklendi.

- **Döngü #4: Performans.** Snapshot sistemi asenkron batch rendering ile optimize edildi.

## 🎯 Mevcut Araştırma Hedefi: Otonom Enflasyon Kontrolü (Döngü #5)
**Problem:** Piyasada çok fazla nadir eşya birikmesi, eşyaların değerini düşürür ve oyun sonu (end-game) içeriğini tüketir.

## 🛠️ Metodoloji (Döngüsel İlerleme)
1.  **Gözlem:** Toplam envanterdeki nadir eşya sayısını (`SELECT COUNT(*) FROM inventory`) periyodik olarak kontrol et.
2.  **Hipotez:** "Global Şans = Temel Şans * (Threshold / Mevcut Eşya Sayısı)".
3.  **Uygulama:** `handlePaint` içine enflasyon katsayısı (Inflation Multiplier) ekle.
4.  **Analiz:** Nadir eşya artış hızının stabil bir eğride kaldığını doğrula.
5.  **Doğrulama:** `Proje_Durumu.md` üzerinde sonuçları raporla.

## 📊 Başarı Metrikleri
- **BPB (Balance Per Bug):** Öldürülen böcek başına kazanılan değerli eşya oranı.
- **LSR (Loot Stability Ratio):** Nadir ve yaygın eşyalar arasındaki dağılım dengesi.
- **Kod Temizliği:** Hardcoded değerlerin `config` yapısına taşınma oranı.

---
*Bu araştırma Karpathy'nin autoresearch disipliniyle yürütülmektedir.*
