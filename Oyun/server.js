const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { Pool } = require('pg');
const { createCanvas } = require('canvas');
const { 
    RARITY_CONFIG, 
    RARITY_COLORS, 
    getRarityConfig, 
    getRarityColor,
    GRID_DIMENSIONS
} = require('./utils');
const https = require('https');

// --- STEAM CONFIG (SERVER SIDE) ---
const STEAM_WEB_API_KEY = process.env.STEAM_WEB_API_KEY || '4B8CB3F7978F66CF39BD57FB05E15315';
const APP_ID = 4704280;

// Steam API Helper Function
async function callSteamPartnerAPI(service, method, version, params) {
    return new Promise((resolve, reject) => {
        const inputJson = JSON.stringify(params);
        const postData = new URLSearchParams({
            key: STEAM_WEB_API_KEY,
            appid: APP_ID.toString(),
            input_json: inputJson
        }).toString();

        const url = `https://partner.steam-api.com/${service}/${method}/${version}/`;
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ statusCode: res.statusCode, data: json });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, error: 'Parse Error', body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

// --- BUG EVENT STATE ---
let activeBugs = []; // [{ x, y, hp: 25, clickers: { steamId: clicks } }]
const canvasState = new Map();

// --- CHAT STATE ---
let chatHistory = [];
const MAX_CHAT_HISTORY = 50;

// --- VERİTABANI ---
const DATABASE_URL = process.env.DATABASE_URL;
let pgPool;

const sqliteDb = new Database('pixel_art.db');
const db = {
    prepare: (sql) => {
        return {
            get: (...params) => {
                if (pgPool) {
                    console.warn('[Bridge] Sync GET called on Postgres. SQL:', sql);
                    return { total: 0 }; 
                }
                return sqliteDb.prepare(sql).get(...params);
            },
            run: (...params) => {
                if (pgPool) {
                    console.warn('[Bridge] Sync RUN called on Postgres. SQL:', sql);
                    return { changes: 1 }; 
                }
                return sqliteDb.prepare(sql).run(...params);
            },
            all: (...params) => {
                if (pgPool) {
                    console.warn('[Bridge] Sync ALL called on Postgres. SQL:', sql);
                    return [];
                }
                return sqliteDb.prepare(sql).all(...params);
            }
        };
    },
    exec: (sql) => sqliteDb.exec(sql),
    transaction: (fn) => sqliteDb.transaction(fn)
};

// Lokal SQLite Tabloları
db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steamId TEXT,
        itemType TEXT,
        rarity TEXT,
        status TEXT,
        steamItemId TEXT,
        color_code TEXT,
        foundAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS pixels (
        x INTEGER, 
        y INTEGER, 
        color TEXT, 
        lastPaint DATETIME, 
        lockExpires DATETIME, 
        lockedBy TEXT, 
        lockedByName TEXT,
        PRIMARY KEY (x, y)
    );
    CREATE TABLE IF NOT EXISTS pixel_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        x INTEGER,
        y INTEGER,
        color TEXT,
        userId TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS loot_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steamId TEXT,
        rarity TEXT,
        itemType TEXT,
        foundAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS unlocked_areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steamId TEXT,
        x_block INTEGER,
        y_block INTEGER,
        unlockedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(steamId, x_block, y_block)
    );
    CREATE TABLE IF NOT EXISTS user_colors (
        steamId TEXT,
        colorCode TEXT,
        PRIMARY KEY (steamId, colorCode)
    );
`);

if (DATABASE_URL) {
    console.log('🚀 [Database] Bulut (PostgreSQL) modu aktif.');
    pgPool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    initPgTables();
}

async function initPgTables() {
    try {
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS inventory (
                id SERIAL PRIMARY KEY,
                steam_id TEXT,
                item_type TEXT,
                rarity TEXT,
                status TEXT,
                steam_item_id TEXT,
                color_code TEXT,
                found_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS pixels (
                x INTEGER, 
                y INTEGER, 
                color TEXT, 
                last_paint TIMESTAMP, 
                lock_expires TIMESTAMP, 
                locked_by TEXT, 
                locked_by_name TEXT, 
                PRIMARY KEY (x, y)
            );
            CREATE TABLE IF NOT EXISTS user_colors (
                steam_id TEXT,
                color_code TEXT,
                PRIMARY KEY (steam_id, color_code)
            );
            CREATE TABLE IF NOT EXISTS unlocked_areas (
                id SERIAL PRIMARY KEY,
                steam_id TEXT,
                x_block INTEGER,
                y_block INTEGER,
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (steam_id, x_block, y_block)
            );
            CREATE TABLE IF NOT EXISTS pixel_history (
                id SERIAL PRIMARY KEY,
                x INTEGER,
                y INTEGER,
                color TEXT,
                user_id TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS loot_history (
                id SERIAL PRIMARY KEY,
                steam_id TEXT,
                rarity TEXT,
                item_type TEXT,
                found_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('[Cloud-DB] PostgreSQL Tabloları Hazır.');
        
        // Önemli: Başlangıçta pikselleri yükle
        const { rows } = await pgPool.query('SELECT * FROM pixels');
        rows.forEach(row => {
            canvasState.set(`${row.x}-${row.y}`, {
                x: row.x,
                y: row.y,
                color: row.color,
                lastPaint: row.last_paint,
                lockExpires: row.lock_expires,
                lockedBy: row.locked_by,
                lockedByName: row.locked_by_name
            });
        });
        console.log(`[Cloud-DB] ${rows.length} piksel yüklendi.`);
    } catch (err) {
        console.error('[Cloud-DB] Hata:', err);
    }
}

// --- Olasılık Bazlı Ganimet Sistemi Aktif ---

app.use(express.static(path.join(__dirname)));

app.get('/api/snapshots', (req, res) => {
    const dir = path.join(__dirname, 'snapshots');
    fs.mkdirSync(dir, { recursive: true });
    fs.readdir(dir, (err, files) => {
        const snapshots = files.filter(f => f.endsWith('.png')).sort().reverse();
        res.json(snapshots);
    });
});

// --- SORGULAR ---
const getPixelsStmt = db.prepare('SELECT * FROM pixels');
const insertPixelStmt = db.prepare('INSERT OR REPLACE INTO pixels (x, y, color, lastPaint, lockExpires, lockedBy, lockedByName) VALUES (?, ?, ?, ?, ?, ?, ?)');
const insertInventoryStmt = db.prepare('INSERT INTO inventory (steamId, itemType, rarity) VALUES (?, ?, ?)');
const getInventoryStmt = db.prepare('SELECT * FROM inventory WHERE steamId = ? ORDER BY foundAt DESC');

try {
    const rows = getPixelsStmt.all();
    rows.forEach(row => canvasState.set(`${row.x}-${row.y}`, row));
    console.log(`${rows.length} piksel yüklendi.`);
} catch (err) {
    console.error('Veritabanı yükleme hatası:', err);
}

// --- BOYA ---
function handlePaint(data, socket, callback) {
    try {
        const { x, y, color, steamId, userId: dataUserId, userName, isPremium } = data;
        const userId = steamId || dataUserId; 
        console.log(`[Server] Paint request from ${userName} (${userId}) at ${x},${y}`);
        
        if (!userId) {
            console.warn('[Paint] Error: No user identity (steamId/userId) provided');
            return callback?.({ success: false, msg: 'Kimlik doğrulanamadı.' });
        }
        const key = `${x}-${y}`;
        const now = new Date();
        const pixel = canvasState.get(key) || { color: '#111', lastPaint: new Date(0), lockExpires: new Date(0) };

        if (x < 0 || x >= GRID_DIMENSIONS.WIDTH || y < 0 || y >= GRID_DIMENSIONS.HEIGHT) {
            console.log(`[Paint] Out of bounds: ${x},${y}`);
            return;
        }
        
        // --- GENİŞLEME ALANI KONTROLÜ ---
        // 960x540 dışındaki alanlar kilitli başlar.
        const isExpansion = (x >= 960 || y >= 540);
        if (isExpansion) {
            const blockX = Math.floor(x / 10) * 10;
            const blockY = Math.floor(y / 10) * 10;
            const isUnlocked = db.prepare('SELECT id FROM unlocked_areas WHERE steamId = ? AND x_block = ? AND y_block = ?').get(userId, blockX, blockY);
            
            if (!isUnlocked) {
                console.log(`[Paint] Denied: Area [${blockX},${blockY}] is locked for user ${userId}`);
                return callback?.({ success: false, msg: 'Bu bölgeyi boyamak için önce "Anahtar" ile aktif etmelisin!' });
            }
        }
        
        // KİLİT KONTROLÜ: Süre dolmadıysa VE kilitleyen başkasıysa engelle
        if (new Date(pixel.lockExpires) > now && pixel.lockedBy !== userId) {
            console.log(`[Paint] Denied: Locked by ${pixel.lockedBy} until ${pixel.lockExpires}`);
            return callback?.({ success: false, msg: 'Burası başkası tarafından kilitlendi!' });
        }

        pixel.color = color;
        pixel.lastPaint = now;
        let lockExpires = new Date(now.getTime() + 10000); // Her boyama sonrası 10 saniye kilit
        pixel.lockExpires = lockExpires;

        // 1. Pikselleri Güncelle
        canvasState.set(key, pixel);
        
        if (pgPool) {
            pgPool.query(
                'INSERT INTO pixels (x, y, color, last_paint, lock_expires, locked_by, locked_by_name) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (x, y) DO UPDATE SET color = $3, last_paint = $4, lock_expires = $5, locked_by = $6, locked_by_name = $7',
                [x, y, color, now, pixel.lockExpires, userId, userName]
            ).catch(e => console.error('[PG] Pixel Hatası:', e));
            pgPool.query(
                'INSERT INTO pixel_history (x, y, color, user_id, timestamp) VALUES ($1, $2, $3, $4, $5)',
                [x, y, color, userId, now]
            ).catch(e => console.error('[PG] History Hatası:', e));
        } else {
            insertPixelStmt.run(x, y, color, now.toISOString(), pixel.lockExpires.toISOString(), userId, userName);
            db.prepare('INSERT INTO pixel_history (x, y, color, userId, timestamp) VALUES (?, ?, ?, ?, ?)').run(x, y, color, userId, now.toISOString());
        }

        // 2. HAFTALIK LİMİTLİ GANİMET SİSTEMİ (Her boyamada şans var!)
        // ... (Loot logic continues below)
        
        let foundLoot = null;
        let currentLimitCount = 0;
        let matchedRarity = null;

        // TEST KOORDİNATLARI (Senin için özel)
        if (x === 1 && y === 1) {
            socket.emit('loot_found', { 
                rarity: 'Legendary', 
                steamDefinitionId: 1001,
                x: x,
                y: y,
                msg: `TEST: Kraliyet Moru rengini buldun! Artık paletinde görebilirsin.` 
            });
            // Veritabanına da ekle
            if (pgPool) {
                pgPool.query("INSERT INTO inventory (steam_id, item_type, rarity, status) VALUES ($1, $2, $3, $4)", [userId, 'Color', 'Legendary', 'sealed']);
            } else {
                db.prepare("INSERT INTO inventory (steamId, itemType, rarity, status) VALUES (?, ?, ?, 'sealed')").run(userId, 'Color', 'Legendary');
            }
        }
        else {
            // Normal Olasılık Mantığı
            for (const r of rarityWeights) {
                if (Math.random() < r.chance) {
                    let count = 0;
                    if (pgPool) {
                        const countRes = await pgPool.query(`
                            SELECT COUNT(*) as total FROM loot_history 
                            WHERE steam_id = $1 AND rarity = $2 
                            AND found_at >= NOW() - INTERVAL '7 days'
                        `, [userId, r.rarity]);
                        count = parseInt(countRes.rows[0].total);
                    } else {
                        count = db.prepare(`
                            SELECT COUNT(*) as total FROM loot_history 
                            WHERE steamId = ? AND rarity = ? 
                            AND foundAt >= date('now', 'weekday 0', '-7 days')
                        `).get(userId, r.rarity).total;
                    }

                    if (count < r.limit) {
                        foundLoot = r.rarity;
                        currentLimitCount = count;
                        matchedRarity = r;
                        break; 
                    }
                }
            }
        }

        if (foundLoot) {
            const { type: itemType, defId: steamDefId } = getRarityConfig(foundLoot);
            
            if (pgPool) {
                pgPool.query("INSERT INTO inventory (steam_id, item_type, rarity, status) VALUES ($1, $2, $3, $4)", [userId, itemType, foundLoot, 'sealed']);
                pgPool.query('INSERT INTO loot_history (steam_id, item_type, rarity) VALUES ($1, $2, $3)', [userId, itemType, foundLoot]);
            } else {
                db.prepare("INSERT INTO inventory (steamId, itemType, rarity, status) VALUES (?, ?, ?, 'sealed')").run(userId, itemType, foundLoot);
                db.prepare('INSERT INTO loot_history (steamId, itemType, rarity) VALUES (?, ?, ?)').run(userId, itemType, foundLoot);
            }
            
            socket.emit('loot_found', { 
                rarity: foundLoot, 
                steamDefinitionId: steamDefId,
                x: x,
                y: y,
                msg: `MUHTEŞEM! Bir ${foundLoot} Sikke buldun! Envanterinden açıp kullanabilirsin. (Haftalık: ${currentLimitCount+1}/${matchedRarity.limit})` 
            });

            // GLOBAL DUYURU: Herkes görsün!
            io.emit('loot_announcement', {
                userName: userName || 'Gizemli Oyuncu',
                rarity: foundLoot,
                msg: `${userName || 'Bir Oyuncu'} tualde kazı yaparken bir ${foundLoot} Sikke buldu!`
            });
            console.log(`[Loot] ${userId} found ${foundLoot}`);
        }

        const updateData = { x, y, color, user: userName || userId, lockExpires: lockExpires.toISOString() };
        io.emit('update', updateData);
        callback?.({ success: true, data: updateData });
    } catch (err) {
        console.error('Boyama hatası:', err);
        callback?.({ success: false, msg: 'Sunucu hatası oluştu.' });
    }
}

io.on('connection', (socket) => {
    const initialState = {};
    canvasState.forEach((val, key) => initialState[key] = val); 

    // Kullanıcının kilitlerini ve renklerini çek
    const urlParams = new URLSearchParams(socket.handshake.query.params); // Not: Frontend'de query'e ekleyeceğiz
    // Kullanıcının kilitlerini ve renklerini çek
    const steamId = socket.handshake.query.steamId;
    let unlocked = [];
    let unlockedColors = [];

    if (steamId) {
        try {
            if (pgPool) {
                const areaRes = await pgPool.query('SELECT x_block, y_block FROM unlocked_areas WHERE steam_id = $1', [steamId]);
                unlocked = areaRes.rows.map(r => ({ x_block: r.x_block, y_block: r.y_block }));
                const colorRes = await pgPool.query('SELECT color_code FROM user_colors WHERE steam_id = $1', [steamId]);
                unlockedColors = colorRes.rows.map(r => r.color_code);
            } else {
                unlocked = db.prepare('SELECT x_block, y_block FROM unlocked_areas WHERE steamId = ?').all(steamId);
                const colors = db.prepare('SELECT colorCode FROM user_colors WHERE steamId = ?').all(steamId);
                unlockedColors = colors.map(c => c.colorCode);
            }
        } catch (e) {
            console.error('[DB] Connection Data Error:', e);
        }
    }

    socket.emit('init_data', { pixels: initialState, activeBugs, unlocked, unlockedColors }); 
    socket.emit('init_chat', chatHistory);
    socket.on('paint', (data) => handlePaint(data, socket, (res) => { if (!res.success) socket.emit('error', res); }));
    
    socket.on('unlock_color', (data) => {
        const { steamId, colorCode } = data;
        try {
            db.prepare('INSERT OR IGNORE INTO user_colors (steamId, colorCode) VALUES (?, ?)').run(steamId, colorCode);
            console.log(`[Unlock] ${steamId} permanently unlocked color ${colorCode}`);
        } catch (e) {
            console.error('Renk kaydetme hatası:', e);
        }
    });

    // BÖCEK TIKLAMA OLAYI
    socket.on('chat_message', (msgData) => {
        if (!msgData.text || msgData.text.trim() === '') return;
        
        const message = {
            id: Date.now(),
            text: msgData.text.substring(0, 200),
            userName: msgData.userName || 'Anonim',
            steamId: msgData.steamId,
            avatar: msgData.avatar,
            timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        };

        chatHistory.push(message);
        if (chatHistory.length > MAX_CHAT_HISTORY) chatHistory.shift();

        io.emit('new_chat_message', message);
    });

    socket.on('share_reference', (refData) => {
        // refData: { imageData, x, y, scale, opacity, userName }
        io.emit('reference_shared', {
            ...refData,
            timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        });
    });

    socket.on('bug_click', (data) => {
        const { steamId, userName, x, y } = data;
        const bugIndex = activeBugs.findIndex(b => b.x === x && b.y === y);
        if (bugIndex === -1) return;

        const bug = activeBugs[bugIndex];
        if (bug.hp <= 0) return;

        bug.hp -= 1;
        bug.clickers[steamId] = (bug.clickers[steamId] || 0) + 1;

        if (bug.hp <= 0) {
            // BÖCEK ÖLDÜ - KAZANANI BELİRLE
            const winnerId = calculateBugWinner(bug.clickers);
            const winnerName = userName || "Gizemli Oyuncu";

            let rewardRarity = '';
            let itemType = '';
            let steamDefId = null;

            const rand = Math.random() * 100;

            if (bug.type === 'normal') {
                // NORMAL BÖCEK SADECE ANAHTAR DÜŞÜRÜR (En kolay)
                if (rand <= 1) { rewardRarity = 'PlatinumKey'; steamDefId = 800; }
                else if (rand <= 5) { rewardRarity = 'DiamondKey'; steamDefId = 700; }
                else if (rand <= 15) { rewardRarity = 'GoldKey'; steamDefId = 600; }
                else if (rand <= 40) { rewardRarity = 'SilverKey'; steamDefId = 500; }
                else { rewardRarity = 'CopperKey'; steamDefId = 400; }
                itemType = 'Key';
                
            } else if (bug.type === 'dev') {
                // DEV BÖCEK SADECE KİLİT DÜŞÜRÜR (Orta zorluk)
                if (rand <= 1) { rewardRarity = 'PlatinumLock'; steamDefId = 320; }
                else if (rand <= 5) { rewardRarity = 'DiamondLock'; steamDefId = 310; }
                else if (rand <= 15) { rewardRarity = 'GoldLock'; steamDefId = 300; }
                else if (rand <= 40) { rewardRarity = 'SilverLock'; steamDefId = 200; }
                else { rewardRarity = 'CopperLock'; steamDefId = 100; }
                itemType = 'Lock';

            } else if (bug.type === 'ciddi') {
                // CİDDİ BÖCEK SADECE RENK DÜŞÜRÜR (En zor)
                const colors = [1001, 1002]; // Yeni renk eklendikçe buraya girilebilir
                steamDefId = colors[Math.floor(Math.random() * colors.length)];
                rewardRarity = 'Color';
                itemType = 'Color';
            }

            db.prepare("INSERT INTO inventory (steamId, itemType, rarity, steamItemId, status) VALUES (?, ?, ?, ?, 'sealed')").run(winnerId, itemType, rewardRarity, steamDefId);
            
            // KAZANANA ÖZEL BİLDİRİM
            io.emit('bug_killed', { 
                winnerId, 
                winnerName, 
                x: bug.x, 
                y: bug.y,
                rarity: rewardRarity,
                defId: steamDefId,
                msg: `BÖCEK ÖLDÜRÜLDÜ! 🏆 Şanslı kazanan: ${winnerName} (Ödül: ${rewardRarity}!)` 
            });

            activeBugs.splice(bugIndex, 1);
        } else {
            io.emit('bug_hit', { x, y, hp: bug.hp, lastHitter: userName });
        }
    });
});

function calculateBugWinner(clickers) {
    const players = Object.keys(clickers);
    const totalClicks = Object.values(clickers).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalClicks;
    
    for (const pid of players) {
        random -= clickers[pid];
        if (random <= 0) return pid;
    }
    return players[0];
}

function spawnBug() {
    const x = Math.floor(Math.random() * GRID_DIMENSIONS.WIDTH);
    const y = Math.floor(Math.random() * GRID_DIMENSIONS.HEIGHT);
    
    // TÜR SEÇİMİ
    const rand = Math.random() * 100;
    let bugType = 'normal';
    let hp = 50; // Normal böcek canı
    let bugName = 'BÖCEK';

    if (rand <= 10) { 
        bugType = 'ciddi'; 
        hp = 250; 
        bugName = 'CİDDİ BÖCEK';
    } else if (rand <= 40) { 
        bugType = 'dev'; 
        hp = 125; 
        bugName = 'DEV BÖCEK';
    }

    hp = 1; // DEV TESTING: Geçici olarak kolay deneme için canı 1 yaptık

    const newBug = {
        x, y,
        type: bugType,
        hp: hp,
        maxHp: hp,
        clickers: {}
    };

    activeBugs.push(newBug);

    io.emit('bug_spawned', { 
        x, y, type: bugType, maxHp: hp, hp: hp,
        msg: `⚠️ DİKKAT! Koordinat ${x}, ${y} üzerinde bir ${bugName} belirdi! Hemen onu durdurun!` 
    });
    console.log(`[Bug] Spawned ${bugType} at ${x},${y} with ${hp} HP`);
}

// Böcek sistemini başlat
// Başlangıçta 20 böcek oluştur
for (let i = 0; i < 20; i++) {
    spawnBug();
}

let bugSpawnQueue = 0;
setInterval(() => {
    if (activeBugs.length + bugSpawnQueue < 20) {
        bugSpawnQueue++;
        setTimeout(() => {
            spawnBug();
            bugSpawnQueue--;
        }, 60000 * bugSpawnQueue); // Her eksik böcek için +1 dakika
    }
}, 1000);

app.post('/api/steam/mint-snapshot', express.json(), (req, res) => {
    res.json({ success: true, itemId: 'ITEM-' + Math.random().toString(36).substr(2, 9) });
});

function createSnapshot() {
    const canvas = createCanvas(GRID_DIMENSIONS.WIDTH, GRID_DIMENSIONS.HEIGHT);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, GRID_DIMENSIONS.WIDTH, GRID_DIMENSIONS.HEIGHT);
    canvasState.forEach((p, k) => {
        const [x, y] = k.split('-').map(Number);
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y, 1, 1);
    });
    const filename = `snapshots/pixel-art-${new Date().toISOString().split('T')[0]}.png`;
    canvas.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, filename)));
}

setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        if (now.getDay() === 3) createSnapshot(); // Çarşamba
        spawnLoot();
    }
}, 60000);

app.post('/api/inventory/open', express.json(), (req, res) => {
    const { itemId, steamId } = req.body;
    try {
        const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND steamId = ?').get(itemId, steamId);
        if (!item) return res.json({ success: false, msg: 'Eşya bulunamadı' });
        if (item.status !== 'sealed') return res.json({ success: false, msg: 'Bu eşya zaten açılmış' });

        db.prepare("UPDATE inventory SET status = 'opened' WHERE id = ?").run(itemId);
        
        let actionText = 'alan kilitlemek';
        if (item.rarity.includes('Key')) actionText = 'karanlık alanları haritaya katmak';
        else if (item.itemType === 'Color') actionText = 'renk paletine eklemek';
        
        res.json({ success: true, msg: `Sikke başarıyla açıldı! Artık ${actionText} için kullanabilirsin.` });
    } catch (err) {
        res.json({ success: false, msg: 'Hata oluştu' });
    }
});

app.post('/api/inventory/spend', express.json(), async (req, res) => {
    try {
        const { itemId, coords, steamId } = req.body;
        console.log(`[Spend] Request: itemId=${itemId}, steamId=${steamId}, blocks=${coords?.length}`);
        
        if (!itemId || !coords || !steamId) {
            return res.json({ success: false, msg: 'Eksik veri gönderildi!' });
        }

        let item;
        if (pgPool) {
            const res = await pgPool.query('SELECT rarity, status FROM inventory WHERE id = $1 AND steam_id = $2', [itemId, steamId]);
            item = res.rows[0];
        } else {
            item = db.prepare('SELECT * FROM inventory WHERE id = ? AND steamId = ?').get(itemId, steamId);
        }

        if (!item || (item.status || item.status) !== 'opened') {
            return res.json({ success: false, msg: 'Önce bu eşyayı envanterinden açmalısın!' });
        }

        const isKey = item.rarity.includes('Key');
        const isLock = item.rarity.includes('Lock');

        if (isKey) {
            if (pgPool) {
                await pgPool.query('BEGIN');
                try {
                    for (const pos of coords) {
                        await pgPool.query('INSERT INTO unlocked_areas (steam_id, x_block, y_block) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [steamId, pos.x, pos.y]);
                    }
                    await pgPool.query('DELETE FROM inventory WHERE id = $1', [itemId]);
                    await pgPool.query('COMMIT');
                } catch (e) {
                    await pgPool.query('ROLLBACK');
                    throw e;
                }
            } else {
                const transaction = db.transaction(() => {
                    coords.forEach(pos => {
                        db.prepare('INSERT OR IGNORE INTO unlocked_areas (steamId, x_block, y_block) VALUES (?, ?, ?)').run(steamId, pos.x, pos.y);
                    });
                    db.prepare('DELETE FROM inventory WHERE id = ?').run(itemId);
                });
                transaction();
            }
            io.emit('area_unlocked', { steamId, coords });
            return res.json({ success: true, msg: 'Bölgeler kalıcı olarak aktif edildi! Artık burayı boyayabilirsin.' });
        }

        let duration = 1800000; // Bakır: 30 dk
        if (item.rarity === 'SilverLock') duration = 3600000; // 1 saat
        if (item.rarity === 'GoldLock')   duration = 7200000; // 2 saat
        if (item.rarity === 'DiamondLock') duration = 21600000; // 6 saat
        if (item.rarity === 'PlatinumLock') duration = 43200000; // 12 saat

        const expires = new Date(Date.now() + duration).toISOString();
        const size = 10;

        const updateStmt = db.prepare('INSERT OR REPLACE INTO pixels (x, y, color, lastPaint, lockExpires, lockedBy, lockedByName) VALUES (?, ?, COALESCE((SELECT color FROM pixels WHERE x=? AND y=?), \'#111\'), CURRENT_TIMESTAMP, ?, ?, ?)');
        
        const transaction = db.transaction(() => {
            coords.forEach(pos => {
                for (let ix = pos.x; ix < pos.x + size; ix++) {
                    for (let iy = pos.y; iy < pos.y + size; iy++) {
                        if (ix >= 0 && ix < GRID_DIMENSIONS.WIDTH && iy >= 0 && iy < GRID_DIMENSIONS.HEIGHT) {
                            const key = `${ix}-${iy}`;
                            const current = canvasState.get(key) || { color: '#111', lockExpires: new Date(0).toISOString() };
                            
                            // Sadece kilitli değilse veya kilidi bizden biriyse (veya süre dolmuşsa) kilitle
                            // (NOT: Kullanıcı isteği üzerine: kilitli alanı tekrar kilitleyemez)
                            if (new Date(current.lockExpires) <= new Date()) {
                                updateStmt.run(ix, iy, ix, iy, expires, steamId, item.steamName || 'Bir Oyuncu');
                                canvasState.set(key, { ...current, x: ix, y: iy, lockExpires: expires, lockedBy: steamId, lockedByName: item.steamName || 'Bir Oyuncu' });
                            }
                        }
                    }
                }
            });
            db.prepare('DELETE FROM inventory WHERE id = ?').run(itemId);
        });
        
        transaction();

        io.emit('area_lock', { coords, size, expires, lockedBy: steamId, lockedByName: item.steamName || 'Bir Oyuncu' });
        res.json({ success: true, msg: `${item.rarity} kullanıldı! Bölgeler kilitlendi.` });
    } catch (err) {
        console.error('Sikke Harcama Hatası:', err);
        res.json({ success: false, msg: 'Harcama işlemi başarısız!' });
    }
});

// --- STEAM API ENDPOINTS (Proxy for Client) ---

app.post('/api/steam/add-item', express.json(), async (req, res) => {
    const { steamId, itemDefId } = req.body;
    console.log(`[Server] AddItem requested for ${steamId}, DefID: ${itemDefId}`);
    
    try {
        const result = await callSteamPartnerAPI('IInventoryService', 'AddItem', 'v1', {
            steamid: steamId,
            itemdefid: [parseInt(itemDefId)],
            notify: 1
        });
        res.status(result.statusCode).json(result.data || { error: result.error });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/steam/consume-item', express.json(), async (req, res) => {
    const { steamId, itemId } = req.body;
    console.log(`[Server] ConsumeItem requested for ${steamId}, ItemID: ${itemId}`);
    
    try {
        const result = await callSteamPartnerAPI('IInventoryService', 'ConsumeItem', 'v1', {
            steamid: steamId,
            itemid: itemId.toString(),
            quantity: 1
        });
        res.status(result.statusCode).json(result.data || { error: result.error });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/steam/modify-item', express.json(), async (req, res) => {
    const { steamId, itemId, properties } = req.body;
    console.log(`[Server] ModifyItems requested for ${steamId}, ItemID: ${itemId}`);
    
    try {
        const result = await callSteamPartnerAPI('IInventoryService', 'ModifyItems', 'v1', {
            steamid: steamId,
            updates: Object.keys(properties).map(key => ({
                itemid: itemId.toString(),
                property_name: key,
                property_value_string: properties[key].toString()
            }))
        });
        res.status(result.statusCode).json(result.data || { error: result.error });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/steam/get-inventory/:steamId', async (req, res) => {
    const steamId = req.params.steamId;
    const url = `https://partner.steam-api.com/IInventoryService/GetInventory/v1/?key=${STEAM_WEB_API_KEY}&appid=${APP_ID}&steamid=${steamId}`;
    
    https.get(url, (sRes) => {
        let data = '';
        sRes.on('data', chunk => data += chunk);
        sRes.on('end', () => {
            try {
                res.json(JSON.parse(data));
            } catch (e) {
                res.status(500).json({ error: 'Parse Error' });
            }
        });
    }).on('error', (e) => res.status(500).json({ error: e.message }));
});

// --- API ENDPOINTS ---

app.post('/api/inventory/add-unlocked', express.json(), async (req, res) => {
    const { steamId, rarity, steamItemId, itemType, colorDefId } = req.body;
    try {
        let type = itemType;
        if (!type) {
            const config = getRarityConfig(rarity);
            type = config.type;
        }
        const finalRarity = colorDefId ? `Color-${colorDefId}` : rarity;

        if (pgPool) {
            await pgPool.query(
                "INSERT INTO inventory (steam_id, item_type, rarity, status, steam_item_id) VALUES ($1, $2, $3, 'opened', $4)",
                [steamId, type, finalRarity, steamItemId || null]
            );
        } else {
            db.prepare("INSERT INTO inventory (steamId, itemType, rarity, status, steamItemId) VALUES (?, ?, ?, 'opened', ?)").run(steamId, type, finalRarity, steamItemId || null);
        }
        res.json({ success: true, msg: 'Eşya oyun envanterine eklendi.' });
    } catch (err) {
        console.error('AddUnlocked Hatası:', err);
        res.json({ success: false, msg: 'Ekleme hatası' });
    }
});

app.get('/api/inventory/:userId', async (req, res) => {
    try {
        let items = [];
        if (pgPool) {
            const result = await pgPool.query('SELECT id, steam_id as "steamId", item_type as "itemType", rarity, status, steam_item_id as "steamItemId", found_at as "foundAt" FROM inventory WHERE steam_id = $1 ORDER BY found_at DESC', [req.params.userId]);
            items = result.rows;
        } else {
            items = db.prepare('SELECT * FROM inventory WHERE steamId = ? ORDER BY foundAt DESC').all(req.params.userId);
        }
        res.json(items || []);
    } catch (err) {
        console.error('Envanter API Hatası:', err);
        res.json([]);
    }
});

app.post('/api/inventory/activate-color', express.json(), async (req, res) => {
    const { id } = req.body;
    try {
        let item;
        if (pgPool) {
            const res = await pgPool.query('SELECT steam_id as "steamId", rarity FROM inventory WHERE id = $1', [id]);
            item = res.rows[0];
        } else {
            item = db.prepare('SELECT steamId, rarity FROM inventory WHERE id = ?').get(id);
        }

        if (item) {
            let changes = 0;
            if (pgPool) {
                const updateRes = await pgPool.query("UPDATE inventory SET status = 'activated' WHERE id = $1 AND item_type = 'Color' AND status = 'opened'", [id]);
                changes = updateRes.rowCount;
            } else {
                const result = db.prepare("UPDATE inventory SET status = 'activated' WHERE id = ? AND itemType = 'Color' AND status = 'opened'").run(id);
                changes = result.changes;
            }
            
            if (changes > 0 && item.rarity && item.rarity.startsWith('Color-')) {
                const defId = parseInt(item.rarity.split('-')[1]);
                const colorHex = { 1001: '#6A0DAD', 1002: '#50C878' }[defId];
                if (colorHex) {
                    if (pgPool) {
                        await pgPool.query('INSERT INTO user_colors (steam_id, color_code) VALUES ($1, $2) ON CONFLICT DO NOTHING', [item.steamId, colorHex]);
                    } else {
                        db.prepare('INSERT OR IGNORE INTO user_colors (steamId, colorCode) VALUES (?, ?)').run(item.steamId, colorHex);
                    }
                    console.log(`[Color] User ${item.steamId} activated color ${colorHex}`);
                    return res.json({ success: true, color: colorHex });
                }
            }
            if (changes > 0) return res.json({ success: true });
        }
        res.json({ success: false, msg: 'Eşya bulunamadı veya zaten aktif!' });
    } catch (err) {
        console.error('Activate Color Error:', err);
        res.json({ success: false });
    }
});

// --- TIME-LAPSE HISTORY API ---
app.get('/api/history/:xmin/:ymin/:xmax/:ymax', (req, res) => {
    try {
        const { xmin, ymin, xmax, ymax } = req.params;
        const history = db.prepare(`
            SELECT x, y, color, timestamp, userId 
            FROM pixel_history 
            WHERE x >= ? AND x <= ? AND y >= ? AND y <= ?
            ORDER BY timestamp ASC
        `).all(xmin, xmax, ymin, ymax);
        res.json(history);
    } catch (err) {
        console.error('History API Hatası:', err);
        res.status(500).json({ error: 'History could not be retrieved' });
    }
});

// --- HAFTALIK SIFIRLAMA VE SNAPSHOT SİSTEMİ ---
let lastResetDate = null;

async function takeWeeklySnapshot() {
    const now = new Date();
    const dateStr = now.toDateString();
    
    // Günde sadece bir kez çalışmasını sağla
    if (lastResetDate === dateStr) return;
    lastResetDate = dateStr;

    console.log("[System] Haftalık sıfırlama ve yüksek çözünürlüklü snapshot başlatılıyor...");
    
    // Tual boyutları (Native)
    const WIDTH = GRID_DIMENSIONS.WIDTH;
    const HEIGHT = GRID_DIMENSIONS.HEIGHT;
    const SCALE = 4; // 4x Ölçekli (Yüksek Çözünürlük: 3840x2160)
    
    const canvas = createCanvas(WIDTH * SCALE, HEIGHT * SCALE);
    const ctx = canvas.getContext('2d');

    // Arka plan
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pikselleri çek ve çiz
    const allPixels = db.prepare('SELECT * FROM pixels').all();
    allPixels.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x * SCALE, p.y * SCALE, SCALE, SCALE);
    });

    // Dosya yolu hazırlığı
    const snapshotsDir = path.join(__dirname, 'snapshots', 'weekly');
    if (!fs.existsSync(snapshotsDir)) {
        fs.mkdirSync(snapshotsDir, { recursive: true });
    }

    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const filename = `weekly-snapshot-${timestamp}.png`;
    const fullPath = path.join(snapshotsDir, filename);

    const out = fs.createWriteStream(fullPath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);

    out.on('finish', () => {
        console.log(`[System] Snapshot başarıyla kaydedildi: ${filename}`);
        
        // Veritabanını Sıfırla
        db.prepare('DELETE FROM pixels').run();
        db.prepare('DELETE FROM pixel_history').run();
        canvasState.clear();
        
        // Tüm istemcilere bildir
        io.emit('init_data', []);
        io.emit('notification', { 
            msg: "🌅 Yeni bir hafta başladı! Harita sıfırlandı.", 
            type: "info" 
        });
        
        console.log("[System] Harita sıfırlandı.");
    });
}

// Her dakika kontrol et: Çarşamba saat 03:00 mı?
setInterval(() => {
    const now = new Date();
    // getDay(): 0=Pazar, 1=Pazartesi, 2=Salı, 3=Çarşamba
    if (now.getDay() === 3 && now.getHours() === 3 && now.getMinutes() === 0) {
        takeWeeklySnapshot();
    }
}, 60000);

// Sunucu başlatıldığında dinlemeye başla
const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Server: Server running on port ${PORT}`);
});
