const axios = require('axios');
const STEAM_WEB_API_KEY = '4154A602B124D0D9315420B9C533CBFA';
const STEAM_ID = '76561198093728421';
const APP_ID = '4704280';

async function testSteam() {
    console.log('--- STEAM ENVANTER TESTI BASLIYOR ---');
    // Denenecek iki farklı adres var, ikisini de test edelim
    const urls = [
        `https://api.steampowered.com/IInventoryService/GetInventory/v1/?key=${STEAM_WEB_API_KEY}&appid=${APP_ID}&steamid=${STEAM_ID}`,
        `https://partner.steam-api.com/IInventoryService/GetInventory/v1/?key=${STEAM_WEB_API_KEY}&appid=${APP_ID}&steamid=${STEAM_ID}`
    ];

    for (let url of urls) {
        try {
            console.log(`\nDeniniyor: ${url.replace(STEAM_WEB_API_KEY, 'REDACTED')}`);
            const res = await axios.get(url);
            console.log('Sonuç:', JSON.stringify(res.data).substring(0, 500) + '...');
            if (res.data.response && res.data.response.item_json) {
                console.log('✅ BASARILI! Veri geldi.');
            } else {
                console.log('⚠️ Veri geldi ama envanter BOS (veya item_json yok).');
            }
        } catch (err) {
            console.log(`❌ HATA (${url.includes('partner') ? 'Partner' : 'Public'}):`, err.message);
        }
    }
}

testSteam();
