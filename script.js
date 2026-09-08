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

function getUserByEmail(email) {
    return STATE.users.find(u => u.email === email);
}

function getUserById(id) {
    return STATE.users.find(u => u.id === id);
}

function getTransactionsForUser(userId) {
    return STATE.transactions.filter(tx => tx.userId === userId);
}

// ===== СОЗДАНИЕ ДЕФОЛТНЫХ ДАННЫХ =====
function createDefaultData() {
    STATE.users = [
        { id: 'admin_1', name: 'Admin', email: 'admin@admin.com', password: 'admin123', balances: { BTC: 10, ETH: 50, USDT: 50000, XRP: 1000, SOL: 200 }, isBlocked: false, isAdmin: true, registeredAt: new Date().toISOString() },
        { id: 'user_1', name: 'Alex', email: 'alex@mail.com', password: '123456', balances: { BTC: 0.05, ETH: 0.5, USDT: 1000, XRP: 0, SOL: 0 }, isBlocked: false, isAdmin: false, registeredAt: new Date().toISOString() },
        { id: 'user_2', name: 'Maria', email: 'maria@mail.com', password: '123456', balances: { BTC: 0.1, ETH: 1.2, USDT: 500, XRP: 10, SOL: 2 }, isBlocked: false, isAdmin: false, registeredAt: new Date().toISOString() },
        { id: 'user_3', name: 'John', email: 'john@mail.com', password: '123456', balances: { BTC: 0.02, ETH: 0.3, USDT: 200, XRP: 5, SOL: 0.5 }, isBlocked: false, isAdmin: false, registeredAt: new Date().toISOString() },
    ];
    const now = new Date();
    const txs = [];
    for (let i = 0; i < 30; i++) {
        const user = STATE.users[Math.floor(Math.random() * STATE.users.length)];
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
    const user = getUserByEmail(email);
    if (!user || user.password !== password) {
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
    if (getUserByEmail(email)) {
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
    if (!getUserByEmail(email)) {
        errorEl.textContent = 'Пользователь не найден';
        errorEl.classList.remove('hidden');
        return;
    }
    errorEl.classList.add('hidden');
    successEl.textContent = 'Инструкция отправлена на ' + email;
    successEl.classList.remove('hidden');
    console.log('[RESET] Инструкция для:', email);
}

function doLogout() {
    STATE.currentUser = null;
    saveData();
    renderAuth();
    if (STATE.chartInterval) clearInterval(STATE.chartInterval);
    if (STATE.priceInterval) clearInterval(STATE.priceInterval);
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
    startChartUpdates();
    startPriceUpdates();
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
    const list = document.getElementById('balanceList');
    list.innerHTML = Object.keys(user.balances).map(key => `
        <div class="balance-row">
            <span>${key}</span>
            <span>${user.balances[key].toFixed(4)} ≈ $${(user.balances[key] * STATE.prices[key]).toFixed(2)}</span>
        </div>
    `).join('');

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
                <td class="status-${tx.status === 'Успешно' ? 'success' : tx.status === 'В обработке' ? 'pending' : 'error'}">${tx.status}</td>
                <td>${new Date(tx.timestamp).toLocaleString()}</td>
            </tr>
        `).join('');
    }
}

function renderWallet() {
    const user = STATE.currentUser;
    if (!user) return;
    const tbody = document.getElementById('walletTable');
    tbody.innerHTML = Object.keys(user.balances).map(key => `
        <tr>
            <td>${key}</td>
            <td>${user.balances[key].toFixed(4)}</td>
            <td>$${(user.balances[key] * STATE.prices[key]).toFixed(2)}</td>
        </tr>
    `).join('');
}

function renderHistory() {
    const user = STATE.currentUser;
    if (!user) return;
    const filter = document.getElementById('historyFilter').value;
    let txs = getTransactionsForUser(user.id);
    if (filter !== 'all') txs = txs.filter(tx => tx.type === filter);
    const tbody = document.getElementById('historyTable');
    if (txs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#8895aa;">Нет транзакций</td></tr>';
    } else {
        tbody.innerHTML = txs.map(tx => `
            <tr>
                <td>${tx.type}</td>
                <td>${tx.amount}</td>
                <td>${tx.currency}</td>
                <td>${tx.to || '—'}</td>
                <td class="status-${tx.status === 'Успешно' ? 'success' : tx.status === 'В обработке' ? 'pending' : 'error'}">${tx.status}</td>
                <td>${new Date(tx.timestamp).toLocaleString()}</td>
            </tr>
        `).join('');
    }
}

function renderAdmin() {
    const user = STATE.currentUser;
    const navLink = document.getElementById('adminNavLink');
    if (user && user.isAdmin) {
        navLink.classList.remove('hidden');
        renderAdminStats();
        renderAdminUsers();
        renderAdminTransactions();
    } else {
        navLink.classList.add('hidden');
    }
}

function renderAdminStats() {
    const totalUsers = STATE.users.length;
    const totalBalance = STATE.users.reduce((sum, u) => {
        return sum + Object.keys(u.balances).reduce((s, k) => s + (u.balances[k] || 0) * (STATE.prices[k] || 0), 0);
    }, 0);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dailyTx = STATE.transactions.filter(tx => new Date(tx.timestamp) >= today).length;
    document.getElementById('adminUserCount').textContent = totalUsers;
    document.getElementById('adminTotalBalance').textContent = '$' + totalBalance.toFixed(2);
    document.getElementById('adminDailyTx').textContent = dailyTx;
}

function renderAdminUsers() {
    const tbody = document.getElementById('adminUsersTable');
    tbody.innerHTML = STATE.users.map(u => `
        <tr>
            <td>${u.id}</td>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>$${Object.keys(u.balances).reduce((s, k) => s + (u.balances[k] || 0) * (STATE.prices[k] || 0), 0).toFixed(2)}</td>
            <td>${u.isBlocked ? 'Заблокирован' : 'Активен'}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="adminDeposit('${u.id}')">Пополнить</button>
                <button class="btn btn-danger btn-sm" onclick="adminWithdraw('${u.id}')">Списать</button>
                <button class="btn btn-secondary btn-sm" onclick="adminSend('${u.id}')">Отправить</button>
                <button class="btn ${u.isBlocked ? 'btn-secondary' : 'btn-danger'} btn-sm" onclick="adminToggleBlock('${u.id}')">${u.isBlocked ? 'Разблокировать' : 'Заблокировать'}</button>
                <button class="btn btn-danger btn-sm" onclick="adminDeleteUser('${u.id}')">Удалить</button>
            </td>
        </tr>
    `).join('');
}

function renderAdminTransactions() {
    const filterEmail = document.getElementById('adminTxFilter').value.trim();
    let txs = STATE.transactions;
    if (filterEmail) {
        const user = getUserByEmail(filterEmail);
        if (user) txs = txs.filter(tx => tx.userId === user.id);
    }
    const tbody = document.getElementById('adminTxTable');
    if (txs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#8895aa;">Нет транзакций</td></tr>';
    } else {
        tbody.innerHTML = txs.map(tx => {
            const user = getUserById(tx.userId);
            return `<tr>
                <td>${user ? user.email : '—'}</td>
                <td>${tx.type}</td>
                <td>${tx.amount}</td>
                <td>${tx.currency}</td>
                <td>${tx.to || '—'}</td>
                <td class="status-${tx.status === 'Успешно' ? 'success' : tx.status === 'В обработке' ? 'pending' : 'error'}">${tx.status}</td>
                <td>${new Date(tx.timestamp).toLocaleString()}</td>
            </tr>`;
        }).join('');
    }
}

// ===== АДМИН ДЕЙСТВИЯ =====
window.adminDeposit = function(userId) {
    const amount = prompt('Введите сумму пополнения:');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return;
    const user = getUserById(userId);
    if (!user) return;
    const currency = prompt('Введите валюту (BTC, ETH, USDT, XRP, SOL):');
    if (!currency || !user.balances.hasOwnProperty(currency)) return;
    user.balances[currency] = (user.balances[currency] || 0) + parseFloat(amount);
    STATE.transactions.push({
        id: 'tx_' + Date.now(),
        userId: userId,
        type: 'Пополнение',
        amount: parseFloat(amount),
        currency: currency,
        to: 'Пополнение',
        status: 'Успешно',
        timestamp: new Date().toISOString(),
    });
    saveData();
    renderAdminUsers();
    renderAdminTransactions();
    if (STATE.currentUser && STATE.currentUser.id === userId) renderMain();
};

window.adminWithdraw = function(userId) {
    const amount = prompt('Введите сумму списания:');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return;
    const user = getUserById(userId);
    if (!user) return;
    const currency = prompt('Введите валюту (BTC, ETH, USDT, XRP, SOL):');
    if (!currency || !user.balances.hasOwnProperty(currency)) return;
    if ((user.balances[currency] || 0) < parseFloat(amount)) {
        alert('Недостаточно средств');
        return;
    }
    user.balances[currency] = (user.balances[currency] || 0) - parseFloat(amount);
    STATE.transactions.push({
        id: 'tx_' + Date.now(),
        userId: userId,
        type: 'Списание',
        amount: parseFloat(amount),
        currency: currency,
        to: 'Списание',
        status: 'Успешно',
        timestamp: new Date().toISOString(),
    });
    saveData();
    renderAdminUsers();
    renderAdminTransactions();
    if (STATE.currentUser && STATE.currentUser.id === userId) renderMain();
};

window.adminSend = function(userId) {
    const address = prompt('Введите адрес кошелька (мин. 20 символов):');
    if (!address || address.length < 20) return;
    const amount = prompt('Введите сумму:');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return;
    const user = getUserById(userId);
    if (!user) return;
    const currency = prompt('Введите валюту (BTC, ETH, USDT, XRP, SOL):');
    if (!currency || !user.balances.hasOwnProperty(currency)) return;
    if ((user.balances[currency] || 0) < parseFloat(amount)) {
        alert('Недостаточно средств');
        return;
    }
    user.balances[currency] = (user.balances[currency] || 0) - parseFloat(amount);
    STATE.transactions.push({
        id: 'tx_' + Date.now(),
        userId: userId,
        type: 'Вывод',
        amount: parseFloat(amount),
        currency: currency,
        to: address,
        status: 'Успешно',
        timestamp: new Date().toISOString(),
    });
    saveData();
    renderAdminUsers();
    renderAdminTransactions();
    if (STATE.currentUser && STATE.currentUser.id === userId) renderMain();
};

window.adminToggleBlock = function(userId) {
    const user = getUserById(userId);
    if (!user) return;
    if (user.isAdmin) { alert('Нельзя заблокировать администратора'); return; }
    user.isBlocked = !user.isBlocked;
    saveData();
    renderAdminUsers();
};

window.adminDeleteUser = function(userId) {
    if (!confirm('Удалить пользователя?')) return;
    const user = getUserById(userId);
    if (user && user.isAdmin) { alert('Нельзя удалить администратора'); return; }
    STATE.users = STATE.users.filter(u => u.id !== userId);
    STATE.transactions = STATE.transactions.filter(tx => tx.userId !== userId);
    if (STATE.currentUser && STATE.currentUser.id === userId) {
        STATE.currentUser = null;
    }
    saveData();
    renderAdminUsers();
    renderAdminTransactions();
    if (!STATE.currentUser) renderAuth();
};

// ===== НАВИГАЦИЯ =====
function updateNav() {
    document.querySelectorAll('.nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById('page-' + page).classList.add('active');
            document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
            if (page === 'admin' && STATE.currentUser && STATE.currentUser.isAdmin) {
                renderAdminStats();
                renderAdminUsers();
                renderAdminTransactions();
            }
            if (page === 'history') renderHistory();
            if (page === 'wallet') renderWallet();
        });
    });
}

// ===== ОБМЕН =====
function bindMainEvents() {
    document.getElementById('exchangeBtn').addEventListener('click', doExchange);
    document.getElementById('withdrawBtn').addEventListener('click', doWithdraw);
    document.getElementById('depositBtn').addEventListener('click', openDepositModal);
    document.getElementById('depositModalClose').addEventListener('click', closeDepositModal);
    document.getElementById('exchangeAmount').addEventListener('input', updateExchangeRate);
    document.getElementById('exchangeFrom').addEventListener('change', updateExchangeRate);
    document.getElementById('exchangeTo').addEventListener('change', updateExchangeRate);
    document.getElementById('historyFilter').addEventListener('change', renderHistory);
    document.getElementById('adminTxFilter').addEventListener('input', renderAdminTransactions);
    document.getElementById('logoutBtn').addEventListener('click', doLogout);
    document.getElementById('depositModal').addEventListener('click', function(e) {
        if (e.target === this) closeDepositModal();
    });
}

function updateExchangeRate() {
    const from = document.getElementById('exchangeFrom').value;
    const to = document.getElementById('exchangeTo').value;
    const amount = parseFloat(document.getElementById('exchangeAmount').value) || 0;
    const rate = STATE.prices[to] / STATE.prices[from];
    const result = amount * rate;
    document.getElementById('exchangeResult').value = result.toFixed(6);
    document.getElementById('exchangeRateDisplay').textContent = `1 ${from} = ${rate.toFixed(6)} ${to}`;
}

function doExchange() {
    const from = document.getElementById('exchangeFrom').value;
    const to = document.getElementById('exchangeTo').value;
    const amount = parseFloat(document.getElementById('exchangeAmount').value);
    const errorEl = document.getElementById('exchangeError');
    const successEl = document.getElementById('exchangeSuccess');
    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');

    if (!amount || amount <= 0) {
        errorEl.textContent = 'Введите положительную сумму';
        errorEl.classList.remove('hidden');
        return;
    }

    const user = STATE.currentUser;
    if ((user.balances[from] || 0) < amount) {
        errorEl.textContent = 'Недостаточно средств';
        errorEl.classList.remove('hidden');
        return;
    }

    const rate = STATE.prices[to] / STATE.prices[from];
    const result = amount * rate;

    user.balances[from] = (user.balances[from] || 0) - amount;
    user.balances[to] = (user.balances[to] || 0) + result;

    STATE.transactions.push({
        id: 'tx_' + Date.now(),
        userId: user.id,
        type: 'Обмен',
        amount: amount,
        currency: from + '→' + to,
        to: user.name,
        status: 'Успешно',
        timestamp: new Date().toISOString(),
    });

    saveData();
    renderMain();
    successEl.textContent = `Обменяно ${amount} ${from} → ${result.toFixed(6)} ${to}`;
    successEl.classList.remove('hidden');
    document.getElementById('exchangeAmount').value = '';
    updateExchangeRate();
}

function doWithdraw() {
    const address = document.getElementById('withdrawAddress').value.trim();
    const currency = document.getElementById('withdrawCurrency').value;
    const network = document.getElementById('withdrawNetwork').value;
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const errorEl = document.getElementById('withdrawError');
    const successEl = document.getElementById('withdrawSuccess');
    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');

    if (address.length < 20) {
        errorEl.textContent = 'Адрес должен содержать минимум 20 символов';
        errorEl.classList.remove('hidden');
        return;
    }
    if (!amount || amount <= 0) {
        errorEl.textContent = 'Введите положительную сумму';
        errorEl.classList.remove('hidden');
        return;
    }

    const user = STATE.currentUser;
    if ((user.balances[currency] || 0) < amount) {
        errorEl.textContent = 'Недостаточно средств';
        errorEl.classList.remove('hidden');
        return;
    }

    user.balances[currency] = (user.balances[currency] || 0) - amount;

    STATE.transactions.push({
        id: 'tx_' + Date.now(),
        userId: user.id,
        type: 'Вывод',
        amount: amount,
        currency: currency + ' (' + network + ')',
        to: address,
        status: 'В обработке',
        timestamp: new Date().toISOString(),
    });

    saveData();
    renderMain();
    successEl.textContent = 'Заявка на вывод отправлена на обработку';
    successEl.classList.remove('hidden');
    document.getElementById('withdrawAmount').value = '';
    document.getElementById('withdrawAddress').value = '';

    setTimeout(() => {
        const lastTx = STATE.transactions[STATE.transactions.length - 1];
        if (lastTx && lastTx.type === 'Вывод' && lastTx.userId === user.id) {
            lastTx.status = 'Успешно';
            saveData();
            if (STATE.currentUser && STATE.currentUser.id === user.id) {
                renderHistory();
            }
        }
    }, 3000);
}

function openDepositModal() {
    const user = STATE.currentUser;
    if (!user) return;
    const address = '0x' + user.id.slice(-16) + Math.random().toString(36).slice(2, 6);
    document.getElementById('depositAddressDisplay').textContent = address;
    document.getElementById('depositQr').innerHTML = '';
    if (typeof QRCode !== 'undefined') {
        new QRCode(document.getElementById('depositQr'), {
            text: address,
            width: 160,
            height: 160,
            colorDark: '#f0b90b',
            colorLight: '#151e26',
        });
    }
    document.getElementById('depositModal').classList.remove('hidden');
}

function closeDepositModal() {
    document.getElementById('depositModal').classList.add('hidden');
}

// ===== ГРАФИК =====
function startChartUpdates() {
    STATE.chartData = Array.from({ length: 30 }, () => 40000 + Math.random() * 10000);
    drawChart();
    STATE.chartInterval = setInterval(() => {
        const last = STATE.chartData[STATE.chartData.length - 1];
        const change = (Math.random() - 0.5) * 600;
        STATE.chartData.push(Math.max(30000, Math.min(60000, last + change)));
        STATE.chartData.shift();
        drawChart();
    }, 5000);
}

function drawChart() {
    const canvas = document.getElementById('priceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement.clientWidth - 40;
    const h = canvas.height = 200;
    const data = STATE.chartData;
    if (data.length < 2) return;
    const min = Math.min(...data) * 0.98;
    const max = Math.max(...data) * 1.02;
    const range = max - min || 1;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = '#f0b90b';
    ctx.lineWidth = 2;
    data.forEach((val, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((val - min) / range) * (h - 20) - 10;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    const last = data[data.length - 1];
    const lastY = h - ((last - min) / range) * (h - 20) - 10;
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(240, 185, 11, 0.2)');
    grad.addColorStop(1, 'rgba(240, 185, 11, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();
}

function startPriceUpdates() {
    STATE.priceInterval = setInterval(() => {
        Object.keys(STATE.prices).forEach(key => {
            const change = (Math.random() - 0.5) * 0.02;
            STATE.prices[key] = Math.max(0.01, STATE.prices[key] * (1 + change));
        });
        if (STATE.currentUser) {
            updateBalances();
            renderWallet();
            renderDashboard();
            updateExchangeRate();
        }
    }, 5000);
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
function init() {
    loadData();
    if (STATE.users.length === 0) {
        createDefaultData();
    }
    renderAuth();
    bindMainEvents();
    // Кнопки переключения форм
    document.getElementById('showRegisterBtn').addEventListener('click', function(e) {
        e.preventDefault();
        showAuthForm('register');
    });
    document.getElementById('showLoginBtn').addEventListener('click', function(e) {
        e.preventDefault();
        showAuthForm('login');
    });
    document.getElementById('showResetBtn').addEventListener('click', function(e) {
        e.preventDefault();
        showAuthForm('reset');
    });
    document.getElementById('showLoginFromResetBtn').addEventListener('click', function(e) {
        e.preventDefault();
        showAuthForm('login');
    });
    // Кнопки логина/регистрации
    document.getElementById('loginBtn').addEventListener('click', doLogin);
    document.getElementById('registerBtn').addEventListener('click', doRegister);
    document.getElementById('resetBtn').addEventListener('click', doReset);
    // Enter
    document.getElementById('loginEmail').addEventListener('keyup', function(e) { if (e.key === 'Enter') doLogin(); });
    document.getElementById('loginPassword').addEventListener('keyup', function(e) { if (e.key === 'Enter') doLogin(); });
    document.getElementById('regName').addEventListener('keyup', function(e) { if (e.key === 'Enter') doRegister(); });
    document.getElementById('regEmail').addEventListener('keyup', function(e) { if (e.key === 'Enter') doRegister(); });
    document.getElementById('regPassword').addEventListener('keyup', function(e) { if (e.key === 'Enter') doRegister(); });
    document.getElementById('regPasswordConfirm').addEventListener('keyup', function(e) { if (e.key === 'Enter') doRegister(); });
}

// ===== ЗАПУСК =====
document.addEventListener('DOMContentLoaded', init);
