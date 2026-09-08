// =============================================
// CoinSwap — Обменник криптовалют
// =============================================

let state = {
    currentUser: null,
    users: [],
    allTransactions: [],
};

// ===== INIT =====
function init() {
    loadFromStorage();
    renderUI();
    bindEvents();
}

// ===== STORAGE =====
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
    // Первый запуск
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
    const loginPage = document.getElementById('loginPage');
    const registerPage = document.getElementById('registerPage');
    const mainPage = document.getElementById('mainPage');

    if (loginPage) loginPage.classList.toggle('hidden', isLoggedIn);
    if (registerPage) registerPage.classList.add('hidden');
    if (mainPage) mainPage.classList.toggle('hidden', !isLoggedIn);

    if (!isLoggedIn) return;

    const u = state.currentUser;
    const usernameDisplay = document.getElementById('usernameDisplay');
    const balanceDisplay = document.getElementById('balanceDisplay');
    const fiatDisplay = document.getElementById('fiatDisplay');
    const mainBtc = document.getElementById('mainBtc');
    const mainUsd = document.getElementById('mainUsd');

    if (usernameDisplay) usernameDisplay.textContent = u.username;
    if (balanceDisplay) balanceDisplay.textContent = formatBtc(u.btc);
    if (fiatDisplay) fiatDisplay.textContent = formatUsd(u.usd);
    if (mainBtc) mainBtc.textContent = formatBtc(u.btc);
    if (mainUsd) mainUsd.textContent = formatUsd(u.usd);

    const toggle = document.getElementById('adminToggle');
    const panel = document.getElementById('adminPanel');
    if (u.isAdmin) {
        if (toggle) toggle.style.display = 'inline-block';
    } else {
        if (toggle) toggle.style.display = 'none';
        if (panel) {
            panel.classList.add('hidden');
            panel.classList.remove('visible');
        }
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
    if (!tbody) return;
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

function renderAdminUsers() {
    const tbody = document.getElementById('adminUsersBody');
    if (!tbody) return;
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
    if (!tbody) return;
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
    if (username === 'admin') {
        alert('Нельзя удалить администратора');
        return;
    }
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

// ===== EVENTS =====
function bindEvents() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminToggle = document.getElementById('adminToggle');
    const exchangeBtn = document.getElementById('exchangeBtn');
    const sendBtn = document.getElementById('sendBtn');
    const adminSendBtn = document.getElementById('adminSendBtn');
    const adminCreateBtn = document.getElementById('adminCreateUserBtn');

    if (loginBtn) loginBtn.addEventListener('click', doLogin);
    const loginUser = document.getElementById('loginUsername');
    const loginPass = document.getElementById('loginPassword');
    if (loginUser) loginUser.addEventListener('keyup', e => { if (e.key === 'Enter') doLogin(); });
    if (loginPass) loginPass.addEventListener('keyup', e => { if (e.key === 'Enter') doLogin(); });

    if (registerBtn) registerBtn.addEventListener('click', doRegister);
    if (showRegister) showRegister.addEventListener('click', e => { e.preventDefault(); showPage('register'); });
    if (showLogin) showLogin.addEventListener('click', e => { e.preventDefault(); showPage('login'); });

    if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
    if (adminToggle) adminToggle.addEventListener('click', toggleAdmin);

    document.querySelectorAll('.tabs button').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            const target = document.getElementById(this.dataset.tab);
            if (target) target.classList.add('active');
        });
    });

    if (exchangeBtn) exchangeBtn.addEventListener('click', doExchange);
    if (sendBtn) sendBtn.addEventListener('click', doSend);
    if (adminSendBtn) adminSendBtn.addEventListener('click', doAdminSend);
    if (adminCreateBtn) adminCreateBtn.addEventListener('click', adminCreateUser);
}

function showPage(page) {
    const loginPage = document.getElementById('loginPage');
    const registerPage = document.getElementById('registerPage');
    const mainPage = document.getElementById('mainPage');
    const loginError = document.getElementById('loginError');
    const regError = document.getElementById('regError');

    if (loginPage) loginPage.classList.toggle('hidden', page !== 'login');
    if (registerPage) registerPage.classList.toggle('hidden', page !== 'register');
    if (mainPage) mainPage.classList.add('hidden');
    if (loginError) loginError.classList.add('hidden');
    if (regError) regError.classList.add('hidden');
}

// ===== LOGIN =====
function doLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const user = getUser(username);
    const errorEl = document.getElementById('loginError');
    if (!user || user.password !== password) {
        if (errorEl) {
            errorEl.textContent = 'Неверный логин или пароль';
            errorEl.classList.remove('hidden');
        }
        return;
    }
    if (errorEl) errorEl.classList.add('hidden');
    state.currentUser = user;
    saveToStorage();
    renderUI();
}

// ===== REGISTER =====
function doRegister() {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const errorEl = document.getElementById('regError');
    if (!username || !password) {
        if (errorEl) {
            errorEl.textContent = 'Заполните все поля';
            errorEl.classList.remove('hidden');
        }
        return;
    }
    if (getUser(username)) {
        if (errorEl) {
            errorEl.textContent = 'Пользователь уже существует';
            errorEl.classList.remove('hidden');
        }
        return;
    }
    if (errorEl) errorEl.classList.add('hidden');
    const newUser = {
        username: username,
        password: password,
        btc: 0,
        usd: 0,
        isAdmin: false,
        transactions: []
    };
    state.users.push(newUser);
    saveToStorage();
    alert('Аккаунт создан! Теперь войдите.');
    showPage('login');
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = '';
}

// ===== LOGOUT =====
function doLogout() {
    state.currentUser = null;
    saveToStorage();
    renderUI();
}

// ===== TOGGLE ADMIN =====
function toggleAdmin() {
    const panel = document.getElementById('adminPanel');
    if (!panel) return;
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

// ===== EXCHANGE =====
function doExchange() {
    const direction = document.getElementById('exchangeDirection').value;
    const amount = parseFloat(document.getElementById('exchangeAmount').value);
    const errorEl = document.getElementById('exchangeError');
    const successEl = document.getElementById('exchangeSuccess');

    if (errorEl) errorEl.classList.add('hidden');
    if (successEl) successEl.classList.add('hidden');

    if (!amount || amount <= 0) {
        if (errorEl) {
            errorEl.textContent = 'Введите положительную сумму';
            errorEl.classList.remove('hidden');
        }
        return;
    }

    const u = state.currentUser;
    const rate = 45000;

    if (direction === 'btc_to_usd') {
        if (u.btc < amount) {
            if (errorEl) {
                errorEl.textContent = 'Недостаточно BTC';
                errorEl.classList.remove('hidden');
            }
            return;
        }
        const usdAmount = amount * rate;
        u.btc -= amount;
        u.usd += usdAmount;
        addTransaction(u, 'exchange', amount, 'btc', '→ USD', `Курс ${rate}`);
        if (successEl) {
            successEl.textContent = `Обменяно ${formatBtc(amount)} → ${formatUsd(usdAmount)}`;
            successEl.classList.remove('hidden');
        }
    } else {
        if (u.usd < amount) {
            if (errorEl) {
                errorEl.textContent = 'Недостаточно USD';
                errorEl.classList.remove('hidden');
            }
            return;
        }
        const btcAmount = amount / rate;
        u.usd -= amount;
        u.btc += btcAmount;
        addTransaction(u, 'exchange', amount, 'usd', '→ BTC', `Курс ${rate}`);
        if (successEl) {
            successEl.textContent = `Обменяно ${formatUsd(amount)} → ${formatBtc(btcAmount)}`;
            successEl.classList.remove('hidden');
        }
    }

    saveToStorage();
    renderUI();
    document.getElementById('exchangeAmount').value = '';
}

// ===== SEND =====
function doSend() {
    const to = document.getElementById('sendTo').value.trim();
    const currency = document.getElementById('sendCurrency').value;
    const amount = parseFloat(document.getElementById('sendAmount').value);
    const errorEl = document.getElementById('sendError');
    const successEl = document.getElementById('sendSuccess');

    if (errorEl) errorEl.classList.add('hidden');
    if (successEl) successEl.classList.add('hidden');

    if (!to) {
        if (errorEl) {
            errorEl.textContent = 'Укажите получателя';
            errorEl.classList.remove('hidden');
        }
        return;
    }
    if (!amount || amount <= 0) {
        if (errorEl) {
            errorEl.textContent = 'Введите положительную сумму';
            errorEl.classList.remove('hidden');
        }
        return;
    }

    const sender = state.currentUser;
    const receiver = getUser(to);
    if (!receiver) {
        if (errorEl) {
            errorEl.textContent = 'Получатель не найден';
            errorEl.classList.remove('hidden');
        }
        return;
    }
    if (sender.username === receiver.username) {
        if (errorEl) {
            errorEl.textContent = 'Нельзя отправить самому себе';
            errorEl.classList.remove('hidden');
        }
        return;
    }

    if (currency === 'btc') {
        if (sender.btc < amount) {
            if (errorEl) {
                errorEl.textContent = 'Недостаточно BTC';
                errorEl.classList.remove('hidden');
            }
            return;
        }
        sender.btc -= amount;
        receiver.btc += amount;
        addTransaction(sender, 'send', amount, 'btc', receiver.username);
        addTransaction(receiver, 'receive', amount, 'btc', sender.username);
    } else {
        if (sender.usd < amount) {
            if (errorEl) {
                errorEl.textContent = 'Недостаточно USD';
                errorEl.classList.remove('hidden');
            }
            return;
        }
        sender.usd -= amount;
        receiver.usd += amount;
        addTransaction(sender, 'send', amount, 'usd', receiver.username);
        addTransaction(receiver, 'receive', amount, 'usd', sender.username);
    }

    saveToStorage();
    renderUI();
    if (successEl) {
        successEl.textContent = `Отправлено ${currency.toUpperCase()} ${amount} → ${to}`;
        successEl.classList.remove('hidden');
    }
    document.getElementById('sendAmount').value = '';
    document.getElementById('sendTo').value = '';
}

// ===== ADMIN SEND =====
function doAdminSend() {
    const from = document.getElementById('adminSendFrom').value.trim();
    const to = document.getElementById('adminSendTo').value.trim();
    const currency = document.getElementById('adminSendCurrency').value;
    const amount = parseFloat(document.getElementById('adminSendAmount').value);
    const errorEl = document.getElementById('adminSendError');
    const successEl = document.getElementById('adminSendSuccess');

    if (errorEl) errorEl.classList.add('hidden');
    if (successEl) successEl.classList.add('hidden');

    if (!from || !to) {
        if (errorEl) {
            errorEl.textContent = 'Укажите отправителя и получателя';
            errorEl.classList.remove('hidden');
        }
        return;
    }
    if (!amount || amount <= 0) {
        if (errorEl) {
            errorEl.textContent = 'Введите положительную сумму';
            errorEl.classList.remove('hidden');
        }
        return;
    }

    const sender = getUser(from);
    const receiver = getUser(to);
    if (!sender) {
        if (errorEl) {
            errorEl.textContent = 'Отправитель не найден';
            errorEl.classList.remove('hidden');
        }
        return;
    }
    if (!receiver) {
        if (errorEl) {
            errorEl.textContent = 'Получатель не найден';
            errorEl.classList.remove('hidden');
        }
        return;
    }
    if (sender.username === receiver.username) {
        if (errorEl) {
            errorEl.textContent = 'Нельзя отправить самому себе';
            errorEl.classList.remove('hidden');
        }
        return;
    }

    if (currency === 'btc') {
        if (sender.btc < amount) {
            if (errorEl) {
                errorEl.textContent = `Недостаточно BTC у ${sender.username}`;
                errorEl.classList.remove('hidden');
            }
            return;
        }
        sender.btc -= amount;
        receiver.btc += amount;
    } else {
        if (sender.usd < amount) {
            if (errorEl) {
                errorEl.textContent = `Недостаточно USD у ${sender.username}`;
                errorEl.classList.remove('hidden');
            }
            return;
        }
        sender.usd -= amount;
        receiver.usd += amount;
    }

    addTransaction(sender, 'admin', amount, currency, receiver.username, 'Административный перевод');
    addTransaction(receiver, 'admin', amount, currency, sender.username, 'Административное поступление');

    saveToStorage();
    renderUI();
    if (successEl) {
        successEl.textContent = `Переведено ${currency.toUpperCase()} ${amount} от ${from} → ${to}`;
        successEl.classList.remove('hidden');
    }
    document.getElementById('adminSendAmount').value = '';
    if (state.currentUser && state.currentUser.isAdmin) {
        renderAdminUsers();
        renderAdminTransactions();
    }
}

// ===== ADMIN CREATE USER =====
function adminCreateUser() {
    const username = document.getElementById('adminNewUser').value.trim();
    const password = document.getElementById('adminNewPass').value.trim();

    if (!username || !password) {
        alert('Заполните логин и пароль');
        return;
    }
    if (getUser(username)) {
        alert('Пользователь уже существует');
        return;
    }

    const newUser = {
        username: username,
        password: password,
        btc: 0,
        usd: 0,
        isAdmin: false,
        transactions: []
    };
    state.users.push(newUser);
    saveToStorage();
    alert('Пользователь создан');
    document.getElementById('adminNewUser').value = '';
    document.getElementById('adminNewPass').value = '';
    if (state.currentUser && state.currentUser.isAdmin) {
        renderAdminUsers();
    }
}

// ===== START =====
document.addEventListener('DOMContentLoaded', init);
