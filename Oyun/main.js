const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const steamworks = require('steamworks.js');
const https = require('https');
const http = require('http');
const fs = require('fs');
const { RARITY_CONFIG } = require('./utils');

ipcMain.on('open-external-url', (event, url) => {
    shell.openExternal(url);
});

let LOOT_PATH = path.join(process.cwd(), 'loot_history.json'); 
// Not: Electron hazır olduğunda userData'ya taşıyacağız
app.whenReady().then(() => {
    LOOT_PATH = path.join(app.getPath('userData'), 'loot_history.json');
    if (!fs.existsSync(LOOT_PATH)) fs.writeFileSync(LOOT_PATH, JSON.stringify([]));
    console.log("Kayıt Dosyası Hazır:", LOOT_PATH);
});

let mainWindow;
let serverProcess;
let steamClient;
let steamUser = { name: 'Test_User', id: '76561197960287930', avatar: '' };
const APP_ID = 4704280;
const REMOTE_SERVER_URL = "https://pixelverse-online.onrender.com"; 

// Steam'i Başlat ve Avatarı Çek
async function initSteam() {
    try {
        steamClient = steamworks.init(4704280);
        if (steamClient) {
            steamUser.name = steamClient.localplayer.getName();
            steamUser.id = steamClient.localplayer.getSteamId().steamId64.toString();
            
            // Başlangıç Durumu
            steamClient.localplayer.setRichPresence('status', "Tualde Keşif Yapıyor");
            
            return new Promise((resolve) => {
                https.get(`https://steamcommunity.com/profiles/${steamUser.id}/?xml=1`, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        const match = data.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/);
                        if (match && match[1]) {
                            steamUser.avatar = match[1];
                        }
                        resolve();
                    });
                }).on('error', () => resolve());
            });
        }
    } catch (e) {
        console.warn("Steam başlatılamadı:", e.message);
    }
}

// Frontend'den gelen durum güncellemelerini dinle
ipcMain.on('update-presence', (event, status) => {
    if (steamClient) {
        steamClient.localplayer.setRichPresence('status', status);
        console.log("Steam Durumu Güncellendi:", status);
    }
});

// Steam Cloud - Ayarları Kaydet
ipcMain.on('save-settings', (event, settings) => {
    if (steamClient) {
        try {
            const data = JSON.stringify(settings);
            steamClient.cloud.writeFile('settings.json', data);
            console.log("Ayarlar Steam Cloud'a kaydedildi.");
        } catch (e) {
            console.error("Steam Cloud kaydetme hatası:", e);
        }
    }
});

// Steam Cloud - Ayarları Yükle
ipcMain.handle('load-settings', async () => {
    if (steamClient) {
        try {
            const data = steamClient.cloud.readFile('settings.json');
            if (data) return JSON.parse(data.toString());
        } catch (e) {
            console.log("Bulut ayarları henüz mevcut değil.");
        }
    }
    return null;
});

// Steam Marketini Aç
ipcMain.on('open-steam-market', () => {
    if (steamClient) {
        try {
            steamClient.overlay.activateToWebPage('https://steamcommunity.com/market/');
            console.log("Steam Overlay Market Sayfası Açıldı");
        } catch (e) {
            const { shell } = require('electron');
            shell.openExternal('https://steamcommunity.com/market/');
        }
    }
});

// Steam Workshop - Şablon Yükle
ipcMain.on('workshop-upload', async (event, { title, description, imagePath, contentPath }) => {
    let currentStep = "Başlatılıyor";
    if (steamClient) {
        try {
            console.log("Atölye'ye yükleniyor:", title);
            currentStep = "Dosya Yolları Kontrolü";
            const absoluteContentPath = path.isAbsolute(contentPath) ? contentPath : path.join(process.cwd(), contentPath);
            const absolutePreviewPath = path.isAbsolute(imagePath) ? imagePath : path.join(process.cwd(), imagePath);

            currentStep = "Öğe Oluşturma (createItem)";
            let item = null;
            let createRetries = 3;
            while (!item && createRetries > 0) {
                try {
                    // Tip 1: Community item
                    item = await steamClient.workshop.createItem(1);
                } catch (err) {
                    if (err.message.includes('busy')) {
                        console.log(`createItem meşgul, tekrar deneniyor... Kalan: ${createRetries}`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        createRetries--;
                    } else {
                        throw err;
                    }
                }
            }
            
            if (!item) throw new Error("Steam yeni öğe oluşturma isteğini reddetti (Meşgul).");
            console.log("Öğe oluşturuldu, ID:", item.itemId);
            
            currentStep = "Bekleme (Sync)";
            await new Promise(resolve => setTimeout(resolve, 5000));

            currentStep = "Detay Güncelleme (updateItem)";
            let success = false;
            let retries = 3;
            
            while (!success && retries > 0) {
                try {
                    await steamClient.workshop.updateItem(item.itemId, {
                        title: title,
                        description: description,
                        previewPath: absolutePreviewPath,
                        contentPath: absoluteContentPath,
                        visibility: 0 // Public
                    });
                    success = true;
                } catch (err) {
                    if (err.message.includes('busy')) {
                        console.log(`Method busy hatası, tekrar deneniyor... Kalan deneme: ${retries}`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        retries--;
                    } else {
                        throw err;
                    }
                }
            }
            
            if (success) {
                currentStep = "Tamamlandı";
                console.log("Atölye yüklemesi başarılı! ID:", item.itemId);
                mainWindow.webContents.send('workshop-status', { success: true, id: item.itemId });
            } else {
                throw new Error("Steam hala meşgul, lütfen daha sonra tekrar deneyin.");
            }
        } catch (e) {
            console.error(`Atölye hatası (${currentStep}):`, e);
            // Hata mesajına hangi adımda olduğunu ekleyelim
            mainWindow.webContents.send('workshop-status', { 
                success: false, 
                error: `${currentStep} hatası: ${e.message}` 
            });
        }
    }
});

// Steam Workshop - Abone Olunan Öğeleri Listele
ipcMain.handle('get-workshop-items', async () => {
    if (steamClient) {
        try {
            const items = steamClient.workshop.getSubscribedItems();
            return items; // Bu ID'leri kullanarak dosya yollarını bulabiliriz
        } catch (e) {
            return [];
        }
    }
    return [];
});

// Helper function to call Server API
async function callServerAPI(endpoint, data) {
    const serverUrl = REMOTE_SERVER_URL || "http://localhost:3000";
    const postData = JSON.stringify(data);
    const protocol = serverUrl.startsWith('https') ? https : http;
    
    return new Promise((resolve, reject) => {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = protocol.request(`${serverUrl}${endpoint}`, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve({ error: 'Parse Error', body });
                }
            });
        });
        
        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

// Koleksiyon Geçmişini Getir
ipcMain.handle('get-loot-history', async () => {
    try {
        return JSON.parse(fs.readFileSync(LOOT_PATH));
    } catch (e) {
        console.error("Koleksiyon çekme hatası:", e.message);
        return [];
    }
});

ipcMain.on('open-external-url', (event, url) => {
    const { shell } = require('electron');
    shell.openExternal(url);
});

ipcMain.on('trigger-item-drop', async (event, data) => {
    if (!steamClient) return;
    try {
        const { definitionId, x, y, rarity } = data;
        const userSteamId = steamClient.localplayer.getSteamId().steamId64.toString();
        console.log(`[Proxy] Steam Eşya Düşürme Talebi [${rarity}] -> Sunucuya Gönderiliyor`);
        
        const result = await callServerAPI('/api/steam/add-item', {
            steamId: userSteamId,
            itemDefId: definitionId
        });

        if (result.response && result.response.item_json) {
            const items = JSON.parse(result.response.item_json);
            const newItem = items[0];
            console.log("Sunucu Aracılığıyla Eşya Başarıyla Gönderildi! ID:", newItem.itemid);

            // Lokal koleksiyon defterine kaydet
            const playerName = steamClient ? steamClient.localplayer.getName() : 'Gizemli Oyuncu';
            try {
                const history = JSON.parse(fs.readFileSync(LOOT_PATH));
                history.push({
                    id: Date.now(),
                    item_id: newItem.itemid.toString(),
                    item_type: rarity,
                    x: x,
                    y: y,
                    timestamp: new Date().toISOString(),
                    player_name: playerName
                });
                fs.writeFileSync(LOOT_PATH, JSON.stringify(history, null, 2));
            } catch (e) {}

            // Metadata güncelleme (Sunucu üzerinden)
            callServerAPI('/api/steam/modify-item', {
                steamId: userSteamId,
                itemId: newItem.itemid,
                properties: {
                    "discovery_location": `X: ${x}, Y: ${y}`,
                    "discovery_time": new Date().toLocaleString('tr-TR'),
                    "found_by": playerName
                }
            });

            mainWindow.webContents.send('inventory-updated', items);
        }
    } catch (err) {
        console.error("Proxy Drop Hatası:", err.message);
    }
});

const STEAM_WEB_API_KEY = "4B8CB3F7978F66CF39BD57FB05E15315";

ipcMain.handle('consume-item', async (event, itemId) => {
    if (!steamClient) return { success: false, error: 'Steam bağlı değil' };
    
    try {
        console.log(`[Steam-Web] Tüketim başlatılıyor: ${itemId}`);
        const postData = `key=${STEAM_WEB_API_KEY}&appid=${APP_ID}&itemid=${itemId}&quantity=1&steamid=${steamUser.id}`;
        
        const options = {
            hostname: 'partner.steam-api.com',
            port: 443,
            path: '/IInventoryService/ConsumeItem/v1/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        return new Promise((resolve) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log(`[Steam-Web] Tüketim yanıtı (${res.statusCode}):`, data);
                    if (res.statusCode === 200) {
                        resolve({ success: true });
                    } else {
                        resolve({ success: false, error: `Steam API Hatası: ${res.statusCode}` });
                    }
                });
            });
            req.on('error', e => resolve({ success: false, error: e.message }));
            req.write(postData);
            req.end();
        });
    } catch (e) {
        console.error(`[Steam] Tüketim kritik hata:`, e.message);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('update-item-metadata', async (event, { itemId, props, steamId }) => {
    try {
        return await callServerAPI('/api/steam/modify-item', {
            steamId: steamId,
            itemId: itemId,
            properties: props
        });
    } catch (e) {
        return { error: e.message };
    }
});

ipcMain.handle('get-inventory', async () => {
    const serverUrl = REMOTE_SERVER_URL || "http://localhost:3000";
    const protocol = serverUrl.startsWith('https') ? https : http;
    
    return new Promise((resolve) => {
        protocol.get(`${serverUrl}/api/steam/get-inventory/${steamUser.id}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.response && result.response.item_json) {
                        resolve(JSON.parse(result.response.item_json));
                    } else {
                        resolve([]);
                    }
                } catch (e) {
                    resolve([]);
                }
            });
        }).on('error', (err) => {
            console.error("Envanter çekme hatası:", err.message);
            resolve([]);
        });
    });
});

app.on('ready', async () => {
    console.log("Steam ve Sunucu başlatılıyor...");
    await initSteam();
    
    // --- SUNUCU BAGLANTI AYARI ---
    if (REMOTE_SERVER_URL) {
        console.log("Uzak sunucuya baglaniliyor:", REMOTE_SERVER_URL);
        createWindow(REMOTE_SERVER_URL);
    } else {
        console.log("Yerel sunucu baslatiliyor...");
        serverProcess = spawn('node', ['server.js']);

        serverProcess.stdout.on('data', (data) => {
            console.log(`Server: ${data}`);
            if (data.toString().includes('Server running')) {
                createWindow("http://localhost:3000");
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`Server Error: ${data}`);
        });
    }
});

function createWindow(serverUrl) {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        title: "Pixelverse | Steam Edition",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        backgroundColor: '#0a0a0c',
        autoHideMenuBar: true
    });

    const urlParams = `user=${encodeURIComponent(steamUser.name)}&id=${steamUser.id}&avatar=${encodeURIComponent(steamUser.avatar)}&server=${encodeURIComponent(REMOTE_SERVER_URL)}`;
    mainWindow.loadFile('index.html', { query: { 
        user: steamUser.name, 
        id: steamUser.id, 
        avatar: steamUser.avatar,
        server: REMOTE_SERVER_URL
    }});

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        if (serverProcess) serverProcess.kill();
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});

app.on('will-quit', () => {
    if (serverProcess) serverProcess.kill();
});
