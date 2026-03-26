(() => {
    'use strict';
    
// ============================================
// PARTICLES ANIMATION (Canvas-based, CSP-safe)
// ============================================
const initParticles = () => {
    const canvas = document.getElementById('particlesCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let particles = [];
    const particleCount = 80;
    const accentColor = '#d4af37';
    
    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 3 + 1;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.5 + 0.3;
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            
            // Wrap around edges
            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }
        
        draw() {
            ctx.fillStyle = accentColor;
            ctx.globalAlpha = this.opacity;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    
    const init = () => {
        particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    };
    
    const drawLines = () => {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 150) {
                    ctx.strokeStyle = accentColor;
                    ctx.globalAlpha = 0.2 * (1 - distance / 150);
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }
        }
    };
    
    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        
        drawLines();
        requestAnimationFrame(animate);
    };
    
    resizeCanvas();
    init();
    animate();
    
    window.addEventListener('resize', resizeCanvas);
    
    console.log('✅ Partículas Canvas inicializadas (CSP-safe)');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initParticles);
} else {
    initParticles();
}

// ============================================
// NAVIGATION
// ============================================
const navbar = document.querySelector('.navbar');
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navLinks = document.querySelector('.nav-links');
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const setChatOpen = (isOpen) => {
    document.body.classList.toggle('chat-open', Boolean(isOpen));
};
// Prefijo para servir assets directamente desde el contenedor remoto
const ASSETS_BASE = 'https://fundomoragastorage.blob.core.windows.net/assets';
const toAssetUrl = (url) => {
    if (!url || /^https?:\/\//i.test(url) || /^data:/i.test(url) || /^blob:/i.test(url)) return url;
    const clean = url.replace(/^\/+/, ''); // (incorrecto, lo corregimos abajo)
    // Corregido: eliminar barras normales al inicio
    // Elimina cualquier cantidad de barras normales al inicio
    const cleanUrl = url.replace(/^\/*/, '');
    const trimmed = cleanUrl.startsWith('assets/') ? cleanUrl.slice(7) : cleanUrl;
    return `${ASSETS_BASE}/${encodeURI(trimmed)}`;
};
const rewriteAssetUrls = () => {
    // img/src
    document.querySelectorAll('img[src]').forEach((el) => {
        const newUrl = toAssetUrl(el.getAttribute('src'));
        if (newUrl) el.setAttribute('src', newUrl);
    });
    // video poster
    document.querySelectorAll('video[poster]').forEach((el) => {
        const newUrl = toAssetUrl(el.getAttribute('poster'));
        if (newUrl) el.setAttribute('poster', newUrl);
    });
    // source/src
    document.querySelectorAll('source[src]').forEach((el) => {
        const newUrl = toAssetUrl(el.getAttribute('src'));
        if (newUrl) el.setAttribute('src', newUrl);
    });
    // preload links con assets locales
    document.querySelectorAll('link[rel="preload"][href]').forEach((el) => {
        const href = el.getAttribute('href') || '';
        if (href.includes('assets/')) {
            const newUrl = toAssetUrl(href);
            if (newUrl) el.setAttribute('href', newUrl);
        }
    });
};

const ensureMeta = (selector, attrs) => {
    let el = document.head.querySelector(selector);
    if (!el) {
        el = document.createElement('meta');
        document.head.appendChild(el);
    }
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
};

const initGlobalPerformanceAndSeo = () => {
    // Resource hints for faster third-party/media connections
    const hints = [
        { rel: 'preconnect', href: 'https://fundomoragastorage.blob.core.windows.net', crossorigin: 'anonymous' },
        { rel: 'dns-prefetch', href: '//fundomoragastorage.blob.core.windows.net' },
        { rel: 'dns-prefetch', href: '//www.googletagmanager.com' },
    ];

    hints.forEach((hint) => {
        const exists = Array.from(document.head.querySelectorAll(`link[rel="${hint.rel}"]`))
            .some((l) => l.getAttribute('href') === hint.href);
        if (exists) return;
        const link = document.createElement('link');
        link.rel = hint.rel;
        link.href = hint.href;
        if (hint.crossorigin) link.crossOrigin = hint.crossorigin;
        document.head.appendChild(link);
    });

    // SEO defaults (only when missing)
    ensureMeta('meta[name="robots"]', { name: 'robots', content: 'index,follow,max-image-preview:large' });
    ensureMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'es_CL' });

    // Mark active nav link with aria-current
    const current = window.location.pathname.replace(/\/index\.html$/i, '/').replace(/\/+$/, '/') || '/';
    document.querySelectorAll('.nav-links a[href]').forEach((a) => {
        const href = a.getAttribute('href') || '';
        if (!href || href.startsWith('#')) return;
        const url = new URL(href, window.location.href);
        const target = url.pathname.replace(/\/index\.html$/i, '/').replace(/\/+$/, '/') || '/';
        if (target === current) a.setAttribute('aria-current', 'page');
    });

    // Media optimization
    document.querySelectorAll('img:not([loading])').forEach((img) => {
        if (img.closest('.hero, .intro-preloader, .legend-overlay')) {
            img.loading = 'eager';
            img.fetchPriority = 'high';
            img.decoding = 'sync';
            return;
        }
        img.loading = 'lazy';
        img.decoding = 'async';
    });

    document.querySelectorAll('iframe:not([loading])').forEach((iframe) => {
        iframe.loading = 'lazy';
    });

    document.querySelectorAll('video').forEach((video) => {
        if (video.id === 'introVideo' || video.id === 'legendVideo') return;
        if (!video.getAttribute('preload')) video.setAttribute('preload', 'metadata');
    });
};

initGlobalPerformanceAndSeo();

// ============================================
// LEYENDA VIDEO GATE
// ============================================
const initLegendGate = () => {
    const overlay = document.getElementById('legendOverlay');
    const video = document.getElementById('legendVideo');
    const skipBtn = document.getElementById('legendSkip');
    if (!overlay || !video) return;

    const shouldHandle = (e) => !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0);

    const navigate = (targetUrl) => {
        // Keep the overlay visible until the next document paints to avoid a flash of Index.
        overlay.classList.add('active', 'is-exiting');
        document.body.style.overflow = 'hidden';
        try {
            video.pause();
        } catch {}
        window.location.href = targetUrl;
    };

    const playLegend = (targetUrl) => {
        if (overlay.classList.contains('active')) return;
        
        console.log('🎬 Leyenda: Iniciando reproducción del video');
        document.body.style.overflow = 'hidden';
        overlay.classList.remove('is-exiting');
        overlay.classList.add('active');

        // Preparar el video para pantalla completa y reproducción completa
        try {
            video.muted = true;
            video.defaultMuted = true;
            video.setAttribute('muted', '');
            video.setAttribute('playsinline', '');
            video.playsInline = true;
            video.controls = false;
            video.currentTime = 0;
        } catch (err) {
            console.error('❌ Leyenda: Error preparando video', err);
        }
        
        // Forzar dimensiones de pantalla completa
        video.style.width = '100vw';
        video.style.height = '100vh';
        video.style.maxWidth = '100vw';
        video.style.maxHeight = '100vh';
        video.style.objectFit = 'contain';

        const gateDurationMs = 5000;
        const exitTransitionMs = 420;
        let isFinishing = false;
        let hasStarted = false;
        let exitTimer = 0;
        let navigateTimer = 0;

        const beginExit = () => {
            if (overlay.classList.contains('is-exiting')) return;
            if (skipBtn) skipBtn.disabled = true;
            overlay.classList.add('is-exiting');
            console.log('🌘 Leyenda: Iniciando desvanecimiento de salida');
        };

        const finish = () => {
            if (isFinishing) return;
            isFinishing = true;
            clearTimers();
            video.removeEventListener('timeupdate', onTimeUpdate);
            beginExit();
            console.log('✅ Leyenda: Iniciando transición de salida hacia', targetUrl);
            window.setTimeout(() => {
                navigate(targetUrl);
            }, exitTransitionMs);
        };
        
        const clearTimers = () => {
            if (exitTimer) {
                window.clearTimeout(exitTimer);
                exitTimer = 0;
            }
            if (navigateTimer) {
                window.clearTimeout(navigateTimer);
                navigateTimer = 0;
            }
            console.log('⏰ Leyenda: Timers limpiados');
        };
        
        const scheduleGate = () => {
            clearTimers();
            console.log(`⏰ Leyenda: Gate configurado a ${Math.round(gateDurationMs / 1000)}s`);
            exitTimer = window.setTimeout(() => {
                beginExit();
            }, Math.max(0, gateDurationMs - exitTransitionMs));
            navigateTimer = window.setTimeout(() => {
                console.warn('⚠️ Leyenda: Tiempo fijo del gate alcanzado');
                finish();
            }, gateDurationMs);
        };

        scheduleGate();

        const onEnd = () => {
            console.log('🏁 Leyenda: Video terminó, esperando tiempo fijo del gate');
        };
        
        const onError = (e) => {
            console.error('❌ Leyenda: Error durante reproducción', e);
            if (!navigateTimer) {
                scheduleGate();
            }
        };

        const onTimeUpdate = () => {
            if (!hasStarted && video.currentTime > 0) {
                hasStarted = true;
                console.log('▶️ Leyenda: Video comenzó a reproducirse');
            }
        };

        // Configurar listeners ANTES de load()
        video.addEventListener('ended', onEnd, { once: true });
        video.addEventListener('error', onError, { once: true });
        video.addEventListener('timeupdate', onTimeUpdate);
        
        video.addEventListener('loadedmetadata', () => {
            console.log(`📊 Leyenda: Metadata cargada - Duración: ${video.duration}s, Estado: ${video.readyState}`);
        }, { once: true });

        // Cargar y reproducir
        video.load();

        try {
            const p = video.play();
            if (p && typeof p.then === 'function') {
                p.then(() => {
                    console.log('✅ Leyenda: play() completado exitosamente');
                }).catch((err) => {
                    console.error('❌ Leyenda: Error en play():', err);
                    if (!navigateTimer) {
                        scheduleGate();
                    }
                });
            }
        } catch (err) {
            console.error('❌ Leyenda: Excepción en play():', err);
            if (!navigateTimer) {
                scheduleGate();
            }
        }

        if (skipBtn) {
            skipBtn.onclick = () => {
                console.log('⏭️ Leyenda: Usuario saltó el video');
                finish();
            };
        }
    };

    document.addEventListener('click', (e) => {
        const target = e.target instanceof Element ? e.target.closest('a[href$="leyenda.html"], a[href*="leyenda.html#"]') : null;
        if (!target) return;
        if (!shouldHandle(e)) return;

        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') {
            e.stopImmediatePropagation();
        }

        const rawHref = target.getAttribute('href') || 'leyenda.html';
        const targetUrl = new URL(rawHref, window.location.href).href;
        playLegend(targetUrl);
    }, true);
};
const initIntro = () => {
    const introOverlay = document.getElementById('introOverlay');
    const introVideo = document.getElementById('introVideo');

    const startAfterIntro = () => {
        document.body.classList.remove('is-intro-playing');
        document.body.style.overflow = 'auto';

        setTimeout(() => {
            const chatWindow = document.getElementById('chatWindow');
            const chatBadge = document.querySelector('.chat-badge');
            if (chatWindow) {
                chatWindow.classList.add('active');
                setChatOpen(true);
                if (chatBadge) chatBadge.style.display = 'none';
            }
            try { initHernandoGreeting({ force: true }); } catch (e) {}
        }, 1500);
    };

    const hideIntro = () => {
        if (!introOverlay) return startAfterIntro();
        if (introOverlay.classList.contains('hidden')) return;

        introOverlay.classList.add('hidden');
        setTimeout(() => {
            try { introOverlay.remove(); } catch {}
            startAfterIntro();
        }, 650);
    };

    if (!introOverlay || !introVideo) {
        startAfterIntro();
        return;
    }

    document.body.classList.add('is-intro-playing');
    document.body.style.overflow = 'hidden';

    let stallTimeout = 0;
    let hardEndTimeout = 0;
    const clearFallback = () => {
        if (stallTimeout) {
            window.clearTimeout(stallTimeout);
            stallTimeout = 0;
        }
        if (hardEndTimeout) {
            window.clearTimeout(hardEndTimeout);
            hardEndTimeout = 0;
        }
    };

    let introFinished = false;
    const finishIntro = () => {
        if (introFinished) return;
        introFinished = true;
        clearFallback();
        hideIntro();
    };

    const tryPlay = () => {
        introVideo.muted = true;
        introVideo.defaultMuted = true;
        introVideo.setAttribute('muted', '');
        introVideo.setAttribute('playsinline', '');
        introVideo.playsInline = true;
        const p = introVideo.play();
        if (!p || typeof p.then !== 'function') return;

        p.catch(() => {
            // Mostrar mensaje de error si el video falla
            const errorDiv = document.getElementById('introError');
            if (errorDiv) errorDiv.style.display = 'block';
            finishIntro();
        });
    };

    const onEnd = () => finishIntro();

    introVideo.addEventListener('ended', onEnd);
    introVideo.addEventListener('error', () => {
        finishIntro();
    });

    // Asegurar que no quede infinito si no se puede obtener la duración.
    const scheduleFallback = () => {
        clearFallback();

        let lastT = 0;
        let lastProgressAt = Date.now();
        let nearEndDetected = false;
        
        const onProgress = () => {
            if (introVideo.currentTime > lastT + 0.01) {
                lastT = introVideo.currentTime;
                lastProgressAt = Date.now();
            }
            
            // Detectar cuando el video está cerca del final (95% o más)
            const duration = introVideo.duration;
            if (Number.isFinite(duration) && duration > 0) {
                const progress = introVideo.currentTime / duration;
                if (progress >= 0.95 && !nearEndDetected) {
                    nearEndDetected = true;
                }
                // Si estamos al final o muy cerca
                if (progress >= 0.99 || (nearEndDetected && introVideo.currentTime >= duration - 0.5)) {
                    finishIntro();
                }
            }
        };
        introVideo.addEventListener('timeupdate', onProgress);

        const checkStallAndFailSafe = () => {
            if (introVideo.ended) {
                finishIntro();
                return;
            }
            const stalledFor = Date.now() - lastProgressAt;
            if (stalledFor > 9000) {
                introVideo.removeEventListener('timeupdate', onProgress);
                finishIntro();
                return;
            }
            stallTimeout = window.setTimeout(checkStallAndFailSafe, 8000);
        };

        const d = Number(introVideo.duration);
        if (Number.isFinite(d) && d > 0) {
            // Cambiar a hardEndTimeout más corto para detectar congelación
            hardEndTimeout = window.setTimeout(finishIntro, clamp(Math.round(d * 1000) + 2000, 5000, 300000));
        }
        const firstCheck = Number.isFinite(d) && d > 0 ? Math.round((d + 3) * 1000) : 20000;
        stallTimeout = window.setTimeout(checkStallAndFailSafe, clamp(firstCheck, 12000, 90000));
    };

    if (introVideo.readyState >= 1) {
        scheduleFallback();
    } else {
        introVideo.addEventListener('loadedmetadata', scheduleFallback, { once: true });
    }

    tryPlay();
    if (introVideo.ended) finishIntro();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initIntro();
        initLegendGate();
    }, { once: true });
} else {
    initIntro();
    initLegendGate();
}

// Sticky navbar on scroll
window.addEventListener('scroll', () => {
    if (!navbar) return;
    if (window.scrollY > 50) {
        navbar.style.boxShadow = '0 5px 30px rgba(0, 0, 0, 0.15)';
    } else {
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    }
});

// Mobile menu toggle
mobileMenuToggle?.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    
    // Animate hamburger
    const spans = mobileMenuToggle.querySelectorAll('span');
    if (navLinks.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(7px, 7px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(7px, -7px)';
    } else {
        spans[0].style.transform = '';
        spans[1].style.opacity = '1';
        spans[2].style.transform = '';
    }
});

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        const spans = mobileMenuToggle?.querySelectorAll('span');
        spans?.forEach(span => {
            span.style.transform = '';
            span.style.opacity = '1';
        });
    });
});

// ============================================
// REACTIVE CTA GLOW
// ============================================
const initReactiveButtonGlow = () => {
    const glowButtons = document.querySelectorAll('.btn, .mapa-btn');
    glowButtons.forEach((btn) => {
        btn.addEventListener('pointermove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100;
            const y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100;
            btn.style.setProperty('--glow-x', `${clamp(x, 0, 100)}%`);
            btn.style.setProperty('--glow-y', `${clamp(y, 0, 100)}%`);
        }, { passive: true });
    });
};

initReactiveButtonGlow();

// ============================================
// HERO LIVE STATUS CHIPS
// ============================================
const initHeroLiveStatus = () => {
    const routeEl = document.getElementById('heroLiveRoutes');
    const climateEl = document.getElementById('heroLiveClimate');
    const accessEl = document.getElementById('heroLiveAccess');
    if (!routeEl && !climateEl && !accessEl) return;

    const routeStates = ['15 rutas activas', '18 rutas activas', '20 rutas activas'];
    const climateStates = ['Clima estable', 'Brisa suave', 'Visibilidad óptima'];
    const accessStates = ['Disponibilidad alta', 'Disponibilidad media', 'Reservas abiertas'];

    let idx = 0;
    const update = () => {
        idx = (idx + 1) % 999;
        if (routeEl) routeEl.textContent = routeStates[idx % routeStates.length];
        if (climateEl) climateEl.textContent = climateStates[idx % climateStates.length];
        if (accessEl) accessEl.textContent = accessStates[idx % accessStates.length];
    };

    update();
    window.setInterval(update, 6000);
};

initHeroLiveStatus();

// ============================================
// HERNANDO CHAT WIDGET
// ============================================
const chatToggle = document.getElementById('chatToggle');
const chatWindow = document.getElementById('chatWindow');
const chatClose = document.getElementById('chatClose');
const chatSend = document.getElementById('chatSend');
const chatInput = document.getElementById('chatInput');
const chatBody = document.getElementById('chatBody');
const chatBadge = document.querySelector('.chat-badge');

if (chatToggle || chatWindow || document.getElementById('hernando-widget')) {
    document.body.classList.add('has-chat-widget');
}

// Configuration
// En Render Static Site no existe proxy /api (nginx), por eso usamos endpoint público.
// Se puede sobreescribir con window.__HERNANDO_API_URL__ antes de cargar este script.
const API_CANDIDATES = [
    window.__HERNANDO_API_URL__,
    'https://fundo-moraga-ai-chat.onrender.com',
    'https://hernando.fundomoraga.com',
]
    .filter(Boolean)
    .map((u) => String(u).replace(/\/+$/, ''));

const isLocalDevHost = (() => {
    const hostname = (window.location.hostname || '').toLowerCase();
    const host = (window.location.host || '').toLowerCase();
    const origin = (window.location.origin || '').toLowerCase();
    const isLocalName = hostname === 'localhost' || hostname === '::1';
    const isLocalIPv4 = /^127(?:\.\d{1,3}){3}$/.test(hostname);
    const isLocalHostWithPort = /^localhost(?::\d+)?$/.test(host) || /^127(?:\.\d{1,3}){3}(?::\d+)?$/.test(host) || /^\[::1\](?::\d+)?$/.test(host);
    const isLocalOrigin = origin.startsWith('http://localhost') || origin.startsWith('https://localhost') || origin.startsWith('http://127.') || origin.startsWith('https://127.') || origin.startsWith('http://[::1]') || origin.startsWith('https://[::1]');
    return isLocalName || isLocalIPv4 || isLocalHostWithPort || isLocalOrigin;
})();

let _apiBaseUrlPromise = null;

async function resolveApiBaseUrl() {
    if (isLocalDevHost) {
        return null;
    }
    for (const base of API_CANDIDATES) {
        try {
            const r = await fetch(`${base}/chat/init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: 'web_probe', site: CHAT_SITE_CONTEXT }),
            });
            if (r.status !== 404 && r.status < 500) return base;
        } catch (e) {}
    }
    return API_CANDIDATES[0] || 'https://hernando.fundomoraga.com';
}

async function getApiBaseUrl() {
    if (!_apiBaseUrlPromise) {
        _apiBaseUrlPromise = resolveApiBaseUrl();
    }
    return _apiBaseUrlPromise;
}
const DEFAULT_GREETING = '¡Hola! Soy Hernando de Maicillo Moraga. ¿En qué puedo ayudarte hoy?';
let _hernandoGreetingInitialized = false;
const CHAT_SITE_CONTEXT = 'maicillo';

// Toggle chat window
chatToggle?.addEventListener('click', () => {
    if (!chatWindow) return;
    chatWindow.classList.toggle('active');
    const isOpen = chatWindow.classList.contains('active');
    setChatOpen(isOpen);
    if (isOpen) {
        chatInput.focus();
        // Hide badge when opened
        if (chatBadge) chatBadge.style.display = 'none';
    }
});

chatClose?.addEventListener('click', () => {
    setChatOpen(false);
    chatWindow.classList.remove('active');
});

// Send message function
async function sendMessage(message) {
    if (!message.trim()) return;
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    chatInput.value = '';
    
    // Show typing indicator
    const typingIndicator = addTypingIndicator();

    if (isLocalDevHost) {
        typingIndicator.remove();
        addMessageToChat('En entorno local el chat remoto no esta disponible. Publica en el dominio final para usar Hernando.', 'bot');
        chatBody.scrollTop = chatBody.scrollHeight;
        return;
    }
    
    try {
        // Call Hernando API
        console.log('Enviando mensaje a Hernando:', message);
        const apiBase = await getApiBaseUrl();
        if (!apiBase) {
            throw new Error('No hay endpoint de chat disponible');
        }
        const response = await fetch(`${apiBase}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: getOrCreateUserId(),
                message: message,
                site: CHAT_SITE_CONTEXT,
            })
        });
        
        console.log('Respuesta recibida:', response.status, response.statusText);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Datos:', data);
            typingIndicator.remove();
            addMessageToChat(data.response || data.message || 'Gracias por tu mensaje. Te responderé pronto.', 'bot');
        } else {
            const errorText = await response.text();
            console.error('Error en respuesta:', response.status, errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }
    } catch (error) {
        console.error('Error completo:', error);
        typingIndicator.remove();
        addMessageToChat('Lo siento, hay un problema de conexión. Por favor intenta más tarde o contáctanos al +56 9 9445 5713', 'bot');
    }
    
    // Scroll to bottom
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Add message to chat UI
function addMessageToChat(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    
    const messageP = document.createElement('p');
    messageP.textContent = text;
    
    messageDiv.appendChild(messageP);
    chatBody.appendChild(messageDiv);
    
    // Scroll to bottom
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Add typing indicator
function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message bot typing-indicator';
    typingDiv.innerHTML = '<p>Hernando está escribiendo...</p>';
    chatBody.appendChild(typingDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
    return typingDiv;
}

async function initHernandoGreeting(options = {}) {
    const force = options.force === true;
    if (_hernandoGreetingInitialized && !force) return;
    if (!chatBody) return;

    // Evitar duplicar saludo si ya hay mensajes o si esta pestaña ya lo hizo.
    if ((chatBody.children?.length || 0) > 0) {
        _hernandoGreetingInitialized = true;
        return;
    }
    if (force) {
        try { sessionStorage.removeItem('hernando_greeted'); } catch {}
    }
    if (!force && sessionStorage.getItem('hernando_greeted') === '1') {
        _hernandoGreetingInitialized = true;
        return;
    }

    const userId = getOrCreateUserId();

    if (isLocalDevHost) {
        addMessageToChat(DEFAULT_GREETING, 'bot');
        sessionStorage.setItem('hernando_greeted', '1');
        _hernandoGreetingInitialized = true;
        return;
    }

    try {
        const apiBase = await getApiBaseUrl();
        if (!apiBase) {
            throw new Error('No hay endpoint de saludo disponible');
        }
        const response = await fetch(`${apiBase}/chat/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, site: CHAT_SITE_CONTEXT })
        });

        let greeting = DEFAULT_GREETING;
        if (response.ok) {
            const data = await response.json();
            if (data?.greeting) greeting = data.greeting;
        }

        addMessageToChat(greeting, 'bot');
        sessionStorage.setItem('hernando_greeted', '1');
        _hernandoGreetingInitialized = true;
    } catch (e) {
        // Fallback silencioso
        addMessageToChat(DEFAULT_GREETING, 'bot');
        sessionStorage.setItem('hernando_greeted', '1');
        _hernandoGreetingInitialized = true;
    }
}

// Get or create user ID
function getOrCreateUserId() {
    let userId = localStorage.getItem('hernando_user_id');
    if (!userId) {
        userId = 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('hernando_user_id', userId);
    }
    return userId;
}

// Send message on button click
chatSend?.addEventListener('click', () => {
    sendMessage(chatInput.value);
});

// Send message on Enter key
chatInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage(chatInput.value);
    }
});

// Handle all "Reservar con Hernando" buttons
document.querySelectorAll('.btn-reserva, .btn-hernando').forEach(button => {
    button.addEventListener('click', (e) => {
        if (!chatWindow || !chatInput) return;
        e.preventDefault();
        chatWindow.classList.add('active');
        setChatOpen(true);
        chatInput.focus();
        if (chatBadge) chatBadge.style.display = 'none';
    });
});

// ============================================
// PERFORMANCE: Lazy Loading Images (Native)
// ============================================
if ('loading' in HTMLImageElement.prototype) {
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        img.src = img.dataset.src || img.src;
    });
} else {
    // Fallback: IntersectionObserver para browsers antiguos
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                imageObserver.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ============================================
// ANALYTICS (Optional)
// ============================================
function trackEvent(category, action, label) {
    if (typeof gtag !== 'undefined') {
        gtag('event', action, {
            'event_category': category,
            'event_label': label
        });
    }
    console.log('Event:', category, action, label);
}

// Track important interactions
document.querySelectorAll('.btn-primary, .btn-reserva').forEach(button => {
    button.addEventListener('click', () => {
        trackEvent('Engagement', 'Button Click', button.textContent);
    });
});

// ============================================
// CONSOLE MESSAGE
// ============================================
console.log('%c¡Bienvenido a Fundo Moraga! 🌿', 'font-size: 20px; color: #2c5530; font-weight: bold;');
console.log('%cSitio desarrollado con 💚', 'font-size: 14px; color: #666;');

// ============================================
// PARTICLES.JS INITIALIZATION
// ============================================
const particlesContainer = document.getElementById('particles-js');
if (particlesContainer && typeof window.particlesJS === 'function') {
    particlesJS('particles-js', {
        particles: {
            number: {
                value: 80,
                density: {
                    enable: true,
                    value_area: 800
                }
            },
            color: {
                value: '#d4af37'
            },
            shape: {
                type: 'circle',
                stroke: {
                    width: 0,
                    color: '#000000'
                }
            },
            opacity: {
                value: 0.3,
                random: true,
                anim: {
                    enable: true,
                    speed: 1,
                    opacity_min: 0.1,
                    sync: false
                }
            },
            size: {
                value: 3,
                random: true,
                anim: {
                    enable: true,
                    speed: 2,
                    size_min: 0.1,
                    sync: false
                }
            },
            line_linked: {
                enable: true,
                distance: 150,
                color: '#d4af37',
                opacity: 0.2,
                width: 1
            },
            move: {
                enable: true,
                speed: 2,
                direction: 'none',
                random: false,
                straight: false,
                out_mode: 'out',
                bounce: false
            }
        },
        interactivity: {
            detect_on: 'canvas',
            events: {
                onhover: {
                    enable: true,
                    mode: 'grab'
                },
                onclick: {
                    enable: true,
                    mode: 'push'
                },
                resize: true
            },
            modes: {
                grab: {
                    distance: 140,
                    line_linked: {
                        opacity: 0.5
                    }
                },
                push: {
                    particles_nb: 4
                }
            }
        },
        retina_detect: true
    });
}

// ============================================
// STATS COUNTER ANIMATION
// ============================================
function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target + '+';
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current) + '+';
        }
    }, 16);
}

// Observe stats section
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-target'));
                animateCounter(stat, target);
            });
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const statsSection = document.querySelector('.stats-section');
if (statsSection) {
    statsObserver.observe(statsSection);
}

// ============================================
// TESTIMONIALS CAROUSEL
// ============================================
const testimonialCards = document.querySelectorAll('.testimonial-card');
const dots = document.querySelectorAll('.dot');
let currentTestimonial = 0;
let testimonialInterval;

function showTestimonial(index) {
    testimonialCards.forEach(card => card.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    testimonialCards[index].classList.add('active');
    dots[index].classList.add('active');
}

function nextTestimonial() {
    currentTestimonial = (currentTestimonial + 1) % testimonialCards.length;
    showTestimonial(currentTestimonial);
}

function startTestimonialCarousel() {
    testimonialInterval = setInterval(nextTestimonial, 5000);
}

function stopTestimonialCarousel() {
    clearInterval(testimonialInterval);
}

// Dot click handlers
dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        currentTestimonial = index;
        showTestimonial(currentTestimonial);
        stopTestimonialCarousel();
        startTestimonialCarousel();
    });
});

// Start carousel
if (testimonialCards.length > 0) {
    startTestimonialCarousel();
}

// Pause on hover
const testimonialCarousel = document.querySelector('.testimonials-carousel');
if (testimonialCarousel) {
    testimonialCarousel.addEventListener('mouseenter', stopTestimonialCarousel);
    testimonialCarousel.addEventListener('mouseleave', startTestimonialCarousel);
}

// ============================================
// LIGHTBOX GALLERY
// ============================================
// VIDEO PLAYER PREMIUM
// ============================================
const mainVideo = document.getElementById('mainVideo');
const videoOverlay = document.getElementById('videoOverlay');
const playButton = document.getElementById('playButton');
const videoControls = document.getElementById('videoControls');
const playPauseBtn = document.getElementById('playPauseBtn');
const muteBtn = document.getElementById('muteBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const progressBar = document.getElementById('progressBar');
const progressFilled = document.getElementById('progressFilled');
const currentTimeDisplay = document.getElementById('currentTime');
const durationDisplay = document.getElementById('duration');
const videoTitleEl = document.querySelector('.video-title h3');
const videoSubtitleEl = document.querySelector('.video-title p');
const videoGalleryGrid = document.getElementById('videoGalleryGrid');
const videoPlayer = document.querySelector('.video-player');

const setVideoStarted = (started) => {
    if (!videoPlayer || !videoControls) return;
    videoPlayer.classList.toggle('has-started', Boolean(started));
    if (!started) videoControls.classList.remove('show');
};

const videoSupport = (() => {
    const tester = document.createElement('video');
    return {
        quicktime: Boolean(tester.canPlayType('video/quicktime')),
    };
})();

const fallbackPoster = 'https://fundomoragastorage.blob.core.windows.net/assets/images/066D82F6-A14A-4BBC-818F-FB3411BB8D6D.JPEG';

const pickClipSource = (clip) => {
    if (!clip || !clip.src) return null;
    const src = clip.src;
    if (/\.mov$/i.test(src)) {
        return videoSupport.quicktime ? src : null;
    }
    return src;
};

const safePlay = (videoEl) => {
    if (!videoEl) return Promise.resolve(false);
    const p = videoEl.play();
    if (!p || typeof p.then !== 'function') return Promise.resolve(true);
    return p.then(() => true).catch(() => false);
};

const setPlayButtonState = (isEnabled) => {
    if (!playButton) return;
    playButton.disabled = !isEnabled;
    playButton.setAttribute('aria-disabled', String(!isEnabled));
};

const videoClips = [
    {
        src: 'https://fundomoragastorage.blob.core.windows.net/assets/videos/IMG_2274.mov',
        title: 'Ruta bosque norte',
        description: 'Senderos cerrados, curvas y tracción total entre pinos.',
        tag: 'Ruta forestal',
        duration: '0:42',
        orientation: 'portrait'
    },
    {
        src: 'https://fundomoragastorage.blob.core.windows.net/assets/videos/IMG_2275.mov',
        title: 'Cruce de arroyos',
        description: 'Agua, barro y torque controlado en bajadas técnicas.',
        tag: 'Agua y barro',
        duration: '0:37',
        orientation: 'portrait'
    },
    {
        src: 'https://fundomoragastorage.blob.core.windows.net/assets/videos/IMG_2803.mov',
        title: 'Cumbre al atardecer',
        description: 'Vista 360° de Batuco con luz dorada y polvo en suspensión.',
        tag: 'Golden hour',
        duration: '0:51',
        orientation: 'portrait'
    },
    {
        src: 'https://fundomoragastorage.blob.core.windows.net/assets/videos/IMG_3326.mov',
        title: 'Noche en el fundo',
        description: 'Cielo estrellado y luces de vehículos en caravana.',
        tag: 'Nocturno',
        duration: '0:39',
        orientation: 'portrait'
    }
];

const galleryTitlePattern = /(Fundo Moraga|Batuco OffRoad|Batuco Offroad)/i;

const socialVideoClips = [
    {
        title: 'Final Lampa a Fondo 2018 - Fundo Moraga',
        description: 'Registro de competencia y ambiente off-road en Fundo Moraga.',
        platform: 'YouTube',
        duration: 'YouTube',
        embedUrl: 'https://www.youtube.com/embed/qIQi2ilawl4',
        watchUrl: 'https://www.youtube.com/watch?v=qIQi2ilawl4'
    },
    {
        title: 'F150 iniciando el recorrido en Batuco Offroad',
        description: 'Ingreso y primeros metros de ruta en Batuco Offroad.',
        platform: 'YouTube',
        duration: 'YouTube',
        embedUrl: 'https://www.youtube.com/embed/5oJKhU_SHt4',
        watchUrl: 'https://www.youtube.com/watch?v=5oJKhU_SHt4'
    },
    {
        title: 'Hilux en la trepada Batuco Offroad',
        description: 'Ascenso técnico en una de las trepadas más vistosas del sector.',
        platform: 'YouTube',
        duration: 'YouTube',
        embedUrl: 'https://www.youtube.com/embed/X9-bhOEwy6I',
        watchUrl: 'https://www.youtube.com/watch?v=X9-bhOEwy6I'
    },
    {
        title: 'F150 en Batuco Offroad 🔥🔥💥💥🔥',
        description: 'Tracción, polvo y subida intensa en Batuco Offroad.',
        platform: 'YouTube',
        duration: 'YouTube',
        embedUrl: 'https://www.youtube.com/embed/WRD0Z1Dh63s',
        watchUrl: 'https://www.youtube.com/watch?v=WRD0Z1Dh63s'
    },
    {
        title: 'Ascenso a una gran vista en Batuco Offroad 🇨🇱',
        description: 'Subida con vista panorámica y paisaje abierto en Batuco.',
        platform: 'YouTube',
        duration: 'YouTube',
        embedUrl: 'https://www.youtube.com/embed/sqEbLPk9c-I',
        watchUrl: 'https://www.youtube.com/watch?v=sqEbLPk9c-I'
    },
    {
        title: 'Batuco Offroad desde las alturas 🔥⛰️💥',
        description: 'Perspectiva elevada del circuito y los vehículos en ruta.',
        platform: 'YouTube',
        duration: 'YouTube',
        embedUrl: 'https://www.youtube.com/embed/JcdggRJAtxk',
        watchUrl: 'https://www.youtube.com/watch?v=JcdggRJAtxk'
    },
    {
        title: 'Ingresando a Batuco Offroad ⛰️⛰️',
        description: 'Entrada al circuito y arranque de la experiencia off-road.',
        platform: 'YouTube',
        duration: 'YouTube',
        embedUrl: 'https://www.youtube.com/embed/AdVn_gFEN7Y',
        watchUrl: 'https://www.youtube.com/watch?v=AdVn_gFEN7Y'
    }
].filter((clip) => galleryTitlePattern.test(clip.title));

if (mainVideo) {
    const startMainPlayback = () => {
        if (playButton?.disabled) return;
        safePlay(mainVideo).then((played) => {
            if (!played) return;
            videoOverlay.classList.add('hidden');
            setVideoStarted(true);
        });
    };

    // Play button click
    playButton?.addEventListener('click', (e) => {
        e.stopPropagation();
        startMainPlayback();
    });

    // Video overlay click
    videoOverlay?.addEventListener('click', (e) => {
        if (e.target !== videoOverlay) return;
        startMainPlayback();
    });

    // Play/Pause toggle
    playPauseBtn?.addEventListener('click', togglePlayPause);
    mainVideo?.addEventListener('click', togglePlayPause);

    function togglePlayPause() {
        if (mainVideo.paused) {
            safePlay(mainVideo);
        } else {
            mainVideo.pause();
        }
    }

    // Update play/pause icon
    mainVideo?.addEventListener('play', () => {
        setVideoStarted(true);
        playPauseBtn.querySelector('.play-icon').style.display = 'none';
        playPauseBtn.querySelector('.pause-icon').style.display = 'block';
    });
    
    mainVideo?.addEventListener('pause', () => {
        playPauseBtn.querySelector('.play-icon').style.display = 'block';
        playPauseBtn.querySelector('.pause-icon').style.display = 'none';
        videoControls?.classList.remove('show');
    });

    // Mute/Unmute
    muteBtn?.addEventListener('click', () => {
        mainVideo.muted = !mainVideo.muted;
        updateMuteIcon();
    });

    function updateMuteIcon() {
        if (mainVideo.muted) {
            muteBtn.querySelector('.volume-icon').style.display = 'none';
            muteBtn.querySelector('.mute-icon').style.display = 'block';
        } else {
            muteBtn.querySelector('.volume-icon').style.display = 'block';
            muteBtn.querySelector('.mute-icon').style.display = 'none';
        }
    }

    // Fullscreen
    fullscreenBtn?.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            if (mainVideo.parentElement.requestFullscreen) {
                mainVideo.parentElement.requestFullscreen();
            } else if (mainVideo.parentElement.webkitRequestFullscreen) {
                mainVideo.parentElement.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    });

    // Progress bar
    mainVideo?.addEventListener('timeupdate', updateProgress);
    progressBar?.addEventListener('click', seek);

    function updateProgress() {
        const percent = (mainVideo.currentTime / mainVideo.duration) * 100;
        progressFilled.style.width = percent + '%';
        
        // Update time displays
        currentTimeDisplay.textContent = formatTime(mainVideo.currentTime);
        durationDisplay.textContent = formatTime(mainVideo.duration);
    }

    function seek(e) {
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        mainVideo.currentTime = percent * mainVideo.duration;
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Show controls on video end
    mainVideo?.addEventListener('ended', () => {
        videoOverlay.classList.remove('hidden');
        playPauseBtn.querySelector('.play-icon').style.display = 'block';
        playPauseBtn.querySelector('.pause-icon').style.display = 'none';
        setVideoStarted(false);
    });

    // Show controls on mousemove
    let controlsTimeout;
    
    videoPlayer?.addEventListener('mousemove', () => {
        if (!videoOverlay?.classList.contains('hidden')) return;
        videoControls.classList.add('show');
        clearTimeout(controlsTimeout);
        
        if (!mainVideo.paused) {
            controlsTimeout = setTimeout(() => {
                videoControls.classList.remove('show');
            }, 3000);
        }
    });

    videoPlayer?.addEventListener('mouseleave', () => {
        if (!mainVideo.paused) {
            videoControls.classList.remove('show');
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (mainVideo && isVideoInViewport(mainVideo)) {
            switch(e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    togglePlayPause();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    mainVideo.currentTime = Math.max(0, mainVideo.currentTime - 5);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    mainVideo.currentTime = Math.min(mainVideo.duration, mainVideo.currentTime + 5);
                    break;
                case 'm':
                    e.preventDefault();
                    mainVideo.muted = !mainVideo.muted;
                    updateMuteIcon();
                    break;
                case 'f':
                    e.preventDefault();
                    fullscreenBtn.click();
                    break;
            }
        }
    });

    function isVideoInViewport(element) {
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
    }

    // Set initial duration when metadata loads
    mainVideo?.addEventListener('loadedmetadata', () => {
        durationDisplay.textContent = formatTime(mainVideo.duration);
    });

    // ============================================
    // VIDEO GALLERY → CAMBIA EL VIDEO PRINCIPAL
    // ============================================
    function renderVideoGallery() {
        if (!videoGalleryGrid) return;
        videoGalleryGrid.innerHTML = '';

        socialVideoClips.forEach((clip, index) => {
            const card = document.createElement('article');
            card.className = 'video-card video-card--embed';
            card.dataset.index = index;
            card.innerHTML = `
                <div class="video-embed-shell">
                    <iframe
                        class="video-embed-frame"
                        src="${clip.embedUrl}"
                        title="${clip.title}"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen
                        referrerpolicy="strict-origin-when-cross-origin"
                    ></iframe>
                </div>
                <div class="video-meta">
                <span class="video-chip">${clip.platform}</span>
                <span class="video-duration">${clip.duration}</span>
                    <h4>${clip.title}</h4>
                    <p>${clip.description}</p>
                    <a class="video-card-link" href="${clip.watchUrl}" target="_blank" rel="noopener noreferrer">Ver en YouTube</a>
                </div>
            `;
            videoGalleryGrid.appendChild(card);
        });
    }

    function setMainVideo(clip) {
        if (!clip || !mainVideo) return;
        setVideoStarted(false);
        const source = pickClipSource(clip);
        setPlayButtonState(Boolean(source));

        // Ajustar modo retrato o paisaje
        if (clip.orientation === 'portrait') {
            videoPlayer?.classList.add('portrait');
            mainVideo.classList.add('portrait');
        } else {
            videoPlayer?.classList.remove('portrait');
            mainVideo.classList.remove('portrait');
        }

        mainVideo.pause();
        if (!source) {
            mainVideo.removeAttribute('src');
            mainVideo.poster = fallbackPoster;
            mainVideo.load();
            videoOverlay?.classList.remove('hidden');
            playPauseBtn?.querySelector('.play-icon')?.style.setProperty('display', 'block');
            playPauseBtn?.querySelector('.pause-icon')?.style.setProperty('display', 'none');
            videoControls?.classList.remove('show');
            if (videoTitleEl) videoTitleEl.textContent = clip.title;
            if (videoSubtitleEl) videoSubtitleEl.textContent = clip.description;
            return;
        }

        mainVideo.src = source;
        mainVideo.load();

        // Mostrar overlay mientras se prepara el video
        videoOverlay?.classList.remove('hidden');
        playPauseBtn?.querySelector('.play-icon')?.style.setProperty('display', 'block');
        playPauseBtn?.querySelector('.pause-icon')?.style.setProperty('display', 'none');
        videoControls?.classList.remove('show');

        if (videoTitleEl) videoTitleEl.textContent = clip.title;
        if (videoSubtitleEl) videoSubtitleEl.textContent = clip.description;

        const attemptPlay = () => {
            safePlay(mainVideo).then((played) => {
                if (played) {
                    videoOverlay?.classList.add('hidden');
                    playPauseBtn?.querySelector('.play-icon')?.style.setProperty('display', 'none');
                    playPauseBtn?.querySelector('.pause-icon')?.style.setProperty('display', 'block');
                    setVideoStarted(true);
                } else {
                    // Si el navegador bloquea, dejamos overlay visible para interacción manual
                    videoOverlay?.classList.remove('hidden');
                    playPauseBtn?.querySelector('.play-icon')?.style.setProperty('display', 'block');
                    playPauseBtn?.querySelector('.pause-icon')?.style.setProperty('display', 'none');
                    setVideoStarted(false);
                }
            });
        };

        // Esperar a que el medio esté listo antes de reproducir
        const onCanPlay = () => {
            mainVideo.removeEventListener('canplay', onCanPlay);
            attemptPlay();
        };

        mainVideo.addEventListener('canplay', onCanPlay, { once: true });
    }

    renderVideoGallery();
}

// Old lightbox code (can be removed if not needed)
const galleryItems = document.querySelectorAll('.gallery-item');
if (galleryItems.length > 0) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.querySelector('.lightbox-image');
    const lightboxClose = document.querySelector('.lightbox-close');
    const lightboxPrev = document.querySelector('.lightbox-prev');
    const lightboxNext = document.querySelector('.lightbox-next');
    let currentGalleryIndex = 0;
    const galleryImages = Array.from(galleryItems).map(item => ({
        src: item.querySelector('img').src,
        alt: item.querySelector('img').alt
    }));

    function openLightbox(index) {
        currentGalleryIndex = index;
        lightboxImg.src = galleryImages[index].src;
        lightboxImg.alt = galleryImages[index].alt;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    function showPrevImage() {
        currentGalleryIndex = (currentGalleryIndex - 1 + galleryImages.length) % galleryImages.length;
        lightboxImg.src = galleryImages[currentGalleryIndex].src;
        lightboxImg.alt = galleryImages[currentGalleryIndex].alt;
    }

    function showNextImage() {
        currentGalleryIndex = (currentGalleryIndex + 1) % galleryImages.length;
        lightboxImg.src = galleryImages[currentGalleryIndex].src;
        lightboxImg.alt = galleryImages[currentGalleryIndex].alt;
    }

    // Gallery item clicks
    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => openLightbox(index));
    });

    // Lightbox controls
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', showPrevImage);
    if (lightboxNext) lightboxNext.addEventListener('click', showNextImage);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPrevImage();
        if (e.key === 'ArrowRight') showNextImage();
    });

    // Click outside to close
    lightbox?.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });
}

// ============================================
// CONTACT FORM HANDLING
// ============================================
const contactForm = document.getElementById('contactForm');
const formStatus = document.querySelector('.form-status');

contactForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData);
    
    // Show loading state
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Enviando...';
    submitButton.disabled = true;
    
    try {
        // Enviar al backend de Hernando (API oficial)
        // Enviar al endpoint correcto (RAILWAY_API_URL ya incluye "/api")
        const apiBase = await getApiBaseUrl();
        const response = await fetch(`${apiBase}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: `form_${getOrCreateUserId()}`,
                message: `📋 FORMULARIO DE CONTACTO\n\nNombre: ${data.name}\nEmail: ${data.email}\nTeléfono: ${data.phone}\nServicio: ${data.service}\n\nMensaje:\n${data.message}`
            })
        });
        
        if (response.ok) {
            formStatus.textContent = '¡Mensaje enviado exitosamente! Nos contactaremos contigo pronto.';
            formStatus.className = 'form-status success';
            contactForm.reset();
        } else {
            throw new Error('Error en el envío');
        }
    } catch (error) {
        console.error('Error:', error);
        formStatus.textContent = 'Hubo un error al enviar el mensaje. Por favor intenta de nuevo o contáctanos directamente.';
        formStatus.className = 'form-status error';
    } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        
        // Hide status after 5 seconds
        setTimeout(() => {
            formStatus.style.display = 'none';
        }, 5000);
    }
});

// ============================================
// PARALLAX SCROLL EFFECTS
// ============================================
const hero = document.querySelector('.hero');
const aboutSection = document.querySelector('.about-section');
const aboutImage = document.querySelector('.about-image');
let parallaxTicking = false;

const updateParallax = () => {
    const scrolled = window.pageYOffset || 0;

    if (hero) {
        hero.style.backgroundPositionY = `${scrolled * 0.5}px`;
    }

    if (aboutSection && aboutImage) {
        const rect = aboutSection.getBoundingClientRect();
        const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
        const centerDelta = (rect.top + rect.height / 2) - viewportH / 2;
        const normalized = Math.max(-1, Math.min(1, centerDelta / Math.max(1, viewportH / 2)));
        const offset = Math.round(normalized * -14);
        aboutImage.style.setProperty('--about-offset', `${offset}px`);
    }

    parallaxTicking = false;
};

window.addEventListener('scroll', () => {
    if (parallaxTicking) return;
    parallaxTicking = true;
    window.requestAnimationFrame(updateParallax);
}, { passive: true });

window.addEventListener('resize', updateParallax, { passive: true });
updateParallax();

// ============================================
// SMOOTH REVEAL ANIMATIONS
// ============================================
const revealElements = document.querySelectorAll(
    '.service-card, .gallery-item, .info-card, .testimonial-card, .stat-card, .blog-card, .about-image, .about-text',
);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (revealElements.length) {
    revealElements.forEach((el, index) => {
        el.classList.add('reveal-cinematic');
        el.style.setProperty('--reveal-index', String(index % 8));
        if (el.matches('.about-text')) {
            el.setAttribute('data-reveal', 'left');
        } else if (el.matches('.about-image')) {
            el.setAttribute('data-reveal', 'right');
        } else if (el.matches('.stat-card')) {
            el.setAttribute('data-reveal', 'zoom');
        }
    });
}

if (reducedMotion) {
    revealElements.forEach((el) => el.classList.add('is-visible'));
} else {
    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            });
        },
        {
            threshold: 0.14,
            rootMargin: '0px 0px -9% 0px',
        },
    );

    revealElements.forEach((el) => revealObserver.observe(el));
}

// ============================================
// TILT EFFECT ON SERVICE CARDS
// ============================================
const serviceCards = document.querySelectorAll('.service-card');

serviceCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        card.style.transform = `translateY(-15px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        
        // Update mouse position for glow effect
        card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) rotateX(0) rotateY(0)';
    });
});

// ============================================
// SCROLL TO TOP BUTTON
// ============================================
const scrollToTop = document.createElement('button');
scrollToTop.className = 'scroll-to-top';
scrollToTop.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>';
scrollToTop.setAttribute('aria-label', 'Volver arriba');
document.body.appendChild(scrollToTop);

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 500) {
        scrollToTop.classList.add('visible');
    } else {
        scrollToTop.classList.remove('visible');
    }
});

scrollToTop.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// ============================================
// PRELOADER ENHANCEMENT
// ============================================
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;
    
    // Add fade out class
    setTimeout(() => {
        preloader.style.opacity = '0';
        preloader.style.visibility = 'hidden';
        document.body.style.overflow = 'auto';
    }, 800);
    
    // Remove from DOM after transition
    setTimeout(() => {
        preloader.remove();
    }, 1300);
});

// ============================================
// LOADING BAR ON PAGE NAVIGATION
// ============================================
const loadingBar = document.createElement('div');
loadingBar.className = 'page-loading-bar';
document.body.appendChild(loadingBar);

let loadingProgress = 0;
let loadingInterval;

function startLoading() {
    loadingProgress = 0;
    loadingBar.style.width = '0%';
    loadingBar.style.display = 'block';
    
    loadingInterval = setInterval(() => {
        loadingProgress += Math.random() * 30;
        if (loadingProgress > 90) loadingProgress = 90;
        loadingBar.style.width = loadingProgress + '%';
    }, 200);
}

function stopLoading() {
    clearInterval(loadingInterval);
    loadingProgress = 100;
    loadingBar.style.width = '100%';
    
    setTimeout(() => {
        loadingBar.style.display = 'none';
    }, 400);
}

// ============================================
// IMAGE LAZY LOADING ENHANCEMENT
// ============================================
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ============================================
// PERFORMANCE: REDUCE ANIMATIONS ON LOW-END DEVICES
// ============================================
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (prefersReducedMotion.matches) {
    document.querySelectorAll('*').forEach(el => {
        el.style.animation = 'none';
        el.style.transition = 'none';
    });
}

// ============================================
// VIEWPORT HEIGHT FIX FOR MOBILE
// ============================================
function setVH() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

setVH();
window.addEventListener('resize', setVH);

// ============================================
// CONSOLE EASTER EGG
// ============================================
console.log('%c🌿 Fundo Moraga - Batuco Off Road', 'font-size: 24px; font-weight: bold; color: #d4af37; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);');
console.log('%c475 años de historia desde 1551', 'font-size: 16px; color: #2c5530;');
console.log('%c¿Interesado en trabajar con nosotros? Envía tu CV a: contacto@fundomoraga.com', 'font-size: 14px; color: #666;');

// ============================================
// ANALYTICS READY
// ============================================
window.addEventListener('load', () => {
    // Track page load time
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    console.log(`Página cargada en ${loadTime}ms`);
    
    // You can send this to your analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'timing_complete', {
            'name': 'load',
            'value': loadTime,
            'event_category': 'Performance'
        });
    }
});

// ============================================
// HISTORIA PAGE SPECIFIC
// ============================================

// Check if we're on historia page
if (window.location.pathname.includes('historia.html')) {
    
    // Auto-generate IDs for h2 headings
    const h2Elements = document.querySelectorAll('article h2');
    h2Elements.forEach((h2, index) => {
        if (!h2.id) {
            const text = h2.textContent;
            let id = '';
            
            // Create specific IDs based on heading text
            if (text.includes('Imperio Romano')) id = 'origenes-romanos';
            else if (text.includes('Cáceres')) id = 'caceres';
            else if (text.includes('Llegada') && text.includes('Chile')) id = 'llegada-chile';
            else if (text.includes('Curalaba')) id = 'curalaba';
            else if (text.includes('Transmisión Matrilineal')) id = 'transmision-matrilineal';
            else if (text.includes('Consolidación')) id = 'consolidacion';
            else if (text.includes('Hacienda') && text.includes('Chacabuco')) id = 'chacabuco';
            else if (text.includes('Te Deum') || text.includes('Independiente')) id = 'independencia';
            else if (text.includes('Rodeo')) id = 'rodeo';
            else if (text.includes('Unión') && text.includes('Linajes')) id = 'union-linajes';
            else if (text.includes('Toro-Zambrano')) id = 'toro-zambrano';
            else if (text.includes('Valle Central')) id = 'valle-central';
            else if (text.includes('Legado Militar') || text.includes('Artillería')) id = 'legado-militar';
            else if (text.includes('Contemporánea')) id = 'presencia-actual';
            else if (text.includes('Patrimonio')) id = 'patrimonio';
            else if (text.includes('Referencias')) id = 'referencias';
            else id = `seccion-${index}`;
            
            h2.id = id;
        }
    });
    
    // Animate images on scroll
    const images = document.querySelectorAll('.article-image');
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(30px)';
                
                setTimeout(() => {
                    entry.target.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
                
                imageObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    });
    
    images.forEach(img => imageObserver.observe(img));
    
    // Image lightbox for historia
    images.forEach(image => {
        image.addEventListener('click', () => {
            const lightbox = document.createElement('div');
            lightbox.className = 'lightbox active';
            lightbox.innerHTML = `
                <span class="lightbox-close">&times;</span>
                <img src="${image.src}" alt="${image.alt}">
                <div class="lightbox-caption">${image.alt}</div>
            `;
            
            document.body.appendChild(lightbox);
            document.body.style.overflow = 'hidden';
            
            // Close lightbox
            const closeBtn = lightbox.querySelector('.lightbox-close');
            closeBtn.addEventListener('click', () => {
                lightbox.classList.remove('active');
                document.body.style.overflow = 'auto';
                setTimeout(() => lightbox.remove(), 300);
            });
            
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) {
                    lightbox.classList.remove('active');
                    document.body.style.overflow = 'auto';
                    setTimeout(() => lightbox.remove(), 300);
                }
            });
        });
    });
    
    // Smooth scroll for table of contents
    const tocLinks = document.querySelectorAll('.toc a');
    tocLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 100;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
                
                // Highlight the section briefly
                targetElement.style.transition = 'background 0.5s ease';
                targetElement.style.background = 'rgba(212, 175, 55, 0.1)';
                targetElement.style.borderRadius = '8px';
                targetElement.style.padding = '10px';
                
                setTimeout(() => {
                    targetElement.style.background = '';
                    targetElement.style.padding = '';
                }, 2000);
            }
        });
    });
    
    // Active section highlighting in TOC
    const sections = document.querySelectorAll('article h2[id]');
    
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                tocLinks.forEach(link => {
                    link.style.color = '';
                    link.style.fontWeight = '';
                    
                    if (link.getAttribute('href') === `#${entry.target.id}`) {
                        link.style.color = 'var(--accent-color)';
                        link.style.fontWeight = '600';
                    }
                });
            }
        });
    }, {
        threshold: 0.5,
        rootMargin: '-100px 0px -70% 0px'
    });
    
    sections.forEach(section => sectionObserver.observe(section));
    
    // Animate paragraphs on scroll
    const paragraphs = document.querySelectorAll('article p');
    
    const paragraphObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    entry.target.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateX(0)';
                }, 100);
                
                paragraphObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.3
    });
    
    paragraphs.forEach(p => paragraphObserver.observe(p));
    
    // Heading animations
    const headings = document.querySelectorAll('article h2, article h3');
    
    const headingObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(-20px)';
                
                setTimeout(() => {
                    entry.target.style.transition = 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 50);
                
                headingObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.5
    });
    
    headings.forEach(h => headingObserver.observe(h));
    
    // Reading progress bar
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 4px;
        background: linear-gradient(90deg, var(--accent-color), #fbbf24);
        z-index: 9999;
        transition: width 0.1s ease;
        width: 0%;
    `;
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight - windowHeight;
        const scrolled = window.scrollY;
        const progress = (scrolled / documentHeight) * 100;
        progressBar.style.width = `${progress}%`;
    });
    
    // Print friendly version
    const printBtn = document.createElement('button');
    printBtn.innerHTML = '🖨️ Imprimir';
    printBtn.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 30px;
        background: white;
        color: var(--primary-color);
        border: 2px solid var(--accent-color);
        padding: 12px 24px;
        border-radius: 50px;
        cursor: pointer;
        font-weight: 600;
        box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        z-index: 999;
        transition: all 0.3s ease;
        font-size: 14px;
    `;
    
    printBtn.addEventListener('mouseenter', () => {
        printBtn.style.background = 'var(--accent-color)';
        printBtn.style.color = 'black';
        printBtn.style.transform = 'translateY(-5px)';
        printBtn.style.boxShadow = '0 10px 30px rgba(212, 175, 55, 0.3)';
    });
    
    printBtn.addEventListener('mouseleave', () => {
        printBtn.style.background = 'white';
        printBtn.style.color = 'var(--primary-color)';
        printBtn.style.transform = 'translateY(0)';
        printBtn.style.boxShadow = '0 5px 20px rgba(0,0,0,0.1)';
    });
    
    printBtn.addEventListener('click', () => window.print());
    
    document.body.appendChild(printBtn);
    
    console.log('✅ Historia page enhancements loaded');
}
})();

// ============================================
// LIGHTBOX PREMIUM
// ============================================
(() => {
    const lightbox = document.getElementById('lightbox');
    const lightboxVideo = document.getElementById('lightboxVideo');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const lightboxCounter = document.getElementById('lightboxCounter');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    
    if (!lightbox || !lightboxVideo) return;
    
    let currentIndex = 0;
    let galleryItems = [];
    
    const initGallery = () => {
        // Buscar todos los items de video en la galería
        const videoCards = document.querySelectorAll('.video-gallery-grid .video-card[data-lightbox-src]');
        galleryItems = Array.from(videoCards).map(card => ({
            src: card.dataset.lightboxSrc || '',
            caption: card.querySelector('.video-card-title')?.textContent || ''
        }));
        
        // Agregar event listeners a cada tarjeta
        videoCards.forEach((card, index) => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                openLightbox(index);
            });
            card.style.cursor = 'pointer';
        });
    };
    
    const openLightbox = (index) => {
        currentIndex = index;
        updateLightbox();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        lightboxVideo.play();
    };
    
    const closeLightbox = () => {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        lightboxVideo.pause();
        lightboxVideo.currentTime = 0;
    };
    
    const updateLightbox = () => {
        if (galleryItems.length === 0) return;
        
        const item = galleryItems[currentIndex];
        lightboxVideo.querySelector('source').src = item.src;
        lightboxVideo.load();
        lightboxCaption.textContent = item.caption;
        lightboxCounter.textContent = `${currentIndex + 1} / ${galleryItems.length}`;
    };
    
    const nextItem = () => {
        currentIndex = (currentIndex + 1) % galleryItems.length;
        updateLightbox();
        lightboxVideo.play();
    };
    
    const prevItem = () => {
        currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
        updateLightbox();
        lightboxVideo.play();
    };
    
    // Event listeners
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxNext.addEventListener('click', nextItem);
    lightboxPrev.addEventListener('click', prevItem);
    
    // Click fuera del contenido para cerrar
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        
        switch(e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowLeft':
                prevItem();
                break;
            case 'ArrowRight':
                nextItem();
                break;
        }
    });
    
    // Inicializar cuando la galería esté lista
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGallery);
    } else {
        initGallery();
    }
    
    console.log('✅ Lightbox premium inicializado');
})();

// ============================================
// SCROLL TO TOP BUTTON
// ============================================
(() => {
    const scrollBtn = document.getElementById('scrollToTop');
    if (!scrollBtn) return;
    
    const toggleButton = () => {
        if (window.scrollY > 500) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    };
    
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };
    
    window.addEventListener('scroll', toggleButton);
    scrollBtn.addEventListener('click', scrollToTop);
    
    // Initial check
    toggleButton();
    
    console.log('✅ Scroll to top inicializado');
})();

// ============================================
// FORM VALIDATION ENHANCEMENT
// ============================================
(() => {
    const form = document.getElementById('contactForm');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, textarea, select');
    
    // Validación en tiempo real
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            validateField(input);
        });
        
        input.addEventListener('input', () => {
            if (input.classList.contains('error')) {
                validateField(input);
            }
        });
    });
    
    const validateField = (field) => {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        // Validación requerida
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'Este campo es obligatorio';
        }
        
        // Validación de email
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Email inválido';
            }
        }
        
        // Validación de teléfono
        if (field.type === 'tel' && value) {
            const phoneRegex = /^[+]?[\d\s()-]{8,}$/;
            if (!phoneRegex.test(value)) {
                isValid = false;
                errorMessage = 'Teléfono inválido';
            }
        }
        
        // Aplicar estados visuales
        if (isValid) {
            field.classList.remove('error');
            field.classList.add('valid');
            removeError(field);
        } else {
            field.classList.remove('valid');
            field.classList.add('error');
            showError(field, errorMessage);
        }
        
        return isValid;
    };
    
    const showError = (field, message) => {
        removeError(field);
        const error = document.createElement('span');
        error.className = 'field-error';
        error.textContent = message;
        error.style.cssText = `
            color: #ef4444;
            font-size: 0.875rem;
            margin-top: 4px;
            display: block;
        `;
        field.parentElement.appendChild(error);
    };
    
    const removeError = (field) => {
        const error = field.parentElement.querySelector('.field-error');
        if (error) error.remove();
    };
    
    // Mejorar el estilo de los campos
    const style = document.createElement('style');
    style.textContent = `
        .contact-form input.valid,
        .contact-form textarea.valid,
        .contact-form select.valid {
            border-color: #10b981 !important;
        }
        
        .contact-form input.error,
        .contact-form textarea.error,
        .contact-form select.error {
            border-color: #ef4444 !important;
        }
        
        .contact-form input:focus.valid,
        .contact-form textarea:focus.valid,
        .contact-form select:focus.valid {
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
        }
        
        .contact-form input:focus.error,
        .contact-form textarea:focus.error,
        .contact-form select:focus.error {
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
        }
    `;
    document.head.appendChild(style);
    
    console.log('✅ Form validation mejorada');
})();

console.log('🌟 Todas las mejoras premium cargadas exitosamente');
