# Backend сервер для голосования на балу

## Установка

1. Установите Node.js (если ещё не установлен): https://nodejs.org/

2. Откройте терминал в папке `server` и выполните:
```bash
npm install
```

## Запуск локально

```bash
npm start
```

Сервер запустится на http://localhost:3000

## API Endpoints

- `GET /api/couples` - получить все пары
- `POST /api/vote/:id` - проголосовать за пару (id - номер пары)
- `GET /api/results-status` - получить статус видимости результатов
- `POST /api/results-status` - изменить видимость результатов (требуется пароль)
- `POST /api/reset` - сбросить все голоса (требуется пароль)
- `PUT /api/couples/:id` - обновить данные пары (требуется пароль)

## База данных

Все данные хранятся в файле `database.json`

## Деплой на сервер

### Вариант 1: Render.com (бесплатно)
1. Зарегистрируйтесь на https://render.com
2. Создайте новый Web Service
3. Подключите ваш GitHub репозиторий
4. Укажите папку `server`
5. Build Command: `npm install`
6. Start Command: `npm start`

### Вариант 2: Railway.app (бесплатно)
1. Зарегистрируйтесь на https://railway.app
2. Создайте новый проект
3. Deploy from GitHub
4. Выберите ваш репозиторий
5. Укажите Root Directory: `server`

После деплоя вы получите URL вашего сервера (например: https://your-app.onrender.com)
