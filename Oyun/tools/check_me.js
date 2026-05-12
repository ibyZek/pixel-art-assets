const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_wARXm3OozP6g@ep-hidden-snow-al313g8u.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function findMe() {
    try {
        const steamId = '76561198093728421';
        console.log(`--- ${steamId} ICIN ENVANTER SORGUSU ---`);
        const res = await pool.query('SELECT * FROM inventory WHERE steam_id = $1', [steamId]);
        console.log(`Bulunan Eşya: ${res.rowCount}`);
        if (res.rowCount > 0) {
            console.log('Örnek Eşya:', res.rows[0]);
        }
        await pool.end();
    } catch (err) {
        console.error('Sorgu Hatası:', err.message);
    }
}

findMe();
