const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_wARXm3OozP6g@ep-hidden-snow-al313g8u.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkDb() {
    try {
        console.log('--- NEON BULUT VERITABANI KONTROLU ---');
        const res = await pool.query('SELECT * FROM inventory');
        console.log(`Toplam Eşya Sayısı: ${res.rowCount}`);
        if (res.rowCount > 0) {
            console.log('Son 5 Eşya:');
            console.table(res.rows.slice(-5));
        } else {
            console.log('⚠️ Veritabanı şu an tamamen boş!');
        }
        await pool.end();
    } catch (err) {
        console.error('Hata:', err.message);
    }
}

checkDb();
