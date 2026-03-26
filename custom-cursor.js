(() => {
    'use strict';

    const supportsFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const INTERACTIVE_SELECTOR = [
        'a',
        'button',
        'input',
        'textarea',
        'select',
        '[role="button"]',
        '.service-card',
        '.testimonial-card',
        '.video-card',
        '.story-card',
        '.chapter-nav__list a',
        '.nav-links a',
        '.btn',
        '.mapa-btn',
    ].join(', ');

    const isInternalNavigableLink = (anchor) => {
        if (!(anchor instanceof HTMLAnchorElement)) return false;
        if (anchor.target && anchor.target !== '_self') return false;
        if (anchor.hasAttribute('download')) return false;

        const href = anchor.getAttribute('href');
        if (!href || href === '#') return false;
        if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;

        try {
            const url = new URL(anchor.href, window.location.href);
            return url.origin === window.location.origin;
        } catch {
            return false;
        }
    };

    const createFlare = ({ x, y, immediate = false }) => {
        const flare = document.createElement('span');
        flare.className = 'cursor-transition-flare';
        flare.style.left = `${x}px`;
        flare.style.top = `${y}px`;
        if (immediate) flare.classList.add('is-immediate');
        document.body.appendChild(flare);
        window.setTimeout(() => {
            try {
                flare.remove();
            } catch {}
        }, immediate ? 460 : 1500);
    };

    const initTransitionContinuity = () => {
        const key = 'fm:transition-flare';

        try {
            const saved = sessionStorage.getItem(key);
            if (saved && !prefersReducedMotion) {
                const data = JSON.parse(saved);
                if (Number.isFinite(data?.x) && Number.isFinite(data?.y)) {
                    const x = Math.max(0, Math.min(window.innerWidth, Math.round(data.x * window.innerWidth)));
                    const y = Math.max(0, Math.min(window.innerHeight, Math.round(data.y * window.innerHeight)));
                    window.requestAnimationFrame(() => createFlare({ x, y, immediate: false }));
                }
            }
        } catch {}

        try {
            sessionStorage.removeItem(key);
        } catch {}

        document.addEventListener(
            'click',
            (e) => {
                if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                const anchor = e.target instanceof Element ? e.target.closest('a') : null;
                if (!isInternalNavigableLink(anchor)) return;

                const px = Number.isFinite(e.clientX) ? e.clientX : window.innerWidth / 2;
                const py = Number.isFinite(e.clientY) ? e.clientY : window.innerHeight / 2;

                if (!prefersReducedMotion) {
                    createFlare({ x: px, y: py, immediate: true });
                }

                try {
                    sessionStorage.setItem(
                        key,
                        JSON.stringify({
                            x: px / Math.max(1, window.innerWidth),
                            y: py / Math.max(1, window.innerHeight),
                            t: Date.now(),
                        }),
                    );
                } catch {}
            },
            { passive: true },
        );
    };

    const initTechAudio = () => {
        const storageKey = 'fm:tech-sfx-enabled';
        const state = {
            enabled: false,
            ctx: null,
            gain: null,
            lastPlay: 0,
        };

        const readStored = () => {
            try {
                return localStorage.getItem(storageKey) === '1';
            } catch {
                return false;
            }
        };

        const writeStored = (enabled) => {
            try {
                localStorage.setItem(storageKey, enabled ? '1' : '0');
            } catch {}
        };

        const ensureAudio = async () => {
            if (!window.AudioContext && !window.webkitAudioContext) return false;
            if (state.ctx && state.gain) {
                if (state.ctx.state === 'suspended') {
                    try {
                        await state.ctx.resume();
                    } catch {}
                }
                return true;
            }

            try {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                state.ctx = new Ctx();
                state.gain = state.ctx.createGain();
                state.gain.gain.value = 0.0001;
                state.gain.connect(state.ctx.destination);
                return true;
            } catch {
                return false;
            }
        };

        const playTone = async ({ freq = 680, ms = 32, type = 'triangle', amp = 0.018 }) => {
            const now = Date.now();
            if (now - state.lastPlay < 32) return;
            state.lastPlay = now;

            const ok = await ensureAudio();
            if (!ok || !state.ctx || !state.gain) return;
            const t = state.ctx.currentTime;

            const osc = state.ctx.createOscillator();
            const g = state.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 0.78), t + ms / 1000);

            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(amp, t + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);

            osc.connect(g);
            g.connect(state.gain);
            osc.start(t);
            osc.stop(t + ms / 1000 + 0.02);
        };

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fx-sound-toggle';
        btn.setAttribute('aria-label', 'Activar sonido de interfaz');
        btn.innerHTML = '<span class="fx-sound-toggle__icon" aria-hidden="true">✦</span><span class="fx-sound-toggle__text">SFX OFF</span>';
        document.body.appendChild(btn);
        document.body.classList.add('has-fx-sound-toggle');

        const syncButton = () => {
            btn.classList.toggle('is-on', state.enabled);
            btn.setAttribute('aria-pressed', String(state.enabled));
            btn.setAttribute('aria-label', state.enabled ? 'Desactivar sonido de interfaz' : 'Activar sonido de interfaz');
            const text = btn.querySelector('.fx-sound-toggle__text');
            if (text) text.textContent = state.enabled ? 'SFX ON' : 'SFX OFF';
        };

        state.enabled = readStored();
        syncButton();

        btn.addEventListener('click', async () => {
            state.enabled = !state.enabled;
            writeStored(state.enabled);
            syncButton();
            if (state.enabled) {
                await playTone({ freq: 920, ms: 48, type: 'sine', amp: 0.02 });
            }
        });

        const onInteractive = async (e, type) => {
            if (!state.enabled) return;
            const target = e.target;
            if (!(target instanceof Element) || !target.closest(INTERACTIVE_SELECTOR)) return;
            if (type === 'hover') {
                await playTone({ freq: 760, ms: 26, type: 'triangle', amp: 0.013 });
                return;
            }
            await playTone({ freq: 980, ms: 44, type: 'sine', amp: 0.02 });
        };

        document.addEventListener('pointerover', (e) => onInteractive(e, 'hover'), { passive: true });
        document.addEventListener('click', (e) => onInteractive(e, 'click'), { passive: true });
    };

    const initCursorTrail = (followerRef) => {
        if (prefersReducedMotion) return;

        const sparks = [];
        const maxSparks = 28;
        let lastSpawn = 0;
        let prevX = window.innerWidth / 2;
        let prevY = window.innerHeight / 2;

        const spawnSpark = (x, y) => {
            const spark = document.createElement('span');
            spark.className = 'cursor-trail-spark';
            spark.style.left = `${x}px`;
            spark.style.top = `${y}px`;
            document.body.appendChild(spark);

            sparks.push({
                el: spark,
                x,
                y,
                vx: (Math.random() - 0.5) * 0.9,
                vy: (Math.random() - 0.5) * 0.9 - 0.35,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
                scale: 0.65 + Math.random() * 0.9,
            });

            if (sparks.length > maxSparks) {
                const old = sparks.shift();
                try {
                    old?.el?.remove();
                } catch {}
            }
        };

        const animate = () => {
            for (let i = sparks.length - 1; i >= 0; i -= 1) {
                const s = sparks[i];
                s.life -= s.decay;
                s.x += s.vx;
                s.y += s.vy;
                s.vx *= 0.985;
                s.vy *= 0.988;
                s.scale *= 0.992;

                if (s.life <= 0) {
                    try {
                        s.el.remove();
                    } catch {}
                    sparks.splice(i, 1);
                    continue;
                }

                s.el.style.left = `${s.x}px`;
                s.el.style.top = `${s.y}px`;
                s.el.style.opacity = `${Math.max(0, s.life)}`;
                s.el.style.transform = `translate(-50%, -50%) scale(${s.scale})`;
            }
            requestAnimationFrame(animate);
        };

        document.addEventListener(
            'pointermove',
            (e) => {
                const now = performance.now();
                const dx = e.clientX - prevX;
                const dy = e.clientY - prevY;
                prevX = e.clientX;
                prevY = e.clientY;

                const speed = Math.abs(dx) + Math.abs(dy);
                if (now - lastSpawn < 16 || speed < 3) return;
                lastSpawn = now;

                const fx = followerRef ? Number.parseFloat(followerRef.style.left || e.clientX) : e.clientX;
                const fy = followerRef ? Number.parseFloat(followerRef.style.top || e.clientY) : e.clientY;
                spawnSpark(fx, fy);
            },
            { passive: true },
        );

        animate();
    };

    initTransitionContinuity();
    initTechAudio();

    if (!supportsFinePointer) {
        return;
    }

    let cursor = document.getElementById('customCursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.id = 'customCursor';
        cursor.className = 'custom-cursor';
        document.body.appendChild(cursor);
    }

    let follower = document.getElementById('customCursorFollower');
    if (!follower) {
        follower = document.createElement('div');
        follower.id = 'customCursorFollower';
        follower.className = 'custom-cursor-follower';
        document.body.appendChild(follower);
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let followerX = mouseX;
    let followerY = mouseY;

    const setCursorPosition = (x, y) => {
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
    };

    setCursorPosition(mouseX, mouseY);
    follower.style.left = `${followerX}px`;
    follower.style.top = `${followerY}px`;

    document.addEventListener(
        'pointermove',
        (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            setCursorPosition(mouseX, mouseY);
        },
        { passive: true },
    );

    const animateFollower = () => {
        followerX += (mouseX - followerX) * 0.15;
        followerY += (mouseY - followerY) * 0.15;

        follower.style.left = `${followerX}px`;
        follower.style.top = `${followerY}px`;

        requestAnimationFrame(animateFollower);
    };

    animateFollower();
    initCursorTrail(follower);

    document.addEventListener(
        'pointerover',
        (e) => {
            const target = e.target;
            if (!(target instanceof Element)) return;

            if (target.closest(INTERACTIVE_SELECTOR)) {
                cursor.classList.add('scale');
                follower.classList.add('scale');
            }
        },
        { passive: true },
    );

    document.addEventListener(
        'pointerout',
        (e) => {
            const target = e.target;
            if (!(target instanceof Element)) return;

            if (target.closest(INTERACTIVE_SELECTOR)) {
                cursor.classList.remove('scale');
                follower.classList.remove('scale');
            }
        },
        { passive: true },
    );

    document.addEventListener('mouseleave', () => {
        cursor.style.opacity = '0';
        follower.style.opacity = '0';
    });

    document.addEventListener('mouseenter', () => {
        cursor.style.opacity = '1';
        follower.style.opacity = '1';
    });
})();
