(function() {
    'use strict';

    console.log('%c🚀 Mathware v5.0 Iniciando...', 'color: #4facfe; font-size: 18px; font-weight: bold; text-shadow: 0 0 10px rgba(79,172,254,0.5)');


    const Utils = {
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        },

        sanitize(str) {
            if (typeof str !== 'string') return '';
            const temp = document.createElement('div');
            temp.textContent = str;
            return temp.innerHTML;
        },

        async delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        formatDate(isoString) {
            const date = new Date(isoString);
            return new Intl.DateTimeFormat('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        },

        getPasswordStrength(password) {
            if (!password) return 0;
            let strength = 0;
            if (password.length >= 4) strength++;
            if (password.length >= 8) strength++;
            if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
            if (/\d/.test(password)) strength++;
            if (/[^a-zA-Z0-9]/.test(password)) strength++;
            return Math.min(strength, 5);
        },

        getPasswordStrengthText(strength) {
            const texts = ['Sin contraseña', 'Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'];
            return texts[strength] || 'Sin contraseña';
        }
    };


    const TimerManager = {
        activeTimers: new Set(),

        create(callback, interval) {
            const id = setInterval(callback, interval);
            this.activeTimers.add(id);
            return id;
        },

        clear(id) {
            if (id) {
                clearInterval(id);
                this.activeTimers.delete(id);
            }
        },

        clearAll() {
            this.activeTimers.forEach(id => clearInterval(id));
            this.activeTimers.clear();
        }
    };

    const Toast = {
        container: null,

        init() {
            if (!this.container) {
                this.container = document.querySelector('.toast-container');
                if (!this.container) {
                    this.container = document.createElement('div');
                    this.container.className = 'toast-container';
                    this.container.setAttribute('aria-live', 'polite');
                    this.container.setAttribute('aria-atomic', 'true');
                    document.body.appendChild(this.container);
                }
            }
        },

        show(message, type = 'info', duration = 3500) {
            this.init();

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.setAttribute('role', 'alert');

            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };

            toast.innerHTML = `
                <span class="toast-icon">${icons[type]}</span>
                <span class="toast-message">${Utils.sanitize(message)}</span>
                <button class="toast-close" aria-label="Cerrar notificación">×</button>
            `;

            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => this.remove(toast));

            this.container.appendChild(toast);

            requestAnimationFrame(() => {
                toast.classList.add('show');
            });

            setTimeout(() => this.remove(toast), duration);
        },

        remove(toast) {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }
    };


    const LoadingButton = {
        start(button) {
            button.disabled = true;
            button.classList.add('loading');
            const textEl = button.querySelector('.btn-text');
            if (textEl) {
                button.dataset.originalText = textEl.textContent;
            }
        },

        stop(button, success = true, message = '') {
            button.disabled = false;
            button.classList.remove('loading');

            const textElement = button.querySelector('.btn-text');

            if (success && message && textElement) {
                button.classList.add('success-flash');
                textElement.textContent = message;

                setTimeout(() => {
                    button.classList.remove('success-flash');
                    if (button.dataset.originalText) {
                        textElement.textContent = button.dataset.originalText;
                    }
                }, 2000);
            } else if (!success) {
                button.classList.add('error-flash');
                setTimeout(() => button.classList.remove('error-flash'), 600);
            }
        }
    };


    const AuthSystem = {
        USERS_KEY: 'mathware_users',
        SESSION_KEY: 'mathware_session',

        async hashPassword(password, saltHex) {
            try {
                const encoder = new TextEncoder();
                const salt = saltHex
                    ? new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
                    : crypto.getRandomValues(new Uint8Array(16));

                const keyMaterial = await crypto.subtle.importKey(
                    'raw',
                    encoder.encode(password),
                    { name: 'PBKDF2' },
                    false,
                    ['deriveBits']
                );

                const hashBuffer = await crypto.subtle.deriveBits(
                    {
                        name: 'PBKDF2',
                        salt: salt,
                        iterations: 100000,
                        hash: 'SHA-256'
                    },
                    keyMaterial,
                    256
                );

                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                const saltHexOut = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

                return { hash: hashHex, salt: saltHexOut };
            } catch (error) {
                console.error('Error al hashear contraseña:', error);
                throw error;
            }
        },

        getUsers() {
            try {
                const data = localStorage.getItem(this.USERS_KEY);
                if (!data) return {};

                const parsed = JSON.parse(data);
                if (typeof parsed !== 'object' || Array.isArray(parsed)) {
                    console.warn('Datos corruptos, reiniciando...');
                    return {};
                }
                return parsed;
            } catch (error) {
                console.error('Error al cargar usuarios:', error);
                localStorage.removeItem(this.USERS_KEY);
                return {};
            }
        },

        saveUsers(users) {
            try {
                localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
            } catch (error) {
                console.error('Error al guardar usuarios:', error);
                Toast.show('Error al guardar datos', 'error');
                throw error;
            }
        },

        async register(username, password) {
            username = username.trim();

            if (username.length < 3) {
                return { success: false, message: 'Usuario debe tener mínimo 3 caracteres' };
            }

            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                return { success: false, message: 'Usuario solo puede contener letras, números y guión bajo' };
            }

            if (password.length < 4) {
                return { success: false, message: 'Contraseña debe tener mínimo 4 caracteres' };
            }

            const users = this.getUsers();

            if (users[username]) {
                return { success: false, message: 'Este usuario ya existe' };
            }

            try {
                const { hash, salt } = await this.hashPassword(password);

                users[username] = {
                    passwordHash: hash,
                    salt: salt,
                    password: password,
                    createdAt: new Date().toISOString()
                };

                this.saveUsers(users);
                return { success: true };
            } catch (error) {
                return { success: false, message: 'Error al crear cuenta' };
            }
        },

        async login(username, password) {
            username = username.trim();
            const users = this.getUsers();

            if (!users[username]) {
                await Utils.delay(500);
                return { success: false, message: 'Usuario o contraseña incorrectos' };
            }

            try {
                const user = users[username];
                const { hash } = await this.hashPassword(password, user.salt);

                if (hash !== user.passwordHash) {
                    await Utils.delay(500);
                    return { success: false, message: 'Usuario o contraseña incorrectos' };
                }

                localStorage.setItem(this.SESSION_KEY, username);
                return { success: true };
            } catch (error) {
                return { success: false, message: 'Error al procesar inicio de sesión' };
            }
        },

        logout() {
            localStorage.removeItem(this.SESSION_KEY);
        },

        getSession() {
            return localStorage.getItem(this.SESSION_KEY);
        },

        isLoggedIn() {
            return this.getSession() !== null;
        }
    };

    const GameDB = {
        DB_KEY: 'mathware_scores',
        INDEX_KEY: 'mathware_scores_index',

        getDB() {
            try {
                const data = localStorage.getItem(this.DB_KEY);
                return data ? JSON.parse(data) : { partidas: [] };
            } catch (error) {
                console.error('Error al cargar DB:', error);
                return { partidas: [] };
            }
        },

        getIndex() {
            try {
                const data = localStorage.getItem(this.INDEX_KEY);
                return data ? JSON.parse(data) : {};
            } catch (error) {
                return {};
            }
        },

        saveDB(db) {
            try {
                localStorage.setItem(this.DB_KEY, JSON.stringify(db));
            } catch (error) {
                console.error('Error al guardar DB:', error);
            }
        },

        saveScore(username, theme, score, total, time, grade) {
            const db = this.getDB();
            const index = this.getIndex();

            const id = Date.now();
            const partida = {
                id,
                username: Utils.sanitize(username),
                theme: Utils.sanitize(theme),
                score,
                totalQuestions: total,
                timeTotal: time,
                grade,
                date: new Date().toISOString()
            };

            db.partidas.push(partida);

            if (!index[username]) index[username] = [];
            index[username].push(id);

            this.saveDB(db);
            localStorage.setItem(this.INDEX_KEY, JSON.stringify(index));
        },

        getUserHistory(username) {
            const db = this.getDB();
            const index = this.getIndex();
            const userIds = index[username] || [];

            return userIds
                .map(id => db.partidas.find(p => p.id === id))
                .filter(Boolean);
        },

        getTopScores(limit = 10) {
            const db = this.getDB();
            return [...db.partidas]
                .sort((a, b) => b.score - a.score || a.timeTotal - b.timeTotal)
                .slice(0, limit);
        },

        deleteUserHistory(username) {
            const db = this.getDB();
            const index = this.getIndex();

            const userGameIds = new Set(index[username] || []);
            db.partidas = db.partidas.filter(p => !userGameIds.has(p.id));

            delete index[username];

            this.saveDB(db);
            localStorage.setItem(this.INDEX_KEY, JSON.stringify(index));
        }
    };

    function showView(viewId) {
        console.log('🎯 Mostrando vista:', viewId);
        TimerManager.clearAll();

        const views = document.querySelectorAll('.view');
        views.forEach(v => {
            v.classList.remove('active');
            v.setAttribute('aria-hidden', 'true');
        });

        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
            targetView.setAttribute('aria-hidden', 'false');

            const firstFocusable = targetView.querySelector('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                setTimeout(() => firstFocusable.focus(), 150);
            }
        } else {
            console.error('❌ Vista no encontrada:', viewId);
        }
    }

    const QUESTIONS = {
        math: [
            {"question": "¿Cuánto es 2x + 5 = 15?", "options": ["x = 7", "x = 4", "x = 5", "x = 10"], "answer": 2, "difficulty": "Fácil"},
            {"question": "¿Cuál es el valor de x en 3x - 7 = 2x + 5?", "options": ["x = 3", "x = 12", "x = 7", "x = 6"], "answer": 1, "difficulty": "Fácil"},
            {"question": "Resuelve: 5(x - 2) = 15", "options": ["x = 3", "x = 5", "x = 7", "x = 4"], "answer": 1, "difficulty": "Medio"},
            {"question": "¿Cuál es la raíz cuadrada de 144?", "options": ["10", "11", "12", "13"], "answer": 2, "difficulty": "Fácil"},
            {"question": "¿Cuánto es 15% de 200?", "options": ["25", "30", "35", "40"], "answer": 1, "difficulty": "Fácil"},
            {"question": "Si x² = 49, ¿cuál es el valor de x?", "options": ["6", "7", "8", "9"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuál es el resultado de 8 × 7?", "options": ["54", "56", "58", "60"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuánto es 3/4 + 1/2?", "options": ["5/4", "5/6", "7/8", "1"], "answer": 0, "difficulty": "Medio"},
            {"question": "Si un triángulo tiene ángulos de 60°, 60° y x, ¿cuánto vale x?", "options": ["40°", "50°", "60°", "70°"], "answer": 2, "difficulty": "Fácil"},
            {"question": "¿Cuál es el perímetro de un cuadrado de lado 5 cm?", "options": ["15 cm", "20 cm", "25 cm", "30 cm"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuánto es 2³?", "options": ["6", "8", "9", "12"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuál es el área de un rectángulo de 6 cm × 4 cm?", "options": ["20 cm²", "24 cm²", "28 cm²", "30 cm²"], "answer": 1, "difficulty": "Fácil"},
            {"question": "Resuelve: 10 - 3 × 2", "options": ["4", "5", "14", "7"], "answer": 0, "difficulty": "Medio"},
            {"question": "¿Cuánto es 0.5 × 100?", "options": ["5", "50", "500", "0.5"], "answer": 1, "difficulty": "Fácil"},
            {"question": "Si 2x + 3 = 11, ¿cuál es x?", "options": ["3", "4", "5", "6"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuál es el MCD de 12 y 18?", "options": ["3", "6", "9", "12"], "answer": 1, "difficulty": "Medio"},
            {"question": "¿Cuántos grados hay en un círculo completo?", "options": ["180°", "270°", "360°", "450°"], "answer": 2, "difficulty": "Fácil"},
            {"question": "¿Cuál es el valor de π aproximadamente?", "options": ["2.14", "3.14", "4.14", "5.14"], "answer": 1, "difficulty": "Fácil"},
            {"question": "Si 5x = 35, ¿cuánto vale x?", "options": ["5", "6", "7", "8"], "answer": 2, "difficulty": "Fácil"},
        ],
        geometry: [
            {"question": "¿Cuántos lados tiene un octógono?", "options": ["6", "8", "10", "12"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuántos grados tiene un ángulo recto?", "options": ["45°", "60°", "90°", "180°"], "answer": 2, "difficulty": "Fácil"},
            {"question": "¿Cuántas caras tiene un cubo?", "options": ["4", "6", "8", "12"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cómo se llama un polígono de 5 lados?", "options": ["Hexágono", "Pentágono", "Heptágono", "Octágono"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuál es la suma de los ángulos internos de un triángulo?", "options": ["90°", "180°", "270°", "360°"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuántos vértices tiene un tetraedro?", "options": ["3", "4", "5", "6"], "answer": 1, "difficulty": "Medio"},
            {"question": "¿Cómo se llama un triángulo con todos sus lados iguales?", "options": ["Isósceles", "Escaleno", "Equilátero", "Rectángulo"], "answer": 2, "difficulty": "Fácil"},
            {"question": "¿Cuál es el área de un círculo con radio 3? (π ≈ 3.14)", "options": ["9.42", "18.84", "28.26", "37.68"], "answer": 2, "difficulty": "Medio"},
            {"question": "¿Cuántos lados tiene un hexágono?", "options": ["5", "6", "7", "8"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cómo se llama una línea que toca un círculo en un solo punto?", "options": ["Secante", "Tangente", "Cuerda", "Radio"], "answer": 1, "difficulty": "Medio"},
            {"question": "¿Cuántas aristas tiene un cubo?", "options": ["6", "8", "10", "12"], "answer": 3, "difficulty": "Medio"},
            {"question": "¿Cuántos grados tiene un ángulo obtuso?", "options": ["Menos de 90°", "Exactamente 90°", "Entre 90° y 180°", "Más de 180°"], "answer": 2, "difficulty": "Fácil"},
            {"question": "¿Cuál es el volumen de un cubo de lado 3 cm?", "options": ["9 cm³", "18 cm³", "27 cm³", "36 cm³"], "answer": 2, "difficulty": "Medio"},
            {"question": "¿Cómo se llama un polígono de 10 lados?", "options": ["Nonágono", "Decágono", "Undecágono", "Dodecágono"], "answer": 1, "difficulty": "Medio"},
            {"question": "¿Cuántos ejes de simetría tiene un círculo?", "options": ["1", "2", "4", "Infinitos"], "answer": 3, "difficulty": "Medio"},
            {"question": "¿Cuál es el perímetro de un triángulo equilátero de lado 6 cm?", "options": ["12 cm", "18 cm", "24 cm", "30 cm"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cómo se llama un ángulo mayor a 180°?", "options": ["Agudo", "Obtuso", "Llano", "Cóncavo"], "answer": 3, "difficulty": "Medio"},
            {"question": "¿Cuántos lados tiene un dodecágono?", "options": ["10", "11", "12", "13"], "answer": 2, "difficulty": "Medio"},
            {"question": "¿Cuál es la diagonal de un cuadrado de lado 5 cm? (aprox.)", "options": ["5 cm", "7.07 cm", "10 cm", "12 cm"], "answer": 1, "difficulty": "Difícil"},
            {"question": "¿Cuántos grados tiene cada ángulo interno de un hexágono regular?", "options": ["90°", "108°", "120°", "135°"], "answer": 2, "difficulty": "Difícil"}
        ],
        statistics: [
            {"question": "¿Cuál es la media de 2, 4, 6, 8?", "options": ["4", "5", "6", "7"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Qué mide la mediana en un conjunto de datos?", "options": ["El promedio", "El valor central", "El más frecuente", "La dispersión"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuál es la moda de: 1, 2, 2, 3, 4?", "options": ["1", "2", "3", "4"], "answer": 1, "difficulty": "Fácil"},
            {"question": "Si tienes los datos 5, 10, 15, ¿cuál es la media?", "options": ["8", "10", "12", "15"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Qué representa la desviación estándar?", "options": ["El promedio", "La dispersión", "El valor máximo", "La mediana"], "answer": 1, "difficulty": "Medio"},
            {"question": "¿Cuál es el rango de: 3, 7, 12, 15?", "options": ["9", "12", "15", "18"], "answer": 1, "difficulty": "Fácil"},
            {"question": "En estadística, ¿qué es un outlier?", "options": ["Promedio", "Valor atípico", "Mediana", "Moda"], "answer": 1, "difficulty": "Medio"},
            {"question": "¿Cuál es la probabilidad de sacar un 6 en un dado?", "options": ["1/2", "1/3", "1/6", "1/12"], "answer": 2, "difficulty": "Fácil"},
            {"question": "¿Cuántos elementos tiene una muestra de 20 datos?", "options": ["10", "15", "20", "25"], "answer": 2, "difficulty": "Fácil"},
            {"question": "¿Qué tipo de gráfico usa barras verticales?", "options": ["Circular", "De barras", "De líneas", "De dispersión"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuál es la mediana de: 1, 3, 5, 7, 9?", "options": ["3", "5", "7", "9"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Qué porcentaje es 25 de 100?", "options": ["20%", "25%", "30%", "35%"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuántas caras tiene un dado estándar?", "options": ["4", "6", "8", "12"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuál es la probabilidad de sacar cara en una moneda?", "options": ["1/4", "1/3", "1/2", "2/3"], "answer": 2, "difficulty": "Fácil"},
            {"question": "¿Qué es una variable cualitativa?", "options": ["Numérica", "Categórica", "Continua", "Discreta"], "answer": 1, "difficulty": "Medio"},
            {"question": "¿Cuál es la frecuencia relativa de 5 en 20 datos?", "options": ["0.15", "0.25", "0.35", "0.45"], "answer": 1, "difficulty": "Medio"},
            {"question": "¿Cómo se llama el gráfico circular?", "options": ["Histograma", "Diagrama de sectores", "Polígono", "Ojiva"], "answer": 1, "difficulty": "Fácil"},
            {"question": "Si lanzas 2 monedas, ¿cuál es la probabilidad de obtener 2 caras?", "options": ["1/2", "1/3", "1/4", "1/6"], "answer": 2, "difficulty": "Medio"},
            {"question": "¿Qué mide el coeficiente de variación?", "options": ["Promedio", "Dispersión relativa", "Tendencia central", "Asimetría"], "answer": 1, "difficulty": "Difícil"},
            {"question": "En un grupo de 50 personas, 20 prefieren café. ¿Qué porcentaje prefiere café?", "options": ["30%", "35%", "40%", "45%"], "answer": 2, "difficulty": "Fácil"}
        ]
    };

    const THEMES = [
        { key: 'math', name: 'Matemáticas', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', icon: '📐' },
        { key: 'geometry', name: 'Geometría', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '📏' },
        { key: 'statistics', name: 'Estadística', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', icon: '📊' }
    ];


    let currentGame = {
        theme: '',
        themeName: '',
        questions: [],
        currentIndex: 0,
        score: 0,
        startTime: 0,
        timer: null,
        timeRemaining: 240
    };


    function createConfetti() {
        const colors = ['#4facfe', '#00f2fe', '#667eea', '#764ba2', '#f093fb', '#f5576c'];
        const confettiCount = 50;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}%;
                top: -10px;
                opacity: 1;
                transform: rotate(${Math.random() * 360}deg);
                pointer-events: none;
                z-index: 100000;
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            `;
            document.body.appendChild(confetti);

            const fall = confetti.animate([
                { transform: `translateY(0) rotate(0deg)`, opacity: 1 },
                { transform: `translateY(${window.innerHeight + 20}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
            ], {
                duration: 2000 + Math.random() * 1000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });

            fall.onfinish = () => confetti.remove();
        }
    }


    document.addEventListener('DOMContentLoaded', function() {
        console.log('%c✅ DOM Cargado, inicializando sistema...', 'color: #00ff00; font-size: 14px; font-weight: bold');


        const btnGoLogin = document.getElementById('btn-go-login');
        const btnGoRegister = document.getElementById('btn-go-register');

        if (btnGoLogin) btnGoLogin.addEventListener('click', () => showView('login-view'));
        if (btnGoRegister) btnGoRegister.addEventListener('click', () => showView('register-view'));


        const loginUser = document.getElementById('login-user');
        const loginPass = document.getElementById('login-pass');
        const loginError = document.getElementById('login-error');
        const btnLoginSubmit = document.getElementById('btn-login-submit');
        const btnLoginBack = document.getElementById('btn-login-back');


        const loginTogglePassword = document.querySelector('#login-view .toggle-password');
        if (loginTogglePassword && loginPass) {
            loginTogglePassword.addEventListener('click', function() {
                const type = loginPass.type === 'password' ? 'text' : 'password';
                loginPass.type = type;
                this.setAttribute('aria-pressed', type === 'text');
                this.querySelector('span').textContent = type === 'password' ? '👁️' : '🙈';
            });
        }

        if (btnLoginSubmit) {
            btnLoginSubmit.addEventListener('click', async function(e) {
                e.preventDefault();

                const username = loginUser.value.trim();
                const password = loginPass.value;

                loginError.textContent = '';
                loginUser.classList.remove('error');
                loginPass.classList.remove('error');

                if (!username || !password) {
                    loginError.textContent = 'Completa todos los campos';
                    if (!username) loginUser.classList.add('error');
                    if (!password) loginPass.classList.add('error');
                    return;
                }

                LoadingButton.start(this);

                const result = await AuthSystem.login(username, password);

                if (result.success) {
                    LoadingButton.stop(this, true, '¡Bienvenido!');
                    Toast.show(`¡Bienvenido, ${username}! 🎉`, 'success');

                    document.getElementById('welcome-user').textContent = `¡Bienvenido/a, ${Utils.sanitize(username)}!`;
                    loginUser.value = '';
                    loginPass.value = '';
                    loginError.textContent = '';

                    setTimeout(() => showView('menu-view'), 1000);
                } else {
                    LoadingButton.stop(this, false);
                    loginError.textContent = result.message;
                    Toast.show(result.message, 'error');
                    loginUser.classList.add('error');
                    loginPass.classList.add('error');
                }
            });
        }

        if (loginPass && btnLoginSubmit) {
            loginPass.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') btnLoginSubmit.click();
            });
        }

        if (btnLoginBack) {
            btnLoginBack.addEventListener('click', () => {
                loginUser.value = '';
                loginPass.value = '';
                loginError.textContent = '';
                loginUser.classList.remove('error');
                loginPass.classList.remove('error');
                showView('welcome-view');
            });
        }


        const registerUser = document.getElementById('register-user');
        const registerPass = document.getElementById('register-pass');
        const registerPassConfirm = document.getElementById('register-pass-confirm');
        const registerError = document.getElementById('register-error');
        const btnRegisterSubmit = document.getElementById('btn-register-submit');
        const btnRegisterBack = document.getElementById('btn-register-back');
        const strengthFill = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');

        const registerTogglePassword = document.querySelector('#register-view .toggle-password');
        if (registerTogglePassword && registerPass) {
            registerTogglePassword.addEventListener('click', function() {
                const type = registerPass.type === 'password' ? 'text' : 'password';
                registerPass.type = type;
                registerPassConfirm.type = type;
                this.setAttribute('aria-pressed', type === 'text');
                this.querySelector('span').textContent = type === 'password' ? '👁️' : '🙈';
            });
        }

        if (registerPass && strengthFill && strengthText) {
            registerPass.addEventListener('input', Utils.debounce(function() {
                const strength = Utils.getPasswordStrength(this.value);
                strengthFill.setAttribute('data-strength', strength);
                strengthText.textContent = Utils.getPasswordStrengthText(strength);
            }, 300));
        }

        if (btnRegisterSubmit) {
            btnRegisterSubmit.addEventListener('click', async function(e) {
                e.preventDefault();

                const username = registerUser.value.trim();
                const password = registerPass.value;
                const passwordConfirm = registerPassConfirm.value;

                registerError.textContent = '';
                registerUser.classList.remove('error');
                registerPass.classList.remove('error');
                registerPassConfirm.classList.remove('error');

                if (!username || !password || !passwordConfirm) {
                    registerError.textContent = 'Completa todos los campos';
                    if (!username) registerUser.classList.add('error');
                    if (!password) registerPass.classList.add('error');
                    if (!passwordConfirm) registerPassConfirm.classList.add('error');
                    return;
                }

                if (password !== passwordConfirm) {
                    registerError.textContent = 'Las contraseñas no coinciden';
                    registerPass.classList.add('error');
                    registerPassConfirm.classList.add('error');
                    return;
                }

                LoadingButton.start(this);

                const result = await AuthSystem.register(username, password);

                if (result.success) {
                    await AuthSystem.login(username, password);

                    LoadingButton.stop(this, true, '¡Cuenta creada!');
                    Toast.show(`¡Cuenta creada exitosamente, ${username}! 🎉`, 'success');
                    createConfetti();

                    document.getElementById('welcome-user').textContent = `¡Bienvenido/a, ${Utils.sanitize(username)}!`;
                    registerUser.value = '';
                    registerPass.value = '';
                    registerPassConfirm.value = '';
                    registerError.textContent = '';
                    if (strengthFill) strengthFill.setAttribute('data-strength', '0');
                    if (strengthText) strengthText.textContent = 'Sin contraseña';

                    setTimeout(() => showView('menu-view'), 1200);
                } else {
                    LoadingButton.stop(this, false);
                    registerError.textContent = result.message;
                    Toast.show(result.message, 'error');
                }
            });
        }

        if (registerPassConfirm && btnRegisterSubmit) {
            registerPassConfirm.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') btnRegisterSubmit.click();
            });
        }

        if (btnRegisterBack) {
            btnRegisterBack.addEventListener('click', () => {
                registerUser.value = '';
                registerPass.value = '';
                registerPassConfirm.value = '';
                registerError.textContent = '';
                registerUser.classList.remove('error');
                registerPass.classList.remove('error');
                registerPassConfirm.classList.remove('error');
                if (strengthFill) strengthFill.setAttribute('data-strength', '0');
                if (strengthText) strengthText.textContent = 'Sin contraseña';
                showView('welcome-view');
            });
        }

        const btnPlay = document.getElementById('btn-play');
        const btnHistory = document.getElementById('btn-history');
        const btnLogout = document.getElementById('btn-logout');

        if (btnPlay) {
            btnPlay.addEventListener('click', () => {
                const themeButtons = document.getElementById('theme-buttons');
                themeButtons.innerHTML = '';
                
                THEMES.forEach(theme => {
                    const btn = document.createElement('button');
                    btn.className = 'btn';
                    btn.innerHTML = `<span class="btn-icon">${theme.icon}</span><span>${theme.name}</span>`;
                    btn.style.background = theme.color;
                    btn.style.border = 'none';
                    btn.addEventListener('click', () => startGame(theme.key, theme.name));
                    themeButtons.appendChild(btn);
                });
                
                showView('select-theme-view');
            });
        }

        const btnThemeBack = document.getElementById('btn-theme-back');
        if (btnThemeBack) {
            btnThemeBack.addEventListener('click', () => showView('menu-view'));
        }

        if (btnHistory) {
            btnHistory.addEventListener('click', () => {
                displayHistory();
                showView('history-view');
            });
        }

        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                if (confirm('¿Seguro que deseas cerrar sesión?')) {
                    AuthSystem.logout();
                    Toast.show('Sesión cerrada correctamente', 'info');
                    showView('welcome-view');
                }
            });
        }

        function startGame(themeKey, themeName) {
            currentGame.theme = themeKey;
            currentGame.themeName = themeName;
            currentGame.questions = [...QUESTIONS[themeKey]]
                .sort(() => 0.5 - Math.random())
                .slice(0, 20);
            currentGame.currentIndex = 0;
            currentGame.score = 0;
            currentGame.startTime = Date.now();
            currentGame.timeRemaining = 240;

            showView('playing-view');
            displayQuestion();
        }

        function displayQuestion() {
            if (currentGame.currentIndex >= currentGame.questions.length) {
                endGame();
                return;
            }

            const q = currentGame.questions[currentGame.currentIndex];

            document.getElementById('question').textContent = q.question;
            document.getElementById('difficulty').textContent = q.difficulty;
            document.getElementById('score').textContent = `${currentGame.score} / ${currentGame.questions.length}`;
            document.getElementById('question-counter').textContent = `${currentGame.currentIndex + 1} / ${currentGame.questions.length}`;

            const diffBadge = document.getElementById('difficulty');
            diffBadge.style.background = q.difficulty === 'Fácil'
                ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                : q.difficulty === 'Medio'
                ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';

            const progress = ((currentGame.currentIndex + 1) / currentGame.questions.length) * 100;
            const progressFill = document.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }

            const optionsContainer = document.getElementById('options');
            optionsContainer.innerHTML = '';

            q.options.forEach((opt, i) => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = opt;
                btn.setAttribute('role', 'radio');
                btn.setAttribute('aria-checked', 'false');
                btn.addEventListener('click', () => selectAnswer(i));
                optionsContainer.appendChild(btn);
            });

            startTimer();
        }

        function startTimer() {
            TimerManager.clearAll();
            currentGame.timeRemaining = 240;
            document.getElementById('timer').textContent = currentGame.timeRemaining;

            currentGame.timer = TimerManager.create(() => {
                currentGame.timeRemaining--;
                document.getElementById('timer').textContent = currentGame.timeRemaining;

                if (currentGame.timeRemaining <= 0) {
                    TimerManager.clear(currentGame.timer);
                    selectAnswer(-1);
                }
            }, 1000);
        }

        function selectAnswer(selectedIndex) {
            TimerManager.clear(currentGame.timer);

            const q = currentGame.questions[currentGame.currentIndex];
            const isCorrect = selectedIndex === q.answer;

            const feedbackModal = document.getElementById('feedback-modal');
            const feedbackIcon = document.getElementById('feedback-icon');
            const feedbackTitle = document.getElementById('feedback-title');
            const feedbackText = document.getElementById('feedback-text');

            if (isCorrect) {
                currentGame.score++;
                feedbackIcon.textContent = '✅';
                feedbackTitle.textContent = '¡Correcto!';
                feedbackTitle.style.color = '#00f2fe';
                feedbackText.textContent = '¡Excelente! +1 punto';
            } else if (selectedIndex === -1) {
                feedbackIcon.textContent = '⏰';
                feedbackTitle.textContent = '¡Tiempo Agotado!';
                feedbackTitle.style.color = '#fa709a';
                feedbackText.textContent = `Respuesta correcta: ${q.options[q.answer]}`;
            } else {
                feedbackIcon.textContent = '❌';
                feedbackTitle.textContent = 'Incorrecto';
                feedbackTitle.style.color = '#fa709a';
                feedbackText.textContent = `Respuesta correcta: ${q.options[q.answer]}`;
            }

            Array.from(document.getElementById('options').children).forEach((btn, i) => {
                btn.classList.add('disabled');
                if (i === q.answer) btn.classList.add('correct');
                else if (i === selectedIndex) btn.classList.add('incorrect');
            });

            feedbackModal.classList.add('active');
        }

        const btnNext = document.getElementById('btn-next');
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                const modal = document.getElementById('feedback-modal');
                if (modal) modal.classList.remove('active');
                currentGame.currentIndex++;
                displayQuestion();
            });
        }

        const btnPause = document.getElementById('btn-pause');
        if (btnPause) {
            btnPause.addEventListener('click', () => {
                const modal = document.getElementById('pause-modal');
                if (modal) modal.classList.add('active');
            });
        }

        const btnResume = document.getElementById('btn-resume');
        if (btnResume) {
            btnResume.addEventListener('click', () => {
                const modal = document.getElementById('pause-modal');
                if (modal) modal.classList.remove('active');
            });
        }

        const btnQuit = document.getElementById('btn-quit');
        if (btnQuit) {
            btnQuit.addEventListener('click', () => {
                if (confirm('¿Abandonar el quiz actual?')) {
                    TimerManager.clearAll();
                    const modal = document.getElementById('pause-modal');
                    if (modal) modal.classList.remove('active');
                    showView('menu-view');
                }
            });
        }

        function calculateGrade(score) {
            const gradeMap = {
                0: 0.0, 1: 0.2, 2: 0.5, 3: 0.7, 4: 1.0, 5: 1.2, 6: 1.5, 7: 1.7, 8: 2.0, 9: 2.2,
                10: 2.5, 11: 2.7, 12: 3.0, 13: 3.2, 14: 3.5, 15: 3.7, 16: 4.0, 17: 4.2, 18: 4.5, 19: 4.7, 20: 5.0
            };
            return gradeMap[score] || 0.0;
        }

        function endGame() {
            TimerManager.clearAll();
            const timeTotal = Math.round((Date.now() - currentGame.startTime) / 1000);
            const grade = calculateGrade(currentGame.score);

            document.getElementById('final-score').textContent = `${currentGame.score} / ${currentGame.questions.length}`;
            document.getElementById('final-grade').textContent = grade.toFixed(1);

            const resultMessage = document.getElementById('result-message');
            if (grade >= 4.5) {
                resultMessage.textContent = '¡Sobresaliente! 🏆 Dominas perfectamente el tema.';
            } else if (grade >= 3.5) {
                resultMessage.textContent = '¡Muy bien! 🎯 Sigue así, vas por buen camino.';
            } else if (grade >= 3.0) {
                resultMessage.textContent = 'Buen trabajo. 📚 Con práctica mejorarás aún más.';
            } else {
                resultMessage.textContent = 'Sigue practicando. 💪 ¡Tú puedes mejorar!';
            }

            const username = AuthSystem.getSession();
            GameDB.saveScore(username, currentGame.themeName, currentGame.score, currentGame.questions.length, timeTotal, grade);

            Toast.show(`Quiz completado: ${grade.toFixed(1)}/5.0 🎉`, 'success');
            if (grade >= 4.5) createConfetti();
            showView('result-view');
        }

        const btnResultBack = document.getElementById('btn-result-back');
        if (btnResultBack) {
            btnResultBack.addEventListener('click', () => showView('menu-view'));
        }

        function displayHistory() {
            const username = AuthSystem.getSession();
            const topGlobal = GameDB.getTopScores(10);
            const myHistory = GameDB.getUserHistory(username);

            const topContainer = document.getElementById('top-global');
            const myContainer = document.getElementById('my-history');

            topContainer.innerHTML = topGlobal.length === 0
                ? '<p class="empty-state">No hay partidas aún 🏆</p>'
                : topGlobal.map((p, index) => createHistoryEntry(p, true, index + 1)).join('');

            myContainer.innerHTML = myHistory.length === 0
                ? '<p class="empty-state">Juega para ver tu progreso 📊</p>'
                : myHistory.reverse().map(p => createHistoryEntry(p, false)).join('');

            document.getElementById('my-history-count').textContent = `${myHistory.length} partida${myHistory.length !== 1 ? 's' : ''}`;

            const deleteBtn = document.getElementById('btn-delete-history');
            if (deleteBtn) {
                deleteBtn.style.display = myHistory.length > 0 ? 'inline-flex' : 'none';
            }
        }

        function createHistoryEntry(p, showUser, rank) {
            const color = p.grade >= 4.0 ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                : p.grade >= 3.0 ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';

            const initial = showUser ? p.username.charAt(0).toUpperCase() : p.theme.charAt(0).toUpperCase();
            const name = showUser ? Utils.sanitize(p.username) : Utils.sanitize(p.theme);
            const rankBadge = rank ? `<span style="font-size: 0.8rem; opacity: 0.7;">#${rank}</span>` : '';

            return `
                <div class="history-entry">
                    <div class="entry-avatar" style="background: ${color};">${initial}</div>
                    <div class="entry-info">
                        <p class="tema">${name} ${rankBadge}</p>
                        <p class="fecha">${Utils.formatDate(p.date)} • ${p.grade.toFixed(1)}/5.0</p>
                    </div>
                    <div class="entry-score">${p.score}/${p.totalQuestions}</div>
                </div>
            `;
        }

        const btnHistoryBack = document.getElementById('btn-history-back');
        if (btnHistoryBack) {
            btnHistoryBack.addEventListener('click', () => showView('menu-view'));
        }

        const btnDeleteHistory = document.getElementById('btn-delete-history');
        if (btnDeleteHistory) {
            btnDeleteHistory.addEventListener('click', () => {
                const username = AuthSystem.getSession();
                const myHistory = GameDB.getUserHistory(username);

                if (myHistory.length === 0) {
                    Toast.show('No hay historial para borrar', 'info');
                    return;
                }

                const confirmMsg = `⚠️ ¿Borrar todo tu historial?\n\nSe eliminarán ${myHistory.length} partida(s).\n\nEsta acción NO se puede deshacer.`;

                if (confirm(confirmMsg)) {
                    GameDB.deleteUserHistory(username);
                    Toast.show('✅ Historial borrado exitosamente', 'success');
                    displayHistory();
                }
            });
        }
        if (AuthSystem.isLoggedIn()) {
            const username = AuthSystem.getSession();
            document.getElementById('welcome-user').textContent = `¡Bienvenido/a, ${Utils.sanitize(username)}!`;
            showView('menu-view');
        } else {
            showView('welcome-view');
        }

        console.log('%c✅ Mathware Pro v5.0 ULTRA - Sistema cargado completamente', 'color: #00ff00; font-size: 16px; font-weight: bold');
        console.log('%c💡 Escribe mathware.help() en consola para ver comandos disponibles', 'color: #4facfe; font-size: 12px');

        window.mathware = {
            help() {
                console.log('%c📖 COMANDOS DISPONIBLES:', 'color: #4facfe; font-size: 16px; font-weight: bold');
                console.log('mathware.stats() - Ver estadísticas generales');
                console.log('mathware.users() - Ver lista de usuarios');
                console.log('mathware.top() - Ver top 10 puntajes');
                console.log('mathware.reset() - Resetear todas las puntuaciones');
                console.log('mathware.backup() - Crear backup de datos');
            },
            stats() {
                const db = GameDB.getDB();
                console.log('%c📊 ESTADÍSTICAS GENERALES', 'color: #4facfe; font-size: 16px; font-weight: bold');
                console.log('📈 Total de partidas:', db.partidas.length);
                if (db.partidas.length > 0) {
                    const avgScore = (db.partidas.reduce((s, p) => s + p.score, 0) / db.partidas.length).toFixed(1);
                    const avgGrade = (db.partidas.reduce((s, p) => s + p.grade, 0) / db.partidas.length).toFixed(2);
                    console.log('📊 Promedio puntaje:', avgScore + '/20');
                    console.log('📊 Promedio nota:', avgGrade + '/5.0');
                    console.log('👥 Jugadores únicos:', new Set(db.partidas.map(p => p.username)).size);
                }
            },
            users() {
                const users = AuthSystem.getUsers();
                console.table(Object.keys(users).map(u => ({ usuario: u, creado: Utils.formatDate(users[u].createdAt) })));
            },
            top() {
                const top = GameDB.getTopScores(10);
                console.table(top);
            },
            reset() {
                if (confirm('⚠️ ¿Resetear TODAS las puntuaciones? Esta acción NO se puede deshacer.')) {
                    localStorage.removeItem(GameDB.DB_KEY);
                    localStorage.removeItem(GameDB.INDEX_KEY);
                    console.log('✅ Puntuaciones reseteadas');
                    Toast.show('Puntuaciones reseteadas', 'success');
                }
            },
            backup() {
                const data = {
                    users: AuthSystem.getUsers(),
                    scores: GameDB.getDB(),
                    date: new Date().toISOString()
                };
                console.log('💾 BACKUP GENERADO:');
                console.log(JSON.stringify(data, null, 2));
                Toast.show('Backup generado en consola', 'success');
            }
        };
    });

})();
