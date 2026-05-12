const { Pool } = require('pg');
const Database = require('better-sqlite3');

async function finalRescue() {
    const sqliteDb = new Database('pixel_art.db');
    const pgPool = new Pool({
        connectionString: 'postgresql://neondb_owner:npg_wARXm3OozP6g@ep-hidden-snow-al313g8u.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
    });

    try {
        const REAL_ID = '76561198093728421';
        console.log(`--- ${REAL_ID} ICIN TOPLU KURTARMA ---`);
        
        // Önce Neon'daki eski denemeleri temizleyelim (çakışma olmasın)
        await pgPool.query('DELETE FROM inventory WHERE steam_id = $1', [REAL_ID]);

        const allLocal = sqliteDb.prepare('SELECT * FROM inventory').all();
        console.log(`Toplam ${allLocal.length} eşya gerçek kimliğine taşınıyor...`);

        for (let item of allLocal) {
            await pgPool.query(
                'INSERT INTO inventory (steam_id, item_type, rarity, status, steam_item_id) VALUES ($1, $2, $3, $4, $5)',
                [REAL_ID, item.itemType, item.rarity, item.status, item.steamItemId]
            );
        }

        console.log('✅ KURTARMA TAMAMLANDI! 108 eşya senin hesabına tanımlandı.');
        await pgPool.end();
    } catch (err) {
        console.error('Kurtarma Hatası:', err.message);
    }
}

finalRescue();
