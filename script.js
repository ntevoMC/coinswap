// =============================================
// CoinSwap — ПОЛНЫЙ СКАМ-ОБМЕННИК
// =============================================

const STATE = {
    currentUser: null,
    users: [],
    transactions: [],
    prices: { BTC: 45000, ETH: 2800, USDT: 1, XRP: 0.6, SOL: 140 },
    chartData: [],
    chartInterval: null,
    priceInterval: null,
};

// ===== ИНИЦИАЛИЗАЦИЯ =====
function init() {
    loadData();
    if (STATE.users.length === 0) {
        createDefaultUsers();
        createDefaultTransactions();
    }
    renderAuth();
    bindAuthEvents();
    bindMainEvents();
    startPriceUpdates();
    startChartUpdates();
}

// ===== ЗАГРУЗКА / СОХРАНЕНИЕ =====
function loadData() {
    const saved = localStorage.getItem('coinswapData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            STATE.users = data.users || [];
            STATE.transactions = data.transactions || [];
            STATE.currentUser = data.currentUser || null;
            return;
        } catch (e) {}
    }
}

function saveData() {
    localStorage.setItem('coinswapData', JSON.stringify({
        users: STATE.users,
        transactions: STATE.transactions,
        currentUser: STATE.currentUser,
    }));
}

function createDefaultUsers() {
    STATE.users = [
        { id: 'admin_1', name: 'Admin', email: 'admin@admin.com', password: 'admin123', balances: { BTC: 10, ETH: 50, USDT: 50000, XRP: 1000, SOL: 200 }, isBlocked: false, isAdmin: true, registeredAt: new Date().toISOString() },
        { id: 'user_1', name: 'Alex', email: 'alex@mail.com', password: '123456', balances: { BTC: 0.05, ETH: 0.5, USDT: 1000, XRP: 0, SOL: 0 }, isBlocked: false, isAdmin: false, registeredAt: new Date().toISOString() },
        { id: 'user_2', name: 'Maria', email: 'maria@mail.com', password: '123456', balances: { BTC: 0.1, ETH: 1.2, USDT: 500, XRP: 10, SOL: 2 }, isBlocked: false, isAdmin: false, registeredAt: new Date().toISOString() },
        { id: 'user_3', name: 'John', email: 'john@mail.com', password: '123456', balances: { BTC: 0.02, ETH: 0.3, USDT: 200, XRP: 5, SOL: 0.5 }, isBlocked: false, isAdmin: false, registeredAt: new Date().toISOString() },
    ];
    saveData();
}

function createDefaultTransactions() {
    const now = new Date();
    const txs = [];
    const users = STATE.users;
    for (let i = 0; i < 30; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const types = ['Пополнение', 'Обмен', 'Вывод', 'Списание'];
        const type = types[Math.floor(Math.random() * types.length)];
        const currencies = ['BTC', 'ETH', 'USDT', 'XRP', 'SOL'];
        const currency = currencies[Math.floor(Math.random() * currencies.length)];
        const amount = (Math.random() * 1000 + 1).toFixed(2);
        const statuses = ['Успешно', 'В обработке', 'Успешно'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const d = new Date(now);
        d.setHours(d.getHours() - Math.floor(Math.random() * 72));
        txs.push({
            id: 'tx_' + Date.now() + '_' + i,
            userId: user.id,
            type: type,
            amount: parseFloat(amount),
            currency: currency,
            to: type === 'Вывод' ? '0x' + Math.random().toString(36).slice(2, 20) : (type === 'Пополнение' ? 'Пополнение' : user.name),
            status: status,
            timestamp: d.toISOString(),
        });
    }
    STATE.transactions = txs;
    saveData();
}

// ===== АВТОРИЗАЦИЯ =====
function renderAuth() {
    if (STATE.currentUser) {
        document.getElementById('authPage').classList.add('hidden');
        document.getElementById('mainPage').classList.remove('hidden');
        renderMain();
    } else {
        document.getElementById('authPage').classList.remove('hidden');
        document.getElementById('mainPage').classList.add('hidden');
    }
}

function bindAuthEvents() {
    document.getElementById('loginBtn').addEventListener('click', doLogin);
    document.getElementById('registerBtn').addEventListener('click', doRegister);
    document.getElementById('resetBtn').addEventListener('click', doReset);
    document.getElementById('showRegister').addEventListener('click', e => { e.preventDefault(); showAuthForm('register'); });
    document.getElementById('showLogin').addEventListener('click', e => { e.preventDefault(); showAuthForm('login'); });
    document.getElementById('showReset').addEventListener('click', e => { e.preventDefault(); showAuthForm('reset'); });
    document.getElementById('showLoginFromReset').addEventListener('click', e => { e.preventDefault(); showAuthForm('login'); });
    ['loginEmail','loginPassword'].forEach(id => {
        document.getElementById(id).addEventListener('keyup', e => { if (e.key === 'Enter') doLogin(); });
    });
    ['regName','regEmail','regPassword','regPasswordConfirm'].forEach(id => {
        document.getElementById(id).addEventListener('keyup', e => { if (e.key === 'Enter') doRegister(); });
    });
}

function showAuthForm(form) {
    document.getElementById('loginForm').classList.toggle('hidden', form !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', form !== 'register');
    document.getElementById('resetForm').classList.toggle('hidden', form !== 'reset');
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('regError').classList.add('hidden');
    document.getElementById('resetError').classList.add('hidden');
    document.getElementById('resetSuccess').classList.add('hidden');
}

function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');
    const user = STATE.users.find(u => u.email === email && u.password === password);
    if (!user) {
        errorEl.textContent = 'Неверный email или пароль';
        errorEl.classList.remove('hidden');
        return;
    }
    if (user.isBlocked) {
        errorEl.textContent = 'Ваш аккаунт заблокирован';
        errorEl.classList.remove('hidden');
        return;
    }
    errorEl.classList.add('hidden');
    STATE.currentUser = user;
    saveData();
    renderAuth();
}

function doRegister() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regPasswordConfirm').value;
    const errorEl = document.getElementById('regError');
    if (!name || !email || !password || !confirm) {
        errorEl.textContent = 'Заполните все поля';
        errorEl.classList.remove('hidden');
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'Пароль должен быть не менее 6 символов';
        errorEl.classList.remove('hidden');
        return;
    }
    if (password !== confirm) {
        errorEl.textContent = 'Пароли не совпадают';
        errorEl.classList.remove('hidden');
        return;
    }
    if (STATE.users.find(u => u.email === email)) {
        errorEl.textContent = 'Пользователь с таким email уже существует';
        errorEl.classList.remove('hidden');
        return;
    }
    errorEl.classList.add('hidden');
    const newUser = {
        id: 'user_' + Date.now(),
        name: name,
        email: email,
        password: password,
        balances: { BTC: 0, ETH: 0, USDT: 0, XRP: 0, SOL: 0 },
        isBlocked: false,
        isAdmin: false,
        registeredAt: new Date().toISOString(),
    };
    STATE.users.push(newUser);
    saveData();
    alert('Аккаунт создан! Теперь войдите.');
    showAuthForm('login');
    document.getElementById('loginEmail').value = email;
    document.getElementById('loginPassword').value = '';
}

function doReset() {
    const email = document.getElementById('resetEmail').value.trim();
    const errorEl = document.getElementById('resetError');
    const successEl = document.getElementById('resetSuccess');
    if (!email) {
        errorEl.textContent = 'Введите email';
        errorEl.classList.remove('hidden');
        return;
    }
    const user = STATE.users.find(u => u.email === email);
    if (!user) {
        errorEl.textContent = 'Пользователь не найден';
        errorEl.classList.remove('hidden');
        return;
    }
    errorEl.classList.add('hidden');
    successEl.textContent = 'Инструкция по восстановлению отправлена на ' + email;
    successEl.classList.remove('hidden');
    console.log('[RESET] Инструкция для:', email);
}

function doLogout() {
    STATE.currentUser = null;
    saveData();
    renderAuth();
    clearIntervals();
}

// ===== ОСНОВНОЙ ИНТЕРФЕЙС =====
function renderMain() {
    const user = STATE.currentUser;
    if (!user) return;
    document.getElementById('userNameDisplay').textContent = user.name;
    document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('welcomeMessage').textContent = 'Добро пожаловать, ' + user.name + '!';
    updateBalances();
    renderDashboard();
    renderWallet();
    renderHistory();
    renderAdmin();
    updateNav();
}

function updateBalances() {
    const user = STATE.currentUser;
    if (!user) return;
    const total = Object.keys(user.balances).reduce((sum, key) => {
        return sum + (user.balances[key] || 0) * (STATE.prices[key] || 0);
    }, 0);
    document.getElementById('totalBalance').textContent = '$' + total.toFixed(2);
    document.getElementById('headerBalance').textContent = '$' + total.toFixed(2);
}

function renderDashboard() {
    const user = STATE.currentUser;
    if (!user) return;
    // Баланс
    const list = document.getElementById('balanceList');
    list.innerHTML = Object.keys(user.balances).map(key => `
        <div class="balance-row">
            <span>${key}</span>
            <span>${user.balances[key].toFixed(4)} ≈ $${(user.balances[key] * STATE.prices[key]).toFixed(2)}</span>
        </div>
    `).join('');

    // Последние 5 транзакций
    const txs = getTransactionsForUser(user.id).slice(0, 5);
    const tbody = document.getElementById('recentTransactions');
    if (txs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#8895aa;">Нет транзакций</td></tr>';
    } else {
        tbody.innerHTML = txs.map(tx => `
            <tr>
                <td>${tx.type}</td>
                <td>${tx.amount}</td>
                <td>${tx.currency}</td>
                <td class="status
