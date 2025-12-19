const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Путь к файлу базы данных
const DB_FILE = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Раздача статических файлов (HTML, CSS, JS)

// Инициализация БД
function initDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            couples: [
                { id: 1, name: "Пара №1", image: "Photo_utch/1.jpg", votes: 0 },
                { id: 2, name: "Пара №2", image: "Photo_utch/2.webp", votes: 0 },
                { id: 3, name: "Пара №3", image: "Photo_utch/3.webp", votes: 0 },
                { id: 4, name: "Пара №4", image: "Photo_utch/4.webp", votes: 0 },
                { id: 5, name: "Пара №5", image: "Photo_utch/5.webp", votes: 0 },
                { id: 6, name: "Пара №6", image: "Photo_utch/6.webp", votes: 0 },
                { id: 7, name: "Пара №7", image: "Photo_utch/7.webp", votes: 0 },
                { id: 8, name: "Пара №8", image: "Photo_utch/8.webp", votes: 0 },
                { id: 9, name: "Пара №9", image: "Photo_utch/9.webp", votes: 0 },
                { id: 10, name: "Пара №10", image: "Photo_utch/10.webp", votes: 0 },
                { id: 11, name: "Пара №11", image: "Photo_utch/11.webp", votes: 0 },
                { id: 12, name: "Пара №12", image: "Photo_utch/12.webp", votes: 0 },
                { id: 13, name: "Пара №13", image: "Photo_utch/13.webp", votes: 0 },
                { id: 14, name: "Пара №14", image: "Photo_utch/14.webp", votes: 0 },
                { id: 15, name: "Пара №15", image: "Photo_utch/15.webp", votes: 0 }
            ],
            resultsVisible: false
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        console.log('✅ База данных создана: database.json');
    }
}

// Чтение БД
function readDB() {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
}

// Запись в БД
function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// API endpoints

// Получить все данные
app.get('/api/data', (req, res) => {
    const data = readDB();
    res.json(data);
});

// Получить пары
app.get('/api/couples', (req, res) => {
    const data = readDB();
    res.json(data.couples);
});

// Проголосовать
app.post('/api/vote', (req, res) => {
    const { coupleId } = req.body;
    
    if (!coupleId) {
        return res.status(400).json({ error: 'Не указан ID пары' });
    }
    
    const data = readDB();
    const couple = data.couples.find(c => c.id === coupleId);
    
    if (!couple) {
        return res.status(404).json({ error: 'Пара не найдена' });
    }
    
    couple.votes++;
    writeDB(data);
    
    res.json({ success: true, couple });
});

// Сбросить голоса (для админа)
app.post('/api/reset', (req, res) => {
    const data = readDB();
    data.couples.forEach(c => c.votes = 0);
    data.lastReset = Date.now(); // Добавляем timestamp сброса
    writeDB(data);
    res.json({ success: true, lastReset: data.lastReset });
});

// Показать/скрыть результаты
app.post('/api/toggle-results', (req, res) => {
    const data = readDB();
    data.resultsVisible = !data.resultsVisible;
    writeDB(data);
    res.json({ resultsVisible: data.resultsVisible });
});

// Получить статус видимости результатов
app.get('/api/results-status', (req, res) => {
    const data = readDB();
    res.json({ resultsVisible: data.resultsVisible });
});

// Обновить данные пар (для админа)
app.put('/api/couples', (req, res) => {
    const updatedCouples = req.body;
    
    if (!Array.isArray(updatedCouples)) {
        return res.status(400).json({ error: 'Неверный формат данных' });
    }
    
    const data = readDB();
    data.couples = updatedCouples;
    writeDB(data);
    
    res.json({ success: true, couples: data.couples });
});

// Запуск сервера
initDatabase();

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
║   База данных: database.json               ║
╚════════════════════════════════════════════╝
    `);
});
