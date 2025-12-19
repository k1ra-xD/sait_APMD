// Данные пар (можно легко изменить через админ-панель)
let couples = [
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
];

// Загрузка данных из localStorage
function loadData() {
    const savedCouples = localStorage.getItem('ballCouples');
    if (savedCouples) {
        const saved = JSON.parse(savedCouples);
        // Обновляем изображения из дефолтных данных если их нет
        couples.forEach((defaultCouple, index) => {
            if (saved[index]) {
                saved[index].image = saved[index].image || defaultCouple.image;
            }
        });
        couples = saved;
    }
}

// Сохранение данных в localStorage
function saveData() {
    localStorage.setItem('ballCouples', JSON.stringify(couples));
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
                ${couple.image ? `<img src="${couple.image}" alt="${couple.name}" style="width: 100%; height: 100%; object-fit: cover;">` : '👫'}
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
        const couple = couples.find(c => c.id === selectedCoupleId);
        couple.votes++;
        saveData();
        setVote(selectedCoupleId);
        hideVoteModal();
        showThankYouModal();
        renderCouples();
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

// Проверка необходимости перехода на страницу результатов
function checkResultsVisibility() {
    const showResults = localStorage.getItem('showResults');
    
    // Автоматический переход на страницу результатов
    // Если значение не 'false' и не пустое - редиректим
    if (showResults && showResults !== 'false') {
        console.log('Редирект на результаты! showResults =', showResults);
        window.location.href = 'results.html';
    }
}

// Слушатель изменений localStorage для мгновенного редиректа (работает между вкладками)
window.addEventListener('storage', function(e) {
    if (e.key === 'showResults' && e.newValue && e.newValue !== 'false') {
        console.log('Storage event! Редирект на результаты');
        window.location.href = 'results.html';
    }
});

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    renderCouples();
    updateTimer();
    setInterval(updateTimer, 1000);
    checkResultsVisibility();
    
    // Обработчики модальных окон
    document.getElementById('confirmVote').addEventListener('click', confirmVote);
    document.getElementById('cancelVote').addEventListener('click', hideVoteModal);
    document.getElementById('closeThankYou').addEventListener('click', hideThankYouModal);
    
    // Закрытие модального окна по клику вне его
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
    
    // Очень частая проверка для быстрого редиректа (каждые 500мс)
    setInterval(() => {
        checkResultsVisibility();
    }, 500);
    
    // Периодическое обновление данных (на случай если голосуют с других устройств)
    setInterval(() => {
        loadData();
        updateVoteCounts();
    }, 3000);
});
