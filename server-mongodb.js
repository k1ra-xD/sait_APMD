const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bal-voting';
const FILE_DB = path.join(__dirname, 'database.json');
let useFileDb = false;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// MongoDB Schema
const CoupleSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    votes: { type: Number, default: 0 }
});

const SettingsSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed
});

const Couple = mongoose.model('Couple', CoupleSchema);
const Settings = mongoose.model('Settings', SettingsSchema);

// Helpers for file DB
function readFileDb() {
    try {
        const data = fs.readFileSync(FILE_DB, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return { couples: [], resultsVisible: false, lastReset: 0 };
    }
}

function writeFileDb(obj) {
    fs.writeFileSync(FILE_DB, JSON.stringify(obj, null, 2), 'utf-8');
}

async function initFileDb() {
    let db = readFileDb();
    if (!Array.isArray(db.couples) || db.couples.length === 0) {
        db.couples = [];
        for (let i = 1; i <= 15; i++) {
            db.couples.push({
                id: i,
                name: `Пара №${i}`,
                image: i === 1 ? 'Photo_utch/1.jpg' : `Photo_utch/${i}.webp`,
                votes: 0
            });
        }
    }
    if (typeof db.resultsVisible === 'undefined') db.resultsVisible = false;
    if (typeof db.lastReset === 'undefined') db.lastReset = 0;
    writeFileDb(db);
    console.log('✅ Локальная file-DB инициализирована (database.json)');
}

// Подключение к MongoDB с fallback на файл
mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('✅ MongoDB подключена');
        await initDatabase();
    })
    .catch(async (err) => {
        console.error('⚠️ Не удалось подключиться к MongoDB, переключаемся на database.json:', err.message);
        useFileDb = true;
        await initFileDb();
    });

// Инициализация MongoDB (если используется Mongo)
async function initDatabase() {
    if (useFileDb) return;
    try {
        const count = await Couple.countDocuments();
        
        if (count === 0) {
            const couples = [];
            for (let i = 1; i <= 15; i++) {
                couples.push({
                    id: i,
                    name: `Пара №${i}`,
                    image: i === 1 ? 'Photo_utch/1.jpg' : `Photo_utch/${i}.webp`,
                    votes: 0
                });
            }
            
            await Couple.insertMany(couples);
            console.log('✅ База данных инициализирована с 15 парами');
        }

        // Инициализация настроек
        const resultsVisible = await Settings.findOne({ key: 'resultsVisible' });
        if (!resultsVisible) {
            await Settings.create({ key: 'resultsVisible', value: false });
        }

        const lastReset = await Settings.findOne({ key: 'lastReset' });
        if (!lastReset) {
            await Settings.create({ key: 'lastReset', value: 0 });
        }
    } catch (error) {
        console.error('Ошибка инициализации MongoDB:', error);
    }
}

// API endpoints

// Получить все данные
app.get('/api/data', async (req, res) => {
    try {
        if (useFileDb) {
            const db = readFileDb();
            const couples = (db.couples || []).slice().sort((a, b) => a.id - b.id);
            return res.json({ couples, resultsVisible: db.resultsVisible || false, lastReset: db.lastReset || 0 });
        }

        const couples = await Couple.find().sort({ id: 1 });
        const resultsVisible = await Settings.findOne({ key: 'resultsVisible' });
        const lastReset = await Settings.findOne({ key: 'lastReset' });
        
        res.json({
            couples,
            resultsVisible: resultsVisible?.value || false,
            lastReset: lastReset?.value || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить пары
app.get('/api/couples', async (req, res) => {
    try {
        if (useFileDb) {
            const db = readFileDb();
            const couples = (db.couples || []).slice().sort((a, b) => a.id - b.id);
            return res.json(couples);
        }

        const couples = await Couple.find().sort({ id: 1 });
        res.json(couples);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Проголосовать
app.post('/api/vote', async (req, res) => {
    try {
        const { coupleId } = req.body;
        
        if (!coupleId) {
            return res.status(400).json({ error: 'Не указан ID пары' });
        }
        if (useFileDb) {
            const db = readFileDb();
            const idx = (db.couples || []).findIndex(c => c.id === Number(coupleId));
            if (idx === -1) return res.status(404).json({ error: 'Пара не найдена' });
            db.couples[idx].votes = (db.couples[idx].votes || 0) + 1;
            writeFileDb(db);
            return res.json({ success: true, couple: db.couples[idx] });
        }

        const couple = await Couple.findOneAndUpdate(
            { id: coupleId },
            { $inc: { votes: 1 } },
            { new: true }
        );
        
        if (!couple) {
            return res.status(404).json({ error: 'Пара не найдена' });
        }
        
        res.json({ success: true, couple });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Сбросить голоса (для админа)
app.post('/api/reset', async (req, res) => {
    try {
        if (useFileDb) {
            const db = readFileDb();
            db.couples = (db.couples || []).map(c => ({ ...c, votes: 0 }));
            const timestamp = Date.now();
            db.lastReset = timestamp;
            writeFileDb(db);
            return res.json({ success: true, lastReset: timestamp });
        }

        await Couple.updateMany({}, { votes: 0 });
        
        const timestamp = Date.now();
        await Settings.findOneAndUpdate(
            { key: 'lastReset' },
            { value: timestamp },
            { upsert: true }
        );
        
        res.json({ success: true, lastReset: timestamp });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Показать/скрыть результаты
app.post('/api/toggle-results', async (req, res) => {
    try {
        if (useFileDb) {
            const db = readFileDb();
            db.resultsVisible = !db.resultsVisible;
            writeFileDb(db);
            return res.json({ resultsVisible: db.resultsVisible });
        }

        const current = await Settings.findOne({ key: 'resultsVisible' });
        const newValue = !current?.value;
        
        await Settings.findOneAndUpdate(
            { key: 'resultsVisible' },
            { value: newValue },
            { upsert: true }
        );
        
        res.json({ resultsVisible: newValue });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить статус видимости результатов
app.get('/api/results-status', async (req, res) => {
    try {
        if (useFileDb) {
            const db = readFileDb();
            return res.json({ resultsVisible: db.resultsVisible || false });
        }

        const setting = await Settings.findOne({ key: 'resultsVisible' });
        res.json({ resultsVisible: setting?.value || false });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Обновить данные пар (для админа)
app.put('/api/couples', async (req, res) => {
    try {
        const updatedCouples = req.body;
        
        if (!Array.isArray(updatedCouples)) {
            return res.status(400).json({ error: 'Неверный формат данных' });
        }
        if (useFileDb) {
            const db = readFileDb();
            for (const couple of updatedCouples) {
                const idx = (db.couples || []).findIndex(c => c.id === Number(couple.id));
                if (idx !== -1) {
                    db.couples[idx].name = couple.name;
                    db.couples[idx].image = couple.image;
                }
            }
            writeFileDb(db);
            const couples = (db.couples || []).slice().sort((a, b) => a.id - b.id);
            return res.json({ success: true, couples });
        }

        for (const couple of updatedCouples) {
            await Couple.findOneAndUpdate(
                { id: couple.id },
                { name: couple.name, image: couple.image },
                { upsert: false }
            );
        }
        
        const couples = await Couple.find().sort({ id: 1 });
        res.json({ success: true, couples });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получаем локальный IP адрес
const os = require('os');
const networkInterfaces = os.networkInterfaces();
let localIP = 'localhost';

for (const name of Object.keys(networkInterfaces)) {
    for (const iface of networkInterfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
            localIP = iface.address;
            break;
        }
    }
}

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════╗
║   🎭 Сервер голосования запущен!          ║
║                                            ║
║   На этом ПК:     http://localhost:${PORT}
║   С телефонов:    http://${localIP}:${PORT}
║                                            ║
║   Админка:    /admin.html                  ║
║   Результаты: /results.html                ║
║                                            ║
║   База данных: MongoDB / database.json     ║
╚════════════════════════════════════════════╝
    `);
});

// Debug-эндпоинт: возвращает количество документов и примерные данные (временно)
app.get('/api/debug', async (req, res) => {
    try {
        if (useFileDb) {
            const db = readFileDb();
            const count = (db.couples || []).length;
            const sample = (db.couples || []).slice(0, 5);
            const settings = { resultsVisible: db.resultsVisible, lastReset: db.lastReset };
            return res.json({ count, sample, settings });
        }

        const count = await Couple.countDocuments();
        const sample = await Couple.find().sort({ id: 1 }).limit(5);
        const settings = await Settings.find();

        res.json({ count, sample, settings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
