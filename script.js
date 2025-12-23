// Конфигурация API - автоматически определяет правильный адрес
const API_URL = window.location.port 
    ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}/api`
    : `${window.location.protocol}//${window.location.hostname}/api`;

// Константы
const POLL_INTERVAL_MS = 5000;
const VISIBILITY_CHECK_INTERVAL_MS = 2000;
const TIMER_UPDATE_INTERVAL_MS = 1000;

console.log('🔗 API URL:', API_URL);

// Данные пар
let couples = [];
let isLoading = false;
let prevMetaHash = '';
let prevVotesHash = '';

// Утилиты для loading состояния
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('active');
}

// Показать skeleton карточки во время загрузки
function showSkeletonCards() {
    const grid = document.getElementById('couplesGrid');
    grid.innerHTML = '';
    
    for (let i = 0; i < 6; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'couple-card skeleton';
        skeleton.innerHTML = `
            <div class="couple-image"></div>
            <div class="couple-info">
                <div class="couple-number">Загрузка...</div>
                <div class="couple-name">Загрузка данных...</div>
                <button class="btn-vote" disabled>Загрузка...</button>
            </div>
        `;
        grid.appendChild(skeleton);
    }
}

// Загрузка данных с сервера
async function loadData() {
    if (isLoading) return;
    
    try {
        isLoading = true;
        const response = await fetch(`${API_URL}/data`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();

        // Отладка: выводим, сколько пар пришло с сервера
        console.log('[loadData] Получено пар:', Array.isArray(data.couples) ? data.couples.length : 'нет массива', data.couples);

        // Проверяем timestamp последнего сброса
        const lastReset = data.lastReset || 0;
        const lastKnownReset = parseInt(localStorage.getItem('lastKnownReset') || '0');

        if (lastReset > lastKnownReset) {
            // Был сброс - очищаем localStorage
            localStorage.removeItem('hasVoted');
            localStorage.removeItem('votedCoupleId');
            localStorage.setItem('lastKnownReset', lastReset.toString());
            console.log('🔄 Голоса сброшены - можете голосовать снова!');
            showNotification('Голосование сброшено! Вы можете проголосовать снова', 'info');
        }

        // Compute hashes to avoid full re-render on every poll
        const metaHash = data.couples.map(c => `${c.id}:${c.name}:${c.image}`).join('|');
        const votesHash = data.couples.map(c => `${c.id}:${c.votes}`).join('|');

        // First load or metadata changed -> full render
        if (!prevMetaHash || prevMetaHash !== metaHash) {
            prevMetaHash = metaHash;
            prevVotesHash = votesHash;
            couples = data.couples;
            console.log('[renderCouples] Перед рендером, пар:', couples.length, couples);
            renderCouples();
        } else if (prevVotesHash !== votesHash) {
            // Only votes changed -> update counters in place
            prevVotesHash = votesHash;
            couples = data.couples;
            updateVoteCounts();
        } else {
            // No visible changes
            couples = data.couples;
        }
        checkResultsVisibility();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showError('Не удалось загрузить данные. Проверьте подключение к серверу.');
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Сохранение данных на сервер (голосование)
async function saveVote(coupleId) {
    try {
        showLoading();

        const response = await fetch(`${API_URL}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coupleId })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            await loadData(); // Перезагружаем данные
            // Доп. защита: если после loadData() массив пар некорректный, пробуем ещё раз
            if (!Array.isArray(couples) || couples.length < 10) {
                console.warn('[saveVote] Массив пар после голосования подозрительно мал, повторная загрузка...');
                await loadData();
            }
            createConfetti(); // Конфетти при успешном голосовании
        }

        return data.success;
    } catch (error) {
        console.error('❌ Ошибка голосования:', error);
        showError('Не удалось зарегистрировать голос. Попробуйте снова.');
        return false;
    } finally {
        hideLoading();
    }
}

// Проверка видимости результатов
async function checkResultsVisibility() {
    try {
        const response = await fetch(`${API_URL}/data`);
        if (!response.ok) return;
        
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

    // Отладка: выводим массив couples
    console.log('[renderCouples] couples:', couples);
    if (!Array.isArray(couples) || couples.length === 0) {
        const msg = document.createElement('div');
        msg.textContent = 'Нет данных для отображения пар.';
        msg.style.color = 'red';
        grid.appendChild(msg);
        return;
    }

    couples.forEach(couple => {
        // Защита: если нет id или name, не рендерим карточку
        if (!couple || typeof couple.id === 'undefined' || !couple.name) {
            console.warn('Пропущена некорректная пара:', couple);
            return;
        }
        const card = document.createElement('div');
        card.className = 'couple-card';
        card.setAttribute('role', 'listitem');

        if (voted && couple.id === votedId) {
            card.classList.add('voted');
        }

        const isVotedCard = voted && couple.id === votedId;
        const buttonText = isVotedCard ? '✓ Вы проголосовали' : 
                          voted ? 'Голосование закрыто' : 
                          '💖 Проголосовать';

        card.innerHTML = `
            ${isVotedCard ? '<div class="voted-badge" aria-label="Вы проголосовали">✓ Ваш голос</div>' : ''}
            <div class="couple-image">
                ${couple.image ? `<img src="${couple.image}" alt="${couple.name}" loading="lazy">` : '👫'}
            </div>
            <div class="couple-info">
                <div class="couple-number">Участник ${couple.id}</div>
                <div class="couple-name">${escapeHtml(couple.name)}</div>
                <div class="vote-count" id="votes-${couple.id}">Голосов: ${couple.votes}</div>
                <button class="btn-vote" 
                        data-id="${couple.id}" 
                        ${voted ? 'disabled' : ''}
                        aria-label="Проголосовать за ${couple.name}">
                    ${buttonText}
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

// Защита от XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Модальное окно подтверждения
let selectedCoupleId = null;

function showVoteModal(coupleId) {
    selectedCoupleId = coupleId;
    const couple = couples.find(c => c.id === coupleId);
    document.getElementById('coupleName').textContent = couple.name;
    
    const modal = document.getElementById('voteModal');
    modal.classList.add('active');
    
    // Focus trap
    const confirmBtn = document.getElementById('confirmVote');
    if (confirmBtn) confirmBtn.focus();
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
            }
        });
    }
}

function showThankYouModal() {
    const modal = document.getElementById('thankYouModal');
    modal.classList.add('active');
    
    const closeBtn = document.getElementById('closeThankYou');
    if (closeBtn) closeBtn.focus();
}

function hideThankYouModal() {
    document.getElementById('thankYouModal').classList.remove('active');
}

// Уведомления (вместо alert)
function showNotification(message, type = 'info') {
    // Простое уведомление в консоли
    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${icon} ${message}`);
}

function showError(message) {
    showNotification(message, 'error');
    // Можно добавить toast уведомления
}

// Confetti эффект при голосовании
function createConfetti() {
    const colors = ['#FFD700', '#8B0000', '#DAA520', '#F5DEB3'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background-color: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}%;
                top: -10px;
                opacity: 1;
                transform: rotate(${Math.random() * 360}deg);
                pointer-events: none;
                z-index: 9999;
            `;
            
            document.body.appendChild(confetti);
            
            const fall = confetti.animate([
                { transform: `translateY(0) rotate(0deg)`, opacity: 1 },
                { transform: `translateY(${window.innerHeight + 20}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
            ], {
                duration: 3000 + Math.random() * 2000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
            
            fall.onfinish = () => confetti.remove();
        }, i * 30);
    }
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
    // Показываем skeleton при первой загрузке
    showSkeletonCards();
    
    // Загружаем данные
    loadData();
    updateTimer();
    checkResultsVisibility();
    
    // Периодические обновления
    setInterval(loadData, POLL_INTERVAL_MS);
    setInterval(updateTimer, TIMER_UPDATE_INTERVAL_MS);
    setInterval(checkResultsVisibility, VISIBILITY_CHECK_INTERVAL_MS);
    
    // Обработчики модальных окон
    const confirmBtn = document.getElementById('confirmVote');
    const cancelBtn = document.getElementById('cancelVote');
    const closeBtn = document.getElementById('closeThankYou');
    const closeVoteX = document.getElementById('closeVoteModal');
    const closeThankYouX = document.getElementById('closeThankYouX');
    
    if (confirmBtn) confirmBtn.addEventListener('click', confirmVote);
    if (cancelBtn) cancelBtn.addEventListener('click', hideVoteModal);
    if (closeBtn) closeBtn.addEventListener('click', hideThankYouModal);
    if (closeVoteX) closeVoteX.addEventListener('click', hideVoteModal);
    if (closeThankYouX) closeThankYouX.addEventListener('click', hideThankYouModal);
    
    // Закрытие модального окна по клику вне его
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
    
    // Закрытие модалок по ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideVoteModal();
            hideThankYouModal();
        }
    });
});
 
