/**
 * elite3d.js — WebGL / 3D Enhancement Layer
 * Maicillo Moraga — Fundo Moraga
 *
 * Módulos:
 *  1. Three.js Hero — campo de partículas de granito (WebGL)
 *  2. Card 3D Tilt — perspectiva reactiva al mouse
 *  3. Hero Parallax scroll
 *  4. Animated Stat Counters (IntersectionObserver)
 *  5. Section Reveal — entrada 3D en scroll
 */
(function () {
    'use strict';

    /* ──────────────────────────────────────────
       0. Marca .elite-3d en <html> para activar CSS
    ────────────────────────────────────────── */
    document.documentElement.classList.add('elite-3d');

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasHover       = window.matchMedia('(hover: hover)').matches;
    const isMobile       = window.innerWidth < 768;

    /* ──────────────────────────────────────────
       1. THREE.JS HERO — Granito particle field
    ────────────────────────────────────────── */
    function initHero3D() {
        if (typeof THREE === 'undefined') {
            // Three.js aún no cargó (deferred) — reintentar
            setTimeout(initHero3D, 80);
            return;
        }

        const canvas = document.getElementById('hero3dCanvas');
        if (!canvas) return;

        const hero   = document.querySelector('.maicillo-hero');
        const getW   = () => hero ? hero.offsetWidth  : window.innerWidth;
        const getH   = () => hero ? hero.offsetHeight : window.innerHeight;

        /* ── Renderer ── */
        const renderer = new THREE.WebGLRenderer({
            canvas       : canvas,
            alpha        : true,
            antialias    : false,
            powerPreference: 'low-power'
        });
        renderer.setSize(getW(), getH(), /* updateStyle= */ false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setClearColor(0x000000, 0);

        /* ── Scene & camera ── */
        const scene  = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(55, getW() / getH(), 0.1, 1000);
        camera.position.z = 34;

        /* ── Iluminación ambiental + tres puntos de luz ── */
        scene.add(new THREE.AmbientLight(0xfff8e8, 0.55));

        const keyLight  = new THREE.PointLight(0xd4af37, 3.2, 130);
        keyLight.position.set(32, 26, 18);
        scene.add(keyLight);

        const fillLight = new THREE.PointLight(0xb8941f, 2.0, 90);
        fillLight.position.set(-26, -16, 10);
        scene.add(fillLight);

        const rimLight  = new THREE.PointLight(0xffeedd, 1.3, 65);
        rimLight.position.set(0, -32, -12);
        scene.add(rimLight);

        /* ── Geometrías: roca low-poly + tetraedro polvo ── */
        const geoRock  = new THREE.IcosahedronGeometry(0.44, 0);
        const geoSmall = new THREE.IcosahedronGeometry(0.24, 0);
        const geoDust  = new THREE.TetrahedronGeometry(0.15, 0);

        /* ── Materiales PBR metálicos ── */
        const matGold = new THREE.MeshStandardMaterial({
            color      : new THREE.Color(0xd4af37),
            metalness  : 0.78,
            roughness  : 0.26,
            transparent: true,
            opacity    : 0.92
        });
        const matBronze = new THREE.MeshStandardMaterial({
            color      : new THREE.Color(0xa07840),
            metalness  : 0.62,
            roughness  : 0.44,
            transparent: true,
            opacity    : 0.78
        });
        const matDust = new THREE.MeshStandardMaterial({
            color      : new THREE.Color(0xe0c060),
            metalness  : 0.28,
            roughness  : 0.72,
            transparent: true,
            opacity    : 0.52
        });

        /* ── Conteo según capacidad del dispositivo ── */
        const cntLarge = isMobile ? 36  : 85;
        const cntSmall = isMobile ? 42  : 105;
        const cntDust  = isMobile ? 32  : 85;

        /* ── InstancedMesh para rendimiento máximo ── */
        const meshLarge = new THREE.InstancedMesh(geoRock,  matGold,   cntLarge);
        const meshSmall = new THREE.InstancedMesh(geoSmall, matBronze, cntSmall);
        const meshDust  = new THREE.InstancedMesh(geoDust,  matDust,   cntDust);
        scene.add(meshLarge, meshSmall, meshDust);

        /* ── Estado inicial de cada partícula ── */
        function buildParticles(count, spread) {
            const arr = [];
            for (let i = 0; i < count; i++) {
                arr.push({
                    x : (Math.random() - 0.5) * spread.x,
                    y : (Math.random() - 0.5) * spread.y,
                    z : (Math.random() - 0.5) * spread.z - 6,
                    rx: Math.random() * Math.PI * 2,
                    ry: Math.random() * Math.PI * 2,
                    rz: Math.random() * Math.PI * 2,
                    vx: (Math.random() - 0.5) * 0.013,
                    vy: (Math.random() - 0.5) * 0.010,
                    vrx: (Math.random() - 0.5) * 0.019,
                    vry: (Math.random() - 0.5) * 0.015,
                    vrz: (Math.random() - 0.5) * 0.013,
                    sc : 0.55 + Math.random() * 0.85
                });
            }
            return arr;
        }

        const large = buildParticles(cntLarge, { x: 92, y: 68, z: 48 });
        const small = buildParticles(cntSmall, { x: 86, y: 56, z: 42 });
        const dust  = buildParticles(cntDust,  { x: 72, y: 52, z: 32 });

        /* ── Parallax de mouse/touch ── */
        let mx = 0, my = 0, tmx = 0, tmy = 0;
        const onPointer = function (e) {
            var src = e.touches ? e.touches[0] : e;
            tmx =  (src.clientX / window.innerWidth  - 0.5) * 2;
            tmy = -(src.clientY / window.innerHeight - 0.5) * 2;
        };
        window.addEventListener('mousemove', onPointer, { passive: true });
        window.addEventListener('touchmove', onPointer, { passive: true });

        /* ── Loop de animación ── */
        const dummy = new THREE.Object3D();
        let   frame = 0;
        let   rafId;

        function stepParticles(arr, mesh, bx, by) {
            for (var i = 0; i < arr.length; i++) {
                var p = arr[i];
                p.x += p.vx;  p.y += p.vy;
                p.rx += p.vrx; p.ry += p.vry; p.rz += p.vrz;
                /* wrap */
                if (p.x >  bx) p.x = -bx;  if (p.x < -bx) p.x =  bx;
                if (p.y >  by) p.y = -by;  if (p.y < -by) p.y =  by;

                var depth = (p.z / 48 + 0.5);
                dummy.position.set(
                    p.x + mx * 2.8 * depth,
                    p.y + my * 2.0 * depth,
                    p.z
                );
                dummy.rotation.set(p.rx, p.ry, p.rz);
                dummy.scale.setScalar(p.sc);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;
        }

        function tick() {
            frame++;
            rafId = requestAnimationFrame(tick);

            /* suavizar mouse */
            mx += (tmx - mx) * 0.042;
            my += (tmy - my) * 0.042;

            /* orbitar luz clave */
            keyLight.position.x = Math.cos(frame * 0.0038) * 36;
            keyLight.position.y = Math.sin(frame * 0.0028) * 22;

            stepParticles(large, meshLarge, 50, 36);
            stepParticles(small, meshSmall, 46, 30);
            stepParticles(dust,  meshDust,  40, 28);

            /* cámara reactiva al mouse */
            camera.position.x += (mx * 1.6 - camera.position.x) * 0.024;
            camera.position.y += (my * 1.1 - camera.position.y) * 0.024;

            renderer.render(scene, camera);
        }

        tick();

        /* ── Si prefers-reduced-motion: render estático único ── */
        if (prefersReduced) {
            cancelAnimationFrame(rafId);
            renderer.render(scene, camera);
        }

        /* ── Resize ── */
        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                renderer.setSize(getW(), getH(), false);
                camera.aspect = getW() / getH();
                camera.updateProjectionMatrix();
            }, 200);
        }, { passive: true });
    }

    /* ──────────────────────────────────────────
       2. CARD 3D TILT — mouse reactivo
    ────────────────────────────────────────── */
    if (!prefersReduced && hasHover) {
        var TILT  = 9;   /* grados máx */
        var SCALE = 1.018;

        document.querySelectorAll(
            '.uso-card, .module-card, .trust-card, .water-stat, .mineral-card, .stat-card'
        ).forEach(function (card) {
            card.addEventListener('mousemove', function (e) {
                var r  = card.getBoundingClientRect();
                var cx = r.width  / 2;
                var cy = r.height / 2;
                var dx = e.clientX - r.left - cx;
                var dy = e.clientY - r.top  - cy;
                var rx = (dy / cy) * -TILT;
                var ry = (dx / cx) *  TILT;

                card.style.transition = 'none';
                card.style.transform  =
                    'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) ' +
                    'rotateY(' + ry.toFixed(2) + 'deg) ' +
                    'translateZ(10px) scale(' + SCALE + ')';

                /* posición del reflejo de luz */
                card.style.setProperty('--shine-x',
                    ((e.clientX - r.left) / r.width  * 100).toFixed(1) + '%');
                card.style.setProperty('--shine-y',
                    ((e.clientY - r.top)  / r.height * 100).toFixed(1) + '%');
            }, { passive: true });

            card.addEventListener('mouseleave', function () {
                card.style.transition = 'transform 0.58s cubic-bezier(0.23, 1, 0.32, 1)';
                card.style.transform  = '';
                card.style.removeProperty('--shine-x');
                card.style.removeProperty('--shine-y');
            });
        });
    }

    /* ──────────────────────────────────────────
       3. HERO PARALLAX en scroll
    ────────────────────────────────────────── */
    if (!prefersReduced) {
        var heroContent = document.querySelector('.maicillo-hero .hero-content');
        var heroGallery = document.querySelector('.hero-featured-gallery');
        var heroBadge   = document.querySelector('.maicillo-badge');

        if (heroContent) {
            var scrollTick = false;
            window.addEventListener('scroll', function () {
                if (scrollTick) return;
                scrollTick = true;
                requestAnimationFrame(function () {
                    var y = window.scrollY;
                    if (heroContent) heroContent.style.transform =
                        'translateY(' + (y * 0.16).toFixed(1) + 'px)';
                    if (heroGallery) heroGallery.style.transform =
                        'translateY(' + (y * 0.09).toFixed(1) + 'px)';
                    scrollTick = false;
                });
            }, { passive: true });
        }
    }

    /* ──────────────────────────────────────────
       4. ANIMATED STAT COUNTERS (IntersectionObserver)
    ────────────────────────────────────────── */
    if ('IntersectionObserver' in window) {
        var statEls = document.querySelectorAll('.water-stat__value, .stat-number');

        var ctrObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting || entry.target.dataset.counted) return;
                entry.target.dataset.counted = '1';

                var el  = entry.target;
                var raw = el.textContent.trim();
                var m   = raw.match(/([\d]+)/);
                if (!m) return;

                var target  = parseInt(m[1], 10);
                var suffix  = raw.replace(m[1], '');
                var dur     = 1500;
                var t0      = performance.now();

                (function step(now) {
                    var prog   = Math.min((now - t0) / dur, 1);
                    var eased  = 1 - Math.pow(2, -10 * prog);
                    el.textContent = Math.round(target * eased) + suffix;
                    if (prog < 1) requestAnimationFrame(step);
                })(t0);
            });
        }, { threshold: 0.45 });

        statEls.forEach(function (el) { ctrObs.observe(el); });
    }

    /* ──────────────────────────────────────────
       5. SECTION REVEAL — entrada 3D en scroll
    ────────────────────────────────────────── */
    if (!prefersReduced && 'IntersectionObserver' in window) {
        var revealSel = [
            '.uso-card', '.module-card', '.trust-card',
            '.case-card', '.water-stat',
            '.section-header', '.clients-logos li',
            '.stat-card', '.faq-item'
        ].join(', ');

        var revealEls = document.querySelectorAll(revealSel);

        revealEls.forEach(function (el, i) {
            el.classList.add('e3d-hidden');
            el.style.transition =
                'opacity 0.68s ease ' + ((i % 7) * 0.065) + 's, ' +
                'transform 0.68s cubic-bezier(0.23,1,0.32,1) ' + ((i % 7) * 0.065) + 's';
        });

        var revObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.remove('e3d-hidden');
                entry.target.classList.add('e3d-visible');
                revObs.unobserve(entry.target);
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -36px 0px' });

        revealEls.forEach(function (el) { revObs.observe(el); });
    }

    /* ──────────────────────────────────────────
       6. LAUNCH Three.js (defer — DOM ya está listo)
    ────────────────────────────────────────── */
    initHero3D();

})();
