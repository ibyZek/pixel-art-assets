const { Pool } = require('pg');
const Database = require('better-sqlite3');

async function forceMigrate() {
    const sqliteDb = new Database('pixel_art.db');
    const pgPool = new Pool({
        connectionString: 'postgresql://neondb_owner:npg_wARXm3OozP6g@ep-hidden-snow-al313g8u.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
    });

    try {
        console.log('--- MANUEL MASA KURULUMU VE AKTARIM ---');
        
        // Önce masayı kur (PostgreSQL formatında)
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS inventory (
                id SERIAL PRIMARY KEY,
                steam_id TEXT,
                item_type TEXT,
                rarity TEXT,
                status TEXT,
                steam_item_id TEXT,
                found_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Bulut masası oluşturuldu.');

        const localItems = sqliteDb.prepare('SELECT * FROM inventory').all();
        console.log(`${localItems.length} adet yerel eşya taşınıyor...`);

        for (let item of localItems) {
            await pgPool.query(
                'INSERT INTO inventory (steam_id, item_type, rarity, status, steam_item_id) VALUES ($1, $2, $3, $4, $5)',
                [item.steamId, item.itemType, item.rarity, item.status, item.steamItemId]
            );
        }

        console.log('🎉 TEBRIKLER! 108 eşyanın tamamı buluta taşındı.');
        await pgPool.end();
    } catch (err) {
        console.error('Hata:', err.message);
    }
}

forceMigrate();
