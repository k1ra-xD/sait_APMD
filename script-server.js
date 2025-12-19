// Конфигурация API
const API_URL = 'http://localhost:3000/api'; // При деплое замените на URL вашего сервера

// Данные пар
let couples = [];

// Загрузка данных с сервера
async function loadData() {
    try {
        const response = await fetch(`${API_URL}/couples`);
        if (response.ok) {
            couples = await response.json();
            renderCouples();
            checkResultsVisibility();
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        alert('Не удалось подключиться к серверу. Проверьте, что сервер запущен.');
    }
}

// Проверка видимости результатов
async function checkResultsVisibility() {
    try {
        const response = await fetch(`${API_URL}/results-status`);
        if (response.ok) {
            const data = await response.json();
            if (data.visible && !window.location.href.includes('results.html')) {
                window.location.href = 'results.html';
            }
        }
    } catch (error) {
        console.error('Ошибка проверки результатов:', error);
    }
}

// Голосование
async function vote(coupleId) {
    try {
        const response = await fetch(`${API_URL}/vote/${coupleId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Обновляем локальные данные
            const couple = couples.find(c => c.id === coupleId);
            if (couple) {
                couple.votes = data.couple.votes;
            }
            setVote(coupleId);
            renderCouples();
            showThankYouMessage();
        } else {
            alert('Ошибка при голосовании');
        }
    } catch (error) {
        console.error('Ошибка голосования:', error);
        alert('Не удалось проголосовать. Проверьте подключение к серверу.');
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

// Отрисовка пар
function renderCouples() {
    const grid = document.getElementById('couplesGrid');
    grid.innerHTML = '';

    const voted = hasVoted();
    const votedId = getVotedCoupleId();

    couples.forEach(couple => {
        const card = document.createElement('div');
        card.className = 'couple-card';
        
        if (voted && couple.id === votedId) {
            card.classList.add('voted');
        }

        card.innerHTML = `
            <div class="couple-image">
                <img src="${couple.image}" alt="${couple.name}" onerror="this.src='images/placeholder.jpg'">
            </div>
            <h3>${couple.name}</h3>
            <button onclick="showVoteConfirmation(${couple.id})" ${voted ? 'disabled' : ''}>
                ${voted && couple.id === votedId ? '✅ Вы проголосовали' : voted ? '🔒 Голос учтён' : '🗳️ Проголосовать'}
            </button>
        `;

        grid.appendChild(card);
    });
}

// Показать подтверждение голосования
function showVoteConfirmation(coupleId) {
    const couple = couples.find(c => c.id === coupleId);
    if (!couple) return;

    const modal = document.getElementById('confirmModal');
    const coupleName = document.getElementById('confirmCoupleName');
    const confirmBtn = document.getElementById('confirmVoteBtn');

    coupleName.textContent = couple.name;
    modal.style.display = 'flex';

    confirmBtn.onclick = () => {
        modal.style.display = 'none';
        vote(coupleId);
    };
}

// Закрыть модальное окно
function closeModal() {
    document.getElementById('confirmModal').style.display = 'none';
    document.getElementById('thankYouModal').style.display = 'none';
}

// Показать сообщение благодарности
function showThankYouMessage() {
    const modal = document.getElementById('thankYouModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.display = 'none';
    }, 3000);
}

// Таймер до конца голосования
function startTimer() {
    const timerElement = document.getElementById('timer');
    if (!timerElement) return;

    const endDate = new Date('2025-12-31T23:59:59');

    function updateTimer() {
        const now = new Date();
        const diff = endDate - now;

        if (diff <= 0) {
            timerElement.textContent = '⏰ Голосование завершено';
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        timerElement.textContent = `⏰ До конца голосования: ${days}д ${hours}ч ${minutes}м ${seconds}с`;
    }

    updateTimer();
    setInterval(updateTimer, 1000);
}

// Обновление счётчиков голосов (только для results.html)
function updateVoteCounts() {
    renderCouples();
}

// Периодическое обновление данных
setInterval(() => {
    loadData();
}, 5000); // Обновление каждые 5 секунд

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    startTimer();
    
    // Проверка результатов каждые 5 секунд
    setInterval(checkResultsVisibility, 5000);
});

// Закрытие модального окна при клике вне его
window.onclick = function(event) {
    const confirmModal = document.getElementById('confirmModal');
    const thankYouModal = document.getElementById('thankYouModal');
    
    if (event.target === confirmModal) {
        confirmModal.style.display = 'none';
    }
    if (event.target === thankYouModal) {
        thankYouModal.style.display = 'none';
    }
};
