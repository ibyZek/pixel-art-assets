const { Pool } = require('pg');
const Database = require('better-sqlite3');

async function migrate() {
    const sqliteDb = new Database('pixel_art.db');
    const pgPool = new Pool({
        connectionString: 'postgresql://neondb_owner:npg_wARXm3OozP6g@ep-hidden-snow-al313g8u.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
    });

    try {
        console.log('--- AKTARIM BASLIYOR (SQLite -> Neon) ---');
        
        // Yerel envanteri oku
        const localItems = sqliteDb.prepare('SELECT * FROM inventory').all();
        console.log(`${localItems.length} adet yerel eşya bulundu.`);

        for (let item of localItems) {
            await pgPool.query(
                'INSERT INTO inventory (steam_id, item_type, rarity, status, steam_item_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
                [item.steamId, item.itemType, item.rarity, item.status, item.steamItemId]
            );
        }

        console.log('✅ Aktarım başarıyla tamamlandı!');
        await pgPool.end();
    } catch (err) {
        console.error('Aktarım Hatası:', err.message);
    }
}

migrate();
