// RENDER ROOT ENTRY
const path = require('path');

// Asıl sunucunun yolu
const mainServerPath = path.join(__dirname, 'Oyun', 'server.js');

try {
    // Çalışma dizinini Oyun olarak değiştir (Veritabanı erişimi için şart)
    process.chdir(path.join(__dirname, 'Oyun'));
    
    // Asıl sunucuyu başlat
    require(mainServerPath);
    
    console.log("[Render] Ana sunucu başarıyla başlatıldı.");
} catch (error) {
    console.error("[Render] Başlatma Hatası:", error);
    process.exit(1);
}
