const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(express.json());

// Функция чтения БД
function readDB() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Ошибка чтения БД:', error);
        return { couples: [], resultsVisible: false };
    }
}

// Функция записи в БД
function writeDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Ошибка записи в БД:', error);
        return false;
    }
}

// API Routes

// Получить все пары
app.get('/api/couples', (req, res) => {
    const db = readDB();
    res.json(db.couples);
});

// Проголосовать за пару
app.post('/api/vote/:id', (req, res) => {
    const coupleId = parseInt(req.params.id);
    const db = readDB();
    
    const couple = db.couples.find(c => c.id === coupleId);
    if (!couple) {
        return res.status(404).json({ error: 'Пара не найдена' });
    }
    
    couple.votes += 1;
    
    if (writeDB(db)) {
        res.json({ success: true, couple });
    } else {
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

// Получить статус видимости результатов
app.get('/api/results-status', (req, res) => {
    const db = readDB();
    res.json({ visible: db.resultsVisible });
});

// Установить видимость результатов (только для админа)
app.post('/api/results-status', (req, res) => {
    const { visible, password } = req.body;
    
    // Проверка пароля админа
    if (password !== 'admin2025') {
        return res.status(403).json({ error: 'Неверный пароль' });
    }
    
    const db = readDB();
    db.resultsVisible = visible;
    
    if (writeDB(db)) {
        res.json({ success: true, visible: db.resultsVisible });
    } else {
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

// Сбросить все голоса (только для админа)
app.post('/api/reset', (req, res) => {
    const { password } = req.body;
    
    if (password !== 'admin2025') {
        return res.status(403).json({ error: 'Неверный пароль' });
    }
    
    const db = readDB();
    db.couples.forEach(couple => couple.votes = 0);
    db.resultsVisible = false;
    
    if (writeDB(db)) {
        res.json({ success: true, message: 'Голоса сброшены' });
    } else {
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

// Обновить данные пары (только для админа)
app.put('/api/couples/:id', (req, res) => {
    const coupleId = parseInt(req.params.id);
    const { name, votes, password } = req.body;
    
    if (password !== 'admin2025') {
        return res.status(403).json({ error: 'Неверный пароль' });
    }
    
    const db = readDB();
    const couple = db.couples.find(c => c.id === coupleId);
    
    if (!couple) {
        return res.status(404).json({ error: 'Пара не найдена' });
    }
    
    if (name !== undefined) couple.name = name;
    if (votes !== undefined) couple.votes = votes;
    
    if (writeDB(db)) {
        res.json({ success: true, couple });
    } else {
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📊 База данных: ${DB_FILE}`);
});
