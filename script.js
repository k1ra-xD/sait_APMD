// Конфигурация API - автоматически определяет правильный адрес
const API_URL = window.location.port 
    ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}/api`
    : `${window.location.protocol}//${window.location.hostname}/api`;

console.log('🔗 API URL:', API_URL);

// Данные пар
let couples = [];

// Загрузка данных с сервера
async function loadData() {
    try {
        const response = await fetch(`${API_URL}/data`);
        const data = await response.json();
        
        // Проверяем timestamp последнего сброса
        const lastReset = data.lastReset || 0;
        const lastKnownReset = parseInt(localStorage.getItem('lastKnownReset') || '0');
        
        if (lastReset > lastKnownReset) {
            // Был сброс - очищаем localStorage
            localStorage.removeItem('hasVoted');
            localStorage.removeItem('votedCoupleId');
            localStorage.setItem('lastKnownReset', lastReset.toString());
            console.log('🔄 Голоса сброшены - можете голосовать снова!');
        }
        
        couples = data.couples;
        renderCouples();
        checkResultsVisibility();
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        console.log('⚠️ Убедитесь, что сервер запущен: npm start');
    }
}

// Сохранение данных на сервер (голосование)
async function saveVote(coupleId) {
    try {
        const response = await fetch(`${API_URL}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coupleId })
        });
        
        const data = await response.json();
        if (data.success) {
            await loadData(); // Перезагружаем данные
        }
        return data.success;
    } catch (error) {
        console.error('❌ Ошибка голосования:', error);
        return false;
    }
}

// Проверка видимости результатов
async function checkResultsVisibility() {
    try {
        const response = await fetch(`${API_URL}/data`);
        const data = await response.json();
        
        if (data.resultsVisible && !window.location.href.includes('results.html')) {
            window.location.href = 'results.html';
        }
    } catch (error) {
        console.error('Ошибка проверки результатов:', error);
    }
}

// Проверка, проголосовал ли пользователь
function hasVoted() {
    return localStorage.getItem('hasVoted') === 'true';
}

// Получить ID проголосованной пары
function getVotedCoupleId() {
    return parseInt(localStorage.getItem('votedCoupleId'));
}

// Установить голос
function setVote(coupleId) {
    localStorage.setItem('hasVoted', 'true');
    localStorage.setItem('votedCoupleId', coupleId.toString());
}

// Отображение пар
function renderCouples() {
    const grid = document.getElementById('couplesGrid');
    grid.innerHTML = '';
    
    const votedId = getVotedCoupleId();
    const voted = hasVoted();
    
    couples.forEach(couple => {
        const card = document.createElement('div');
        card.className = 'couple-card';
        
        if (voted && couple.id === votedId) {
            card.classList.add('voted');
        }
        
        card.innerHTML = `
            ${voted && couple.id === votedId ? '<div class="voted-badge">✓ Ваш голос</div>' : ''}
            <div class="couple-image">
                ${couple.image ? '<img src="' + couple.image + '" alt="' + couple.name + '" style="width: 100%; height: 100%; object-fit: cover;">' : '👫'}
            </div>
            <div class="couple-info">
                <div class="couple-number">Участник ${couple.id}</div>
                <div class="couple-name">${couple.name}</div>
                <button class="btn-vote" 
                        data-id="${couple.id}" 
                        ${voted ? 'disabled' : ''}>
                    ${voted && couple.id === votedId ? 'Вы проголосовали' : voted ? 'Голосование закрыто' : '💖 Проголосовать'}
                </button>
            </div>
        `;
        
        grid.appendChild(card);
    });
    
    // Добавляем обработчики кнопок
    document.querySelectorAll('.btn-vote').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!hasVoted()) {
                showVoteModal(parseInt(this.dataset.id));
            }
        });
    });
}

// Модальное окно подтверждения
let selectedCoupleId = null;

function showVoteModal(coupleId) {
    selectedCoupleId = coupleId;
    const couple = couples.find(c => c.id === coupleId);
    document.getElementById('coupleName').textContent = couple.name;
    document.getElementById('voteModal').classList.add('active');
}

function hideVoteModal() {
    document.getElementById('voteModal').classList.remove('active');
    selectedCoupleId = null;
}

function confirmVote() {
    if (selectedCoupleId !== null) {
        saveVote(selectedCoupleId).then(success => {
            if (success) {
                setVote(selectedCoupleId);
                hideVoteModal();
                showThankYouModal();
                renderCouples();
            } else {
                alert('Ошибка голосования. Проверьте подключение к серверу.');
            }
        });
    }
}

function showThankYouModal() {
    document.getElementById('thankYouModal').classList.add('active');
}

function hideThankYouModal() {
    document.getElementById('thankYouModal').classList.remove('active');
}

// Таймер (опционально - показывает время до конца бала)
function updateTimer() {
    const timer = document.getElementById('timer');
    if (timer) {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        timer.textContent = `🕐 Текущее время: ${hours}:${minutes}:${seconds}`;
    }
}

// Обновление счётчиков голосов в реальном времени
function updateVoteCounts() {
    couples.forEach(couple => {
        const voteElement = document.getElementById(`votes-${couple.id}`);
        if (voteElement) {
            voteElement.textContent = couple.votes;
        }
    });
}

// Проверка видимости результатов
async function checkResultsVisibility() {
    try {
        const response = await fetch(`${API_URL}/data`);
        const data = await response.json();
        
        if (data.resultsVisible && !window.location.href.includes('results.html')) {
            window.location.href = 'results.html';
        }
    } catch (error) {
        console.error('Ошибка проверки результатов:', error);
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    updateTimer();
    checkResultsVisibility();
    setInterval(loadData, 5000); // Обновление данных каждые 5 секунд
    setInterval(updateTimer, 1000);
    setInterval(checkResultsVisibility, 2000); // Проверка результатов каждые 2 секунды
    
    // Обработчики модальных окон
    const confirmBtn = document.getElementById('confirmVote');
    const cancelBtn = document.getElementById('cancelVote');
    const closeBtn = document.getElementById('closeThankYou');
    
    if (confirmBtn) confirmBtn.addEventListener('click', confirmVote);
    if (cancelBtn) cancelBtn.addEventListener('click', hideVoteModal);
    if (closeBtn) closeBtn.addEventListener('click', hideThankYouModal);
    
    // Закрытие модального окна по клику вне его
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
});
