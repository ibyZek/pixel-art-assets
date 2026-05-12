# 🤖 Pixelverse Master Program (Autoresearch v1.0)

Bu dosya, Antigravity AI ajanının Pixelverse projesi üzerindeki otonom yetkilerini ve ana hedeflerini tanımlar.

## 🎯 Ana Misyon
Pixelverse'ü teknik olarak kusursuz, ekonomik olarak dengeli ve oyuncu için bağımlılık yapıcı bir "yaşayan ekosistem" haline getirmek.

## 🛠️ Otonom Görev Döngüsü (Her Oturumda)
1. **Sürekli Denetim (Audit):** `server.js` ve veritabanı şemasını otonom olarak tara. Hardcoded değerleri, performans darboğazlarını veya mantık hatalarını bul.
2. **Hipotez Üretimi:** Oyuncu deneyimini artıracak bir "İyileştirme Hipotezi" ortaya koy (Örn: "Daha hızlı boyama şansı vs.").
3. **Simülasyon:** Değişikliği koda işlemeden önce `scratch/` klasöründe simüle et ve verimliliği kanıtla.
4. **Otonom Uygulama:** Başarılı simülasyon sonuçlarını ana koda aktar.
5. **Dökümantasyon:** Yapılan her şeyi `Wiki/AUTORESEARCH.md` içine "Deney Sonucu" olarak işle.

## 📊 Başarı Kriterleri (KPIs)
- **Teknik Kararlılık:** Sunucu hataları (crash) %0 olmalı.
- **Ekonomik Adalet:** Pity System sayesinde "şanssızlık serisi" 150 pikseli geçmemeli.
- **Performans:** Canvas snapshot süresi 2 saniyenin altında kalmalı.

## 🚫 Kısıtlamalar
- Steam API Key asla kodun içinde açıkça (hardcoded) tutulamaz.
- Kullanıcı onayı olmadan `pixel_art.db` veritabanı tamamen silinemez.
