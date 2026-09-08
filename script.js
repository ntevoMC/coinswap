// =============================================
// CoinSwap — Обменник криптовалют
// =============================================

let state = {
    currentUser: null,
    users: [],
    allTransactions: [],
};

function init() {
    loadFromStorage();
    renderUI();
    bindEvents();
}

function loadFromStorage() {
    const saved = localStorage.getItem('coinswapData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            state.users = data.users || [];
            state.allTransactions = data.allTransactions || [];
            state.currentUser = data.currentUser || null;
            return;
        } catch (e) {}
    }
    // Первый запуск — создаём админа и тестового пользователя
    state.users = [
        { username: 'admin', password: 'admin123', btc: 2.5, usd: 5000, isAdmin: true, transactions: [] },
        { username: 'user1', password: 'user123', btc: 0.5, usd: 1000, isAdmin: false, transactions: [] },
    ];
    state.allTransactions = [];
    state.currentUser = null;
    saveToStorage();
}

function saveToStorage() {
    localStorage.setItem('coinswapData', JSON.stringify({
        users: state.users,
        allTransactions: state.allTransactions,
        currentUser: state.currentUser,
    }));
}

function getUser(username) {
    return state.users.find(u => u.username === username);
}

function formatBtc(v) { return '₿ ' + Number(v).toFixed(4); }
function formatUsd(v) { return '$ ' + Number(v).toFixed(2); }

function now() {
    return new Date().toLocaleString('ru-RU');
}

function addTransaction(user, type, amount, currency, counterparty, note = '') {
    const tx = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        type,
        amount: Number(amount),
        currency,
        counterparty: counterparty || '—',
        date: now(),
        note: note || '',
    };
    user.transactions.push(tx);
    state.allTransactions.push({
        from: user.username,
        to: counterparty || '—',
        amount: Number(amount),
        currency,
        date: now(),
        note: note || '',
    });
    saveToStorage();
}

// ===== RENDER =====
function renderUI() {
    const isLoggedIn = state.currentUser !== null;
    document.getElementById('loginPage').classList.toggle('hidden', isLoggedIn);
    document.getElementById('registerPage').classList.add('hidden');
    document.getElementById('mainPage').classList.toggle('hidden', !isLoggedIn);

    if (!isLoggedIn) return;

    const u = state.currentUser;
    document.getElementById('usernameDisplay').textContent = u.username;
    document.getElementById('balanceDisplay').textContent = formatBtc(u.btc);
    document.getElementById('fiatDisplay').textContent = formatUsd(u.usd);
    document.getElementById('mainBtc').textContent = formatBtc(u.btc);
    document.getElementById('mainUsd').textContent = formatUsd(u.usd);

    // Админ-панель
    const toggle = document.getElementById('adminToggle');
    if (u.isAdmin) {
        toggle.style.display = 'inline-block';
    } else {
        toggle.style.display = 'none';
        document.getElementById('adminPanel').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('visible');
    }

    renderHistory();
    if (u.isAdmin) {
        renderAdminUsers();
        renderAdminTransactions();
    }
}

function renderHistory() {
    const u = state.currentUser;
    const tbody = document.getElementById('historyBody');
    if (!u || u.transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#6a768e;">Нет операций</td></tr>';
        return;
    }
    tbody.innerHTML = u.transactions.slice().reverse().map(tx => {
        const amountStr = tx.currency === 'btc' ? formatBtc(tx.amount) : formatUsd(tx.amount);
        const typeMap = {
            'exchange': 'Обмен',
            'send': 'Отправка',
            'receive': 'Получение',
            'admin': 'Админ',
        };
        return `<tr>
            <td>${typeMap[tx.type] || tx.type}</td>
            <td class="tx-amount">${amountStr}</td>
            <td>${tx.counterparty}</td>
            <td style="font-size:12px;color:#6a768e;">${tx.date}</td>
        </tr>`;
    }).join('');
}

// ===== ADMIN RENDERS =====
function renderAdminUsers() {
    const tbody = document.getElementById('adminUsersBody');
    tbody.innerHTML = state.users.map(u => `
        <tr>
            <td><strong>${u.username}</strong> ${u.isAdmin ? '👑' : ''}</td>
            <td>${formatBtc(u.btc)}</td>
            <td>${formatUsd(u.usd)}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="adminEditUser('${u.username}', 'btc', 0.1)">+0.1 BTC</button>
                <button class="btn btn-secondary btn-sm" onclick="adminEditUser('${u.username}', 'usd', 10)">+10 USD</button>
                ${!u.isAdmin ? `<button class="btn btn-danger btn-sm" onclick="adminDeleteUser('${u.username}')">Удалить</button>` : ''}
            </td>
        </tr>
    `).join('');
}

function renderAdminTransactions() {
    const tbody = document.getElementById('adminTxBody');
    if (state.allTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#6a768e;">Нет операций</td></tr>';
        return;
    }
    tbody.innerHTML = state.allTransactions.slice().reverse().map(tx => {
        const amountStr = tx.currency === 'btc' ? formatBtc(tx.amount) : formatUsd(tx.amount);
        return `<tr>
            <td class="tx-from">${tx.from}</td>
            <td class="tx-to">${tx.to}</td>
            <td class="tx-amount">${amountStr}</td>
            <td>${tx.currency.toUpperCase()}</td>
            <td style="font-size:12px;color:#6a768e;">${tx.date}</td>
        </tr>`;
    }).join('');
}

// ===== ADMIN ACTIONS =====
window.adminEditUser = function(username, currency, amount) {
    const u = getUser(username);
    if (!u) return;
    if (currency === 'btc') u.btc += amount;
    else u.usd += amount;
    addTransaction(u, 'admin', amount, currency, 'admin', 'Пополнение от администратора');
    saveToStorage();
    renderUI();
    if (state.currentUser && state.currentUser.isAdmin) {
        renderAdminUsers();
        renderAdminTransactions();
    }
};

window.adminDeleteUser = function(username) {
    if (username === 'admin') return;
    if (!confirm(`Удалить пользователя ${username}?`)) return;
    state.users = state.users.filter(u => u.username !== username);
    if (state.currentUser && state.currentUser.username === username) {
        state.currentUser = null;
    }
    saveToStorage();
    renderUI();
    if (state.currentUser && state.currentUser.isAdmin) {
        renderAdminUsers();
    }
};

// ===== BIND EVENTS =====
function bindEvents() {
    document.getElementById('loginBtn').addEventListener('click', doLogin);
    document.getElementById('loginUsername').addEventListener('keyup', e => { if (e.key === 'Enter') doLogin(); });
    document.getElementById('loginPassword').addEventListener('keyup', e => { if (e.key === 'Enter') doLogin(); });

    document.getElementById('registerBtn').addEventListener('click', doRegister);
    document.getElementById('showRegister').addEventListener('click', e => { e.preventDefault(); showPage('register'); });
    document.getElementById('showLogin').addEventListener('click', e => { e.preventDefault(); showPage('login'); });

    document.getElementById('logoutBtn').addEventListener('click', doLogout);
    document.getElementById('adminToggle').addEventListener('click', toggleAdmin);

    document.querySelectorAll('.tabs button').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            const target = document.getElementById(this.dataset.tab);
            if (target) target.classList.add('active');
        });
    });

    document.getElementById('exchangeBtn').addEventListener('click', doExchange);
    document.getElementById('sendBtn').addEventListener('click', doSend);
    document.getElementById('adminSendBtn').addEventListener('click', doAdminSend);
    document.getElementById('adminCreateUserBtn').addEventListener('click', adminCreateUser);
}

function showPage(page) {
    document.getElementById('loginPage').classList.toggle('hidden', page !== 'login');
    document.getElementById('registerPage').classList.toggle('hidden', page !== 'register');
    document.getElementById('mainPage').classList.add('hidden');
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('regError').classList.add('hidden');
}

function doLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const user = getUser(username);
    const errorEl = document.getElementById('loginError');
    if (!user || user.password !== password) {
        errorEl.textContent = 'Неверный логин или пароль';
        errorEl.classList.remove('hidden');
        return;
    }
    errorEl.classList.add('hidden');
    state.currentUser = user;
    saveToStorage();
    renderUI();
}

function doRegister() {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const errorEl = document.getElementById('regError');
    if (!username || !password) {
        errorEl.textContent = 'Заполните все поля';
        errorEl.classList.remove('hidden');
        return;
    }
    if (getUser(username)) {
        errorEl.textContent = 'Пользователь уже существует';
        errorEl.classList.remove('hidden');
        return;
    }
    errorEl.classList.add('hidden');
    const newUser = { username, password, btc: 0, usd: 0, isAdmin: false, transactions: [] };
    state.users.push(newUser);
    saveToStorage();
    alert('Аккаунт создан!');
    showPage('login');
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = '';
}

function doLogout() {
    state.currentUser = null;
    saveToStorage();
    renderUI();
}

function toggleAdmin() {
    const panel = document.getElementById('adminPanel');
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        panel.classList.add('visible');
        if (state.currentUser && state.currentUser.isAdmin) {
            renderAdminUsers();
            renderAdminTransactions();
        }
    } else {
        panel.classList.add('hidden');
        panel.classList.remove('visible');
    }
}

function doExchange() {
    const direction = document.getElementById('exchangeDirection').value;
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

    const u = state.currentUser;
    const rate = 45000;

    if (direction === 'btc_to_usd') {
        if (u.btc < amount) {
            errorEl.textContent = 'Недостаточно BTC';
            errorEl.classList.remove('hidden');
            return;
        }
        const usdAmount = amount * rate;
        u.btc -= amount;
        u.usd += usdAmount;
        addTransaction(u, 'exchange', amount, 'btc', '→ USD', `Курс ${rate}`);
        successEl.textContent = `Обменяно ${formatBtc(amount)} → ${formatUsd(usdAmount)}`;
        successEl.classList.remove('hidden');
    } else {
        if (u.usd < amount) {
            errorEl.textContent = 'Недостаточно USD';
            errorEl.classList.remove('hidden');
            return;
        }
        const btcAmount = amount / rate;
        u.usd -= amount;
        u.btc += btcAmount;
        addTransaction(u, 'exchange', amount, 'usd', '→ BTC', `Курс ${rate}`);
        successEl.textContent = `Обменяно ${formatUsd(amount)} → ${formatBtc(btcAmount)}`;
        successEl.classList.remove('hidden');
    }

    saveToStorage();
    renderUI();
    document.getElementById('exchangeAmount').value = '';
}

function doSend() {
    const to = document.getElementById('sendTo').value.trim();
    const currency = document.getElementById('sendCurrency').value;
    const amount = parseFloat(document.getElementById('sendAmount').value);
    const errorEl = document.getElementById('sendError');
    const successEl = document.getElementById('sendSuccess');
    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');

    if (!to) {
        errorEl.textContent = 'Укажите получателя';
        errorEl.classList.remove('hidden');
        return;
    }
    if (!amount || amount <= 0) {
        errorEl.textContent = 'Введите положительную сумму';
        errorEl.classList.remove('hidden');
        return;
    }

    const sender = state.currentUser;
    const receiver = getUser(to);
    if (!receiver) {
        errorEl.textContent = 'Получатель не найден';
        errorEl.classList.remove('hidden');
        return;
    }
    if (sender.username === receiver.username) {
        errorEl.textContent = 'Нельзя отправить самому себе';
        errorEl.classList.remove('hidden');
        return;
    }

    if (currency === 'btc') {
        if (sender.btc < amount) {
            errorEl.textContent = 'Недостаточно BTC';
            errorEl.classList.remove('hidden');
            return;
        }
        sender.btc -= amount;
        receiver.btc += amount;
        addTransaction(sender, 'send', amount, 'btc', receiver.username);
        addTransaction(receiver, 'receive', amount, 'btc', sender.username);
    } else {
        if (sender.usd < amount) {
            errorEl.textContent = 'Недостаточно USD';
            errorEl.classList.remove('hidden');
            return;
        }
        sender.usd -= amount;
        receiver.usd += amount;
        addTransaction(sender, 'send', amount, 'usd', receiver.username);
        addTransaction(receiver, 'receive', amount, 'usd', sender.username);
    }

    saveToStorage();
    renderUI();
    successEl.textContent = `Отправлено ${currency.toUpperCase()} ${amount} → ${to}`;
    successEl.classList.remove('hidden');
    document.getElementById('sendAmount').value = '';
    document.getElementById('sendTo').value = '';
}

function doAdminSend() {
    const from = document.getElementById('adminSendFrom').value.trim();
    const to = document.getElementById('adminSendTo').value.trim();
    const currency = document.getElementById('adminSendCurrency').value;
    const amount = parseFloat(document.getElementById('adminSendAmount').value);
    const errorEl = document.getElementById('adminSendError');
    const successEl = document.getElementById('adminSendSuccess');
    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');

    if (!from || !to) {
        errorEl.textContent = 'Укажите отправителя и получателя';
        errorEl.classList.remove('hidden');
        return;
    }
    if (!amount || amount <= 0) {
        errorEl.textContent = 'Введите положительную сумму';
        errorEl.classList.remove('hidden');
        return;
    }

    const sender = getUser(from);
    const receiver = getUser(to);
    if (!sender) {
        errorEl.textContent = 'Отправитель не найден';
        errorEl.classList.remove('hidden');
        return;
    }
    if (!receiver) {
        errorEl.textContent = 'Получатель не найден';
        errorEl.classList.remove('hidden');
        return;
    }
    if (sender.username === receiver.username) {
        errorEl.textContent = 'Нельзя отправить самому себе';
        errorEl.classList.remove('hidden');
        return;
    }

    if (currency === 'btc') {
        if (sender.btc < amount) {
            errorEl.textContent = `Недостаточно BTC у ${sender.username}`;
            errorEl.classList.remove('hidden');
            return;
        }
        sender.btc -= amount;
        receiver.btc += amount;
    } else {
        if (sender.usd < amount) {
            errorEl.textContent = `Недостаточно USD у ${sender.username}`;
            errorEl.classList.remove('hidden');
            return;
        }
        sender.usd -= amount;
        receiver.usd += amount;
    }

    addTransaction(sender, 'admin', amount, currency, receiver.username, 'Административный перевод');
    addTransaction(receiver, 'admin', amount, currency, sender.username, 'Административное поступление');

    saveToStorage();
    renderUI();
    successEl.textContent = `Переведено ${currency.toUpperCase()} ${amount} от ${from} → ${to}`;
    successEl.classList.remove('hidden');
    document.getElementById('adminSendAmount').value = '';
    if (state.currentUser && state.currentUser.isAdmin) {
        renderAdminUsers();
        renderAdminTransactions();
    }
}

function adminCreateUser() {
    const username = document.getElementById('admin
