const steamworks = require('steamworks.js');
try {
    const client = steamworks.init(4704280);
    console.log('Available properties on steamClient:');
    console.log(Object.keys(client));
    if (client.inventory) console.log('Inventory properties:', Object.keys(client.inventory));
} catch (e) {
    console.error('Test error:', e);
}
