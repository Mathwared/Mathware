// ==========================================
// MATHWARE PRO - Sistema Completo v4.0
// Continuación desde Registro
// ==========================================

(function() {
    'use strict';
    
    console.log('%c🚀 Mathware Pro v4.0 Iniciando...', 'color: #4facfe; font-size: 16px; font-weight: bold');
    
    // ========== UTILIDADES ==========
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
                day: 'numeric'
            }).format(date);
        }
    };
    
    // ========== GESTIÓN DE TIMERS ==========
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
    
    // ========== SISTEMA DE TOAST ==========
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
        
        show(message, type = 'info', duration = 3000) {
            this.init();
            
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.setAttribute('role', 'alert');
            
            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
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
    
    // ========== LOADING BUTTON ==========
    const LoadingButton = {
        start(button) {
            button.disabled = true;
            button.classList.add('loading');
            button.dataset.originalText = button.querySelector('.btn-text')?.textContent || button.textContent;
        },
        
        stop(button, success = true, message = '') {
            button.disabled = false;
            button.classList.remove('loading');
            
            const textElement = button.querySelector('.btn-text');
            
            if (success && message) {
                button.classList.add('success-flash');
                if (textElement) {
                    textElement.textContent = message;
                }
                
                setTimeout(() => {
                    button.classList.remove('success-flash');
                    if (textElement) {
                        textElement.textContent = button.dataset.originalText;
                    }
                }, 2000);
            } else if (!success) {
                button.classList.add('error-flash');
                setTimeout(() => button.classList.remove('error-flash'), 500);
            }
        }
    };
    
    // ========== SISTEMA DE AUTENTICACIÓN SEGURO ==========
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
                return { hash: password, salt: 'fallback' };
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
            
            const { hash, salt } = await this.hashPassword(password);
            
            users[username] = {
                passwordHash: hash,
                salt: salt,
                createdAt: new Date().toISOString()
            };
            
            this.saveUsers(users);
            return { success: true };
        },
        
        async login(username, password) {
            username = username.trim();
            const users = this.getUsers();
            
            if (!users[username]) {
                await Utils.delay(500);
                return { success: false, message: 'Usuario o contraseña incorrectos' };
            }
            
            const user = users[username];
            const { hash } = await this.hashPassword(password, user.salt);
            
            if (hash !== user.passwordHash) {
                await Utils.delay(500);
                return { success: false, message: 'Usuario o contraseña incorrectos' };
            }
            
            localStorage.setItem(this.SESSION_KEY, username);
            return { success: true };
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
    
    // ========== SISTEMA DE PUNTUACIONES ==========
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
        }
    };
    
    // ========== NAVEGACIÓN ==========
    function showView(viewId) {
        console.log('Mostrando vista:', viewId);
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
            
            const firstFocusable = targetView.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                setTimeout(() => firstFocusable.focus(), 100);
            }
        } else {
            console.error('Vista no encontrada:', viewId);
        }
    }
    
    // ========== VALIDACIÓN EN TIEMPO REAL ==========
    function setupPasswordStrength(passwordInput) {
        const strengthFill = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');
        
        if (!strengthFill || !strengthText) return;
        
        passwordInput.addEventListener('input', function() {
            const value = this.value;
            const checks = [
                { test: /.{8,}/, weight: 1 },
                { test: /[A-Z]/, weight: 1 },
                { test: /[a-z]/, weight: 1 },
                { test: /[0-9]/, weight: 1 },
                { test: /[^A-Za-z0-9]/, weight: 1 }
            ];
            
            let passed = 0;
            checks.forEach(check => {
                if (check.test.test(value)) passed += check.weight;
            });
            
            const strength = (passed / checks.length) * 100;
            strengthFill.style.width = `${strength}%`;
            strengthFill.dataset.strength = passed;
            
            const labels = ['Sin contraseña', 'Muy débil', 'Débil', 'Regular', 'Buena', 'Excelente'];
            strengthText.textContent = value.length === 0 ? labels[0] : labels[passed] || labels[1];
        });
    }
    
    function setupPasswordToggle(toggleBtn, passwordInput) {
        toggleBtn.addEventListener('click', function() {
            const isPressed = this.getAttribute('aria-pressed') === 'true';
            
            if (isPressed) {
                passwordInput.type = 'password';
                this.setAttribute('aria-pressed', 'false');
                this.setAttribute('aria-label', 'Mostrar contraseña');
            } else {
                passwordInput.type = 'text';
                this.setAttribute('aria-pressed', 'true');
                this.setAttribute('aria-label', 'Ocultar contraseña');
            }
        });
    }
    
    // ========== DATOS DE PREGUNTAS ==========
    const QUESTIONS = {
        math: [
            {"question": "¿Cuánto es 2x+5=15?", "options": ["x=7", "x=4", "x=5", "x=10"], "answer": 2, "difficulty": "Fácil"},
            {"question": "¿Cuál es el valor de x en 3x−7=2x+5?", "options": ["x=3", "x=12", "x=7", "x=6"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuál es el resultado para 2x+4=10?", "options": ["x=6", "x=3", "x=2", "x=7"], "answer": 1, "difficulty": "Media"},
            {"question": "¿Cuánto vale x si 2x+4=x+9?", "options": ["x=5", "x=3", "x=7", "x=9"], "answer": 0, "difficulty": "Media"},
            {"question": "¿Cuál es la raíz cuadrada de 81?", "options": ["7", "8", "9", "10"], "answer": 2, "difficulty": "Media"},
            {"question": "Resuelve: (8 + 3) × 2 - 5", "options": ["17", "19", "21", "23"], "answer": 0, "difficulty": "Media"},
            {"question": "¿Cuál es el 25% de 5000?", "options": ["850", "1250", "725", "1300"], "answer": 1, "difficulty": "Media"},
            {"question": "¿Cuál es el valor de x en 4x+7=3x+15?", "options": ["x=5", "x=8", "x=7", "x=6"], "answer": 1, "difficulty": "Media"},
            {"question": "Área de un triángulo de base 12 cm y altura 8 cm:", "options": ["86 cm²", "100 cm²", "48 cm²", "96 cm²"], "answer": 2, "difficulty": "Media"},
            {"question": "Área de un triángulo con base 10 cm y altura 6 cm:", "options": ["20 cm²", "30 cm²", "40 cm²", "50 cm²"], "answer": 1, "difficulty": "Media"},
            {"question": "¿7×7+8-2?", "options": ["55", "57", "59", "63"], "answer": 0, "difficulty": "Fácil"},
            {"question": "¿Cuál es el doble de 12?", "options": ["10", "22", "20", "24"], "answer": 3, "difficulty": "Fácil"},
            {"question": "Mitad de 42 es:", "options": ["20", "21", "24", "18"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuánto es 45 ÷ 5?", "options": ["8", "9", "5", "7"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuánto es el MCD de 18 y 24?", "options": ["6", "12", "24", "3"], "answer": 0, "difficulty": "Media"},
            {"question": "¿Cuánto es el mcm de 12 y 15?", "options": ["30", "60", "45", "15"], "answer": 2, "difficulty": "Media"},
            {"question": "¿Cuál es el número primo entre 10 y 20?", "options": ["11", "12", "18", "20"], "answer": 0, "difficulty": "Fácil"},
            {"question": "¿Qué fracción es equivalente a 0,5?", "options": ["1/3", "1/2", "1/5", "2/3"], "answer": 1, "difficulty": "Fácil"},
            {"question": "Convierte 0,2 en fracción:", "options": ["1/2", "1/3", "1/4", "1/5"], "answer": 3, "difficulty": "Fácil"},
            {"question": "¿Cuánto es 12²?", "options": ["124", "144", "121", "122"], "answer": 1, "difficulty": "Media"}
        ],
        geometry: [
            {"question": "¿Cuántos lados tiene un octógono?", "options": ["6", "8", "10", "12"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuál es el área de un cuadrado de lado 9?", "options": ["18", "36", "81", "27"], "answer": 2, "difficulty": "Fácil"},
            {"question": "¿Cuántos grados tiene un triángulo?", "options": ["360", "180", "90", "120"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cómo se llama una figura de 5 lados?", "options": ["Hexágono", "Pentágono", "Cuadrado", "Trapecio"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿La suma de ángulos internos de un pentágono?", "options": ["560°", "360°", "540°", "720°"], "answer": 2, "difficulty": "Media"},
            {"question": "¿Área de un rectángulo de base 7 y altura 3?", "options": ["10", "21", "24", "18"], "answer": 1, "difficulty": "Media"},
            {"question": "¿Perímetro de un círculo?", "options": ["πr²", "2πr", "πd", "2r"], "answer": 1, "difficulty": "Media"},
            {"question": "¿Un cubo tiene cuántas caras?", "options": ["6", "8", "4", "12"], "answer": 0, "difficulty": "Fácil"},
            {"question": "¿Nombre de un polígono con 10 lados?", "options": ["Hexágono", "Heptágono", "Decágono", "Nonágono"], "answer": 2, "difficulty": "Fácil"},
            {"question": "¿Cuál es el volumen de un cubo de lado 4?", "options": ["64", "16", "32", "12"], "answer": 0, "difficulty": "Media"},
            {"question": "¿Cuál es el radio de un círculo con diámetro 10?", "options": ["20", "5", "15", "10"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Cuántos vértices tiene un cono?", "options": ["1", "2", "0", "3"], "answer": 0, "difficulty": "Media"},
            {"question": "¿Cuántos ángulos rectos tiene un cubo?", "options": ["8", "12", "24", "6"], "answer": 2, "difficulty": "Media"},
            {"question": "¿Ángulo de un hexágono regular?", "options": ["90°", "120°", "150°", "140°"], "answer": 1, "difficulty": "Media"},
            {"question": "¿Un triángulo escaleno tiene lados...?", "options": ["Iguales", "Desiguales", "Dos iguales", "Rectos"], "answer": 1, "difficulty": "Media"},
            {"question": "¿Nombre del polígono con 7 lados?", "options": ["Hexágono", "Heptágono", "Octógono", "Nonágono"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Ángulo recto?", "options": ["90°", "45°", "60°", "120°"], "answer": 0, "difficulty": "Fácil"},
            {"question": "¿Volumen de un prisma rectangular 2x3x4?", "options": ["12", "20", "18", "24"], "answer": 3, "difficulty": "Media"},
            {"question": "¿Área de un triángulo base 10 y altura 10?", "options": ["100", "20", "50", "10"], "answer": 2, "difficulty": "Media"},
            {"question": "¿Lados iguales de un triángulo equilátero?", "options": ["3", "6", "1", "2"], "answer": 0, "difficulty": "Media"}
        ],
        statistics: [
            {"question": "¿Cuál es la media de 2, 4, 6, 8?", "options": ["5", "6", "7", "8"], "answer": 0, "difficulty": "Fácil"},
            {"question": "¿Qué es la moda de una serie?", "options": ["Mediana", "Mayor", "Más repetido", "Menor"], "answer": 2, "difficulty": "Fácil"},
            {"question": "¿Mediana de 3, 5, 6?", "options": ["4", "5", "6", "3"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Rango de 10, 6, 2?", "options": ["8", "4", "6", "2"], "answer": 0, "difficulty": "Media"},
            {"question": "¿Media de 8, 12, 16?", "options": ["10", "15", "12", "20"], "answer": 2, "difficulty": "Media"},
            {"question": "¿Qué representa el diagrama de barras?", "options": ["Datos categóricos", "Nada", "Promedio", "Diferenciales"], "answer": 0, "difficulty": "Media"},
            {"question": "¿Qué significa probabilidad 0,2?", "options": ["2%", "20%", "80%", "0.2%"], "answer": 1, "difficulty": "Media"},
            {"question": "¿Qué gráfico para porcentajes?", "options": ["Barras", "Circular", "Puntos", "Rectas"], "answer": 1, "difficulty": "Media"},
            {"question": "¿La probabilidad de cara al lanzar una moneda?", "options": ["0,1", "0,5", "0,25", "1,0"], "answer": 1, "difficulty": "Media"},
            {"question": "¿En una encuesta, qué es población?", "options": ["Datos recolectados", "Total encuestados", "Una muestra", "Porcentaje"], "answer": 1, "difficulty": "Media"},
            {"question": "¿Cuál es la moda de 1,1,2,3,2,2?", "options": ["1", "2", "3", "0"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Mediana de 2,3,3,6?", "options": ["2", "3", "4.5", "5"], "answer": 1, "difficulty": "Fácil"},
            {"question": "¿Rango de 9, 4, 2, 8?", "options": ["8", "6", "7", "4"], "answer": 2, "difficulty": "Media"},
            {"question": "¿Qué representa un histograma?", "options": ["Intervalos de datos", "Categorías", "Reglas", "Estadísticas"], "answer": 0, "difficulty": "Media"},
            {"question": "¿Media de 7,8,9,10?", "options": ["8", "8.5", "9.5", "9"], "answer": 1, "difficulty": "Media"},
            {"question": "¿En datos 3, 7, 5, 7, 4, la moda es?", "options": ["7", "5", "3", "4"], "answer": 0, "difficulty": "Fácil"},
            {"question": "¿Para visualizar frecuencia, usamos?", "options": ["Tabla", "Recta", "Gráfico de barras", "Texto"], "answer": 2, "difficulty": "Media"},
            {"question": "¿Probabilidad, en 0-1, de evento seguro?", "options": ["1", "0", "0.5", "10"], "answer": 0, "difficulty": "Media"},
            {"question": "¿Qué es una muestra?", "options": ["Total", "Selección", "Promedio", "Nada"], "answer": 1, "difficulty": "Media"},
            {"question": "¿Qué mide la varianza?", "options": ["Diferencias versus media", "Frecuencia", "Suma", "Moda"], "answer": 0, "difficulty": "Media"}
        ]
    };
    
    const THEMES = [
        { key: 'math', name: 'Matemáticas', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
        { key: 'geometry', name: 'Geometría', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
        { key: 'statistics', name: 'Estadística', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }
    ];
    
    // ========== ESTADO DEL JUEGO ==========
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
    
    // ========== EVENT LISTENERS ==========
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ DOM Cargado, inicializando...');
        
        // ========== PANTALLA DE BIENVENIDA ==========
        const btnGoLogin = document.getElementById('btn-go-login');
        const btnGoRegister = document.getElementById('btn-go-register');
        
        if (btnGoLogin) {
            btnGoLogin.addEventListener('click', () => showView('login-view'));
        }
        
        if (btnGoRegister) {
            btnGoRegister.addEventListener('click', () => showView('register-view'));
        }
        
        // ========== LOGIN ==========
        const loginUser = document.getElementById('login-user');
        const loginPass = document.getElementById('login-pass');
        const loginError = document.getElementById('login-error');
        const btnLoginSubmit = document.getElementById('btn-login-submit');
        const btnLoginBack = document.getElementById('btn-login-back');
        const loginTogglePass = document.querySelector('#login-view .toggle-password');
        
        if (loginTogglePass && loginPass) {
            setupPasswordToggle(loginTogglePass, loginPass);
        }
        
        if (btnLoginSubmit) {
            btnLoginSubmit.addEventListener('click', async function(e) {
                e.preventDefault();
                
                const username = loginUser.value.trim();
                const password = loginPass.value;
                
                if (!username || !password) {
                    loginError.textContent = 'Completa todos los campos';
                    return;
                }
                
                LoadingButton.start(this);
                
                const result = await AuthSystem.login(username, password);
                
                if (result.success) {
                    LoadingButton.stop(this, true, '¡Bienvenido!');
                    Toast.show(`Bienvenido, ${username}!`, 'success');
                    
                    document.getElementById('welcome-user').textContent = `¡Bienvenido/a, ${Utils.sanitize(username)}!`;
                    loginUser.value = '';
                    loginPass.value = '';
                    loginError.textContent = '';
                    
                    setTimeout(() => showView('menu-view'), 1000);
                } else {
                    LoadingButton.stop(this, false);
                    loginError.textContent = result.message;
                    Toast.show(result.message, 'error');
                }
            });
        }
        
        if (loginPass) {
            loginPass.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    btnLoginSubmit.click();
                }
            });
        }
        
        if (btnLoginBack) {
            btnLoginBack.addEventListener('click', function() {
                loginUser.value = '';
                loginPass.value = '';
                loginError.textContent = '';
                showView('welcome-view');
            });
        }
        
        // ========== REGISTRO ==========
        const registerUser = document.getElementById('register-user');
        const registerPass = document.getElementById('register-pass');
        const registerPassConfirm = document.getElementById('register-pass-confirm');
        const registerError = document.getElementById('register-error');
        const btnRegisterSubmit = document.getElementById('btn-register-submit');
        const btnRegisterBack = document.getElementById('btn-register-back');
        const registerTogglePass = document.querySelectorAll('#register-view .toggle-password');
        
        if (registerTogglePass.length > 0 && registerPass) {
            setupPasswordToggle(registerTogglePass[0], registerPass);
            setupPasswordStrength(registerPass);
        }
        
        if (btnRegisterSubmit) {
            btnRegisterSubmit.addEventListener('click', async function(e) {
                e.preventDefault();
                
                const username = registerUser.value.trim();
                const password = registerPass.value;
                const passwordConfirm = registerPassConfirm.value;
                
                if (!username || !password || !passwordConfirm) {
                    registerError.textContent = 'Completa todos los campos';
                    return;
                }
                
                if (password !== passwordConfirm) {
                    registerError.textContent = 'Las contraseñas no coinciden';
                    return;
                }
                
                LoadingButton.start(this);
                
                const result = await AuthSystem.register(username, password);
                
                if (result.success) {
                    await AuthSystem.login(username, password);
                    
                    LoadingButton.stop(this, true, '¡Cuenta creada!');
                    Toast.show(`Cuenta creada exitosamente, ${username}!`, 'success');
                    
                    document.getElementById('welcome-user').textContent = `¡Bienvenido/a, ${Utils.sanitize(username)}!`;
                    registerUser.value = '';
                    registerPass.value = '';
                    registerPassConfirm.value = '';
                    registerError.textContent = '';
                    
                    setTimeout(() => showView('menu-view'), 1000);
                } else {
                    LoadingButton.stop(this, false);
                    registerError.textContent = result.message;
                    Toast.show(result.message, 'error');
                }
            });
        }
        
        if (registerPassConfirm) {
            registerPassConfirm.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    btnRegisterSubmit.click();
                }
            });
        }
        
        if (btnRegisterBack) {
            btnRegisterBack.addEventListener('click', function() {
                registerUser.value = '';
                registerPass.value = '';
                registerPassConfirm.value = '';
                registerError.textContent = '';
                showView('welcome-view');
            });
        }
        
        // ========== MENÚ PRINCIPAL ==========
        const btnPlay = document.getElementById('btn-play');
        const btnHistory = document.getElementById('btn-history');
        const btnLogout = document.getElementById('btn-logout');
        
        if (btnLogout) {
            btnLogout.addEventListener('click', function() {
                if (confirm('¿Cerrar sesión?')) {
                    AuthSystem.logout();
                    Toast.show('Sesión cerrada', 'info');
                    showView('welcome-view');
                }
            });
        }
        
        // ========== SELECCIÓN DE TEMA ==========
        if (btnPlay) {
            btnPlay.addEventListener('click', function() {
                const container = document.getElementById('theme-buttons');
                container.innerHTML = '';
                
                THEMES.forEach(theme => {
                    const btn = document.createElement('button');
                    btn.className = 'btn';
                    btn.innerHTML = `<span class="btn-icon">📚</span><span>${theme.name}</span>`;
                    btn.style.background = theme.color;
                    btn.style.border = 'none';
                    btn.addEventListener('click', () => startGame(theme.key, theme.name));
                    container.appendChild(btn);
                });
                
                showView('select-theme-view');
            });
        }
        
        const btnThemeBack = document.getElementById('btn-theme-back');
        if (btnThemeBack) {
            btnThemeBack.addEventListener('click', () => showView('menu-view'));
        }
        
        // ========== SISTEMA DE JUEGO ==========
        function startGame(themeKey, themeName) {
            console.log('Iniciando juego:', themeName);
            currentGame.theme = themeKey;
            currentGame.themeName = themeName;
            currentGame.questions = [...QUESTIONS[themeKey]].sort(() => 0.5 - Math.random()).slice(0, 20);
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
                : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
            
            // Progress bar
            const progressContainer = document.querySelector('.progress-container');
            if (progressContainer) {
                const progress = ((currentGame.currentIndex + 1) / currentGame.questions.length) * 100;
                const progressFill = document.querySelector('.progress-fill');
                if (progressFill) {
                    progressFill.style.width = `${progress}%`;
                }
                progressContainer.setAttribute('aria-valuenow', currentGame.currentIndex + 1);
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
            btnNext.addEventListener('click', function() {
                document.getElementById('feedback-modal').classList.remove('active');
                currentGame.currentIndex++;
                displayQuestion();
            });
        }
        
        // Controles de pausa
        const btnPause = document.getElementById('btn-pause');
        if (btnPause) {
            btnPause.addEventListener('click', function() {
                document.getElementById('pause-modal').classList.add('active');
            });
        }
        
        const btnResume = document.getElementById('btn-resume');
        if (btnResume) {
            btnResume.addEventListener('click', function() {
                document.getElementById('pause-modal').classList.remove('active');
            });
        }
        
        const btnQuit = document.getElementById('btn-quit');
        if (btnQuit) {
            btnQuit.addEventListener('click', function() {
                TimerManager.clearAll();
                document.getElementById('pause-modal').classList.remove('active');
                showView('menu-view');
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
            
            // Mensaje personalizado
            const resultMessage = document.getElementById('result-message');
            if (grade >= 4.5) {
                resultMessage.textContent = '¡Sobresaliente! Dominas perfectamente el tema.';
            } else if (grade >= 3.5) {
                resultMessage.textContent = '¡Muy bien! Sigue así, vas por buen camino.';
            } else if (grade >= 3.0) {
                resultMessage.textContent = 'Buen trabajo. Con práctica mejorarás aún más.';
            } else {
                resultMessage.textContent = 'Sigue practicando. ¡Tú puedes mejorar!';
            }
            
            // Guardar resultado
            const username = AuthSystem.getSession();
            GameDB.saveScore(username, currentGame.themeName, currentGame.score, currentGame.questions.length, timeTotal, grade);
            
            Toast.show(`Quiz completado: ${grade.toFixed(1)}`, 'success');
            
            showView('result-view');
        }
        
        const btnResultBack = document.getElementById('btn-result-back');
        if (btnResultBack) {
            btnResultBack.addEventListener('click', () => showView('menu-view'));
        }
        
        // ========== HISTORIAL ==========
        if (btnHistory) {
            btnHistory.addEventListener('click', function() {
                displayHistory();
                showView('history-view');
            });
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
            
            document.getElementById('my-history-count').textContent = `${myHistory.length} partidas`;
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
                        <p class="fecha">${Utils.formatDate(p.date)} • ${p.grade.toFixed(1)}</p>
                    </div>
                    <div class="entry-score">${p.score}</div>
                </div>
            `;
        }
        
        const btnHistoryBack = document.getElementById('btn-history-back');
        if (btnHistoryBack) {
            btnHistoryBack.addEventListener('click', () => showView('menu-view'));
        }
        
        // ========== INICIALIZACIÓN ==========
        if (AuthSystem.isLoggedIn()) {
            const username = AuthSystem.getSession();
            document.getElementById('welcome-user').textContent = `¡Bienvenido/a, ${Utils.sanitize(username)}!`;
            showView('menu-view');
        } else {
            showView('welcome-view');
        }
        
        // ========== COMANDOS DE CONSOLA ==========
        window.mathware = {
            users: () => console.table(AuthSystem.getUsers()),
            scores: () => console.table(GameDB.getDB().partidas),
            resetUsers: () => {
                if (confirm('⚠️ Esto eliminará TODOS los usuarios. ¿Continuar?')) {
                    localStorage.removeItem('mathware_users');
                    localStorage.removeItem('mathware_session');
                    console.log('✅ Usuarios borrados');
                    location.reload();
                }
            },
            resetScores: () => {
                if (confirm('⚠️ Esto eliminará TODAS las puntuaciones. ¿Continuar?')) {
                    localStorage.removeItem('mathware_scores');
                    localStorage.removeItem('mathware_scores_index');
                    console.log('✅ Puntuaciones borradas');
                    location.reload();
                }
            },
            session: () => console.log('Usuario actual:', AuthSystem.getSession()),
            help: () => {
                console.log('%c📚 Comandos Disponibles:', 'color: #4facfe; font-size: 14px; font-weight: bold');
                console.log('%cmathware.users()%c - Ver todos los usuarios', 'color: #00f2fe', 'color: inherit');
                console.log('%cmathware.scores()%c - Ver todas las puntuaciones', 'color: #00f2fe', 'color: inherit');
                console.log('%cmathware.session()%c - Ver usuario actual', 'color: #00f2fe', 'color: inherit');
                console.log('%cmathware.resetUsers()%c - Borrar todos los usuarios', 'color: #fa709a', 'color: inherit');
                console.log('%cmathware.resetScores()%c - Borrar todas las puntuaciones', 'color: #fa709a', 'color: inherit');
            }
        };
        
        console.log('%c✅ Mathware Pro v4.0 - Cargado Exitosamente', 'color: #00ff00; font-size: 16px; font-weight: bold');
        console.log('%c🔧 Escribe mathware.help() para ver comandos disponibles', 'color: #4facfe; font-size: 12px');
    });
    
})();
