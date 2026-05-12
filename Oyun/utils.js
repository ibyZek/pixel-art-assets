// Shared utilities for Pixelverse

// Rarity constants used across server.js, main.js, and script.js
const RARITY_CONFIG = {
    CopperLock:  { type: '1', defId: 100, name: 'Bakır Kilit' },
    SilverLock:  { type: '2', defId: 200, name: 'Gümüş Kilit' },
    GoldLock:    { type: '3', defId: 300, name: 'Altın Kilit' },
    DiamondLock: { type: '4', defId: 310, name: 'Elmas Kilit' },
    PlatinumLock:{ type: '5', defId: 320, name: 'Pırlanta Kilit' },
    CopperKey:   { type: '6', defId: 400, name: 'Bakır Anahtar' },
    SilverKey:   { type: '7', defId: 500, name: 'Gümüş Anahtar' },
    GoldKey:     { type: '8', defId: 600, name: 'Altın Anahtar' },
    DiamondKey:  { type: '9', defId: 700, name: 'Elmas Anahtar' },
    PlatinumKey: { type: '10', defId: 800, name: 'Pırlanta Anahtar' },
    Color:       { type: 'Color', defId: 1000, name: 'Nadir Renk' }
};

const RARITY_COLORS = {
    CopperLock:  '#cd7f32',
    SilverLock:  '#c0c0c0',
    GoldLock:    '#ffd700',
    DiamondLock: '#00ffff',
    PlatinumLock:'#e5e4e2',
    CopperKey:   '#4ae2ff', 
    SilverKey:   '#a34aff', 
    GoldKey:     '#ff4a4a',
    DiamondKey:  '#00ffff',
    PlatinumKey: '#e5e4e2', 
    Color:       '#ff00ff'
};

const GRID_DIMENSIONS = {
    WIDTH: 1360,
    HEIGHT: 768
};

const LOCK_GRID_SIZE = 10;

// Parse coordinate key "x-y" into [x, y]
function parseCoordKey(key) {
    const [x, y] = key.split('-').map(Number);
    return { x, y };
}

// Snap a world coordinate to grid
function snapToGrid(x, gridSize = LOCK_GRID_SIZE) {
    return Math.floor(x / gridSize) * gridSize;
}

// Convert screen coordinate to world coordinate
function screenToWorld(screenX, screenY, canvasWidth, canvasHeight, gridWidth, gridHeight, zoom, cameraX, cameraY, offsetX = 0, offsetY = 0) {
    return {
        x: Math.floor((screenX - offsetX - canvasWidth / 2) / zoom + gridWidth / 2 - cameraX),
        y: Math.floor((screenY - offsetY - canvasHeight / 2) / zoom + gridHeight / 2 - cameraY)
    };
}

// Get selection bounds from start and end points
function getSelectionBounds(start, end) {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    return {
        x,
        y,
        width: Math.abs(start.x - end.x) + 1,
        height: Math.abs(start.y - end.y) + 1
    };
}

// Safe JSON parse with default fallback
function safeJsonParse(data, defaultValue = null) {
    try {
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

// Format Turkish datetime
function formatTurkishDateTime(date = new Date()) {
    return {
        string: date.toLocaleString('tr-TR'),
        date: date.toLocaleDateString('tr-TR'),
        time: date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };
}

// Get rarity properties
function getRarityConfig(rarity) {
    return RARITY_CONFIG[rarity] || RARITY_CONFIG.CopperLock;
}

// Get rarity color
function getRarityColor(rarity) {
    return RARITY_COLORS[rarity] || RARITY_COLORS.CopperLock;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        RARITY_CONFIG,
        RARITY_COLORS,
        GRID_DIMENSIONS,
        LOCK_GRID_SIZE,
        parseCoordKey,
        snapToGrid,
        screenToWorld,
        getSelectionBounds,
        safeJsonParse,
        formatTurkishDateTime,
        getRarityConfig,
        getRarityColor
    };
} else {
    // Browser global
    window.PixelUtils = {
        RARITY_CONFIG,
        RARITY_COLORS,
        GRID_DIMENSIONS,
        LOCK_GRID_SIZE,
        parseCoordKey,
        snapToGrid,
        screenToWorld,
        getSelectionBounds,
        safeJsonParse,
        formatTurkishDateTime,
        getRarityConfig,
        getRarityColor
    };
}
