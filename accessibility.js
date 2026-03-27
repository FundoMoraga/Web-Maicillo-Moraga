/**
 * Accessibility Enhancements
 * Fundo Moraga - 2026
 * Mejoras de accesibilidad siguiendo WCAG 2.1 Level AA
 */

(function() {
    'use strict';
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAccessibility);
    } else {
        initAccessibility();
    }
    
    function initAccessibility() {
        ensureMainContentTarget();
        addSkipLinks();
        enhanceFocusIndicators();
        improveFormAccessibility();
        addARIALabels();
        setupKeyboardNavigation();
        announcePageChanges();
    }

    /**
     * Ensure a valid #main-content target exists for skip link
     */
    function ensureMainContentTarget() {
        if (document.getElementById('main-content')) return;

        const candidate = document.querySelector('main, #inicio, .mapa-shell, .historia-main, .content, section');
        if (!candidate) return;

        if (candidate.tagName.toLowerCase() === 'main' && !candidate.id) {
            candidate.id = 'main-content';
            return;
        }

        const anchor = document.createElement('span');
        anchor.id = 'main-content';
        anchor.setAttribute('aria-hidden', 'true');
        anchor.style.cssText = 'position:relative;display:block;height:0;overflow:hidden;';
        candidate.parentNode?.insertBefore(anchor, candidate);
    }
    
    /**
     * Add skip links for keyboard navigation
     */
    function addSkipLinks() {
        if (document.querySelector('.skip-link')) {
            return; // Already exists
        }
        
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Saltar al contenido principal';
        
        document.body.insertBefore(skipLink, document.body.firstChild);
        
        // Add skip link styles
        if (!document.getElementById('skip-link-styles')) {
            const style = document.createElement('style');
            style.id = 'skip-link-styles';
            style.textContent = `
                .skip-link {
                    position: absolute;
                    top: -40px;
                    left: 0;
                    background: #d4af37;
                    color: #1c1c1c;
                    padding: 12px 20px;
                    text-decoration: none;
                    z-index: 10000;
                    font-weight: 600;
                    border-radius: 0 0 8px 0;
                }
                
                .skip-link:focus {
                    top: 0;
                    outline: 3px solid #fff;
                    outline-offset: 2px;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    /**
     * Enhance focus indicators for better visibility
     */
    function enhanceFocusIndicators() {
        if (document.getElementById('focus-indicators-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'focus-indicators-styles';
        style.textContent = `
            /* Enhanced focus indicators */
            a:focus-visible,
            button:focus-visible,
            input:focus-visible,
            select:focus-visible,
            textarea:focus-visible,
            [tabindex]:focus-visible {
                outline: 3px solid #d4af37;
                outline-offset: 2px;
                border-radius: 4px;
            }
            
            /* Remove outline for mouse users */
            a:focus:not(:focus-visible),
            button:focus:not(:focus-visible),
            input:focus:not(:focus-visible),
            select:focus:not(:focus-visible),
            textarea:focus:not(:focus-visible) {
                outline: none;
            }
            
            /* High contrast mode support */
            @media (prefers-contrast: high) {
                a:focus-visible,
                button:focus-visible,
                input:focus-visible,
                select:focus-visible,
                textarea:focus-visible {
                    outline: 4px solid currentColor;
                    outline-offset: 3px;
                }
            }
            
            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                *,
                *::before,
                *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Improve form accessibility
     */
    function improveFormAccessibility() {
        // Associate labels with inputs
        document.querySelectorAll('input, select, textarea').forEach(input => {
            const id = input.id || `input-${Math.random().toString(36).substr(2, 9)}`;
            input.id = id;
            
            // Find associated label
            const label = input.closest('.form-group')?.querySelector('label');
            if (label && !label.htmlFor) {
                label.htmlFor = id;
            }
            
            // Add aria-required for required fields
            if (input.hasAttribute('required') && !input.hasAttribute('aria-required')) {
                input.setAttribute('aria-required', 'true');
            }
            
            // Add aria-invalid for invalid fields
            if (input.validity && !input.validity.valid && !input.hasAttribute('aria-invalid')) {
                input.setAttribute('aria-invalid', 'true');
            }
        });
        
        // Add aria-describedby for error messages
        document.querySelectorAll('.form-message.error').forEach(message => {
            const form = message.closest('form');
            if (form) {
                const messageId = message.id || `error-${Math.random().toString(36).substr(2, 9)}`;
                message.id = messageId;
                
                form.querySelectorAll('input, select, textarea').forEach(input => {
                    if (!input.hasAttribute('aria-describedby')) {
                        input.setAttribute('aria-describedby', messageId);
                    }
                });
            }
        });
    }
    
    /**
     * Add ARIA labels to interactive elements
     */
    function addARIALabels() {
        // Mobile menu toggle
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        if (mobileToggle && !mobileToggle.hasAttribute('aria-label')) {
            mobileToggle.setAttribute('aria-label', 'Abrir menú de navegación');
            mobileToggle.setAttribute('aria-expanded', 'false');
        }

        // Keep aria-expanded synced with menu state
        const navLinks = document.querySelector('.nav-links');
        if (mobileToggle && navLinks) {
            const syncExpanded = () => {
                mobileToggle.setAttribute('aria-expanded', navLinks.classList.contains('active') ? 'true' : 'false');
            };
            syncExpanded();
            mobileToggle.addEventListener('click', () => window.setTimeout(syncExpanded, 0));
            navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', syncExpanded));
        }
        
        // Navigation
        const nav = document.querySelector('nav.navbar, nav');
        if (nav && !nav.hasAttribute('aria-label')) {
            nav.setAttribute('aria-label', 'Navegación principal');
        }
        
        // Social media links
        document.querySelectorAll('a[href*="facebook"], a[href*="instagram"], a[href*="twitter"]').forEach(link => {
            if (!link.hasAttribute('aria-label')) {
                const platform = link.href.includes('facebook') ? 'Facebook' :
                               link.href.includes('instagram') ? 'Instagram' :
                               link.href.includes('twitter') ? 'Twitter' : 'Red social';
                link.setAttribute('aria-label', `Visitar nuestra página de ${platform}`);
            }
        });
        
        // External links
        document.querySelectorAll('a[target="_blank"]').forEach(link => {
            if (!link.hasAttribute('aria-label')) {
                const text = link.textContent.trim();
                link.setAttribute('aria-label', `${text} (se abre en una nueva ventana)`);
            }
            
            if (!link.hasAttribute('rel')) {
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });
        
        // Images without alt text
        document.querySelectorAll('img:not([alt])').forEach(img => {
            console.warn('Image without alt text:', img.src);
            img.setAttribute('alt', '');
            img.setAttribute('role', 'presentation');
        });
        
        // Decorative images
        document.querySelectorAll('img[alt=""]').forEach(img => {
            img.setAttribute('role', 'presentation');
        });
    }
    
    /**
     * Setup keyboard navigation
     */
    function setupKeyboardNavigation() {
        // Escape key to close modals/menus
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Close mobile menu
                const mobileToggle = document.querySelector('.mobile-menu-toggle');
                if (mobileToggle && mobileToggle.getAttribute('aria-expanded') === 'true') {
                    mobileToggle.click();
                }
                
                // Close any open modals
                document.querySelectorAll('.modal, .overlay').forEach(modal => {
                    if (modal.style.display !== 'none') {
                        modal.style.display = 'none';
                    }
                });
            }
        });
        
        // Trap focus in modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('keydown', trapFocus);
        });
        
        // Arrow key navigation for carousels
        document.querySelectorAll('.carousel, .slider').forEach(carousel => {
            carousel.setAttribute('role', 'region');
            carousel.setAttribute('aria-label', 'Carrusel de imágenes');
            
            carousel.addEventListener('keydown', (e) => {
                const items = carousel.querySelectorAll('.carousel-item, .slide');
                const activeIndex = Array.from(items).findIndex(item => 
                    item.classList.contains('active')
                );
                
                if (e.key === 'ArrowRight') {
                    const nextIndex = (activeIndex + 1) % items.length;
                    items[nextIndex]?.focus();
                } else if (e.key === 'ArrowLeft') {
                    const prevIndex = (activeIndex - 1 + items.length) % items.length;
                    items[prevIndex]?.focus();
                }
            });
        });
    }
    
    /**
     * Trap focus within an element
     */
    function trapFocus(e) {
        if (e.key !== 'Tab') return;
        
        const focusableElements = this.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }
    
    /**
     * Announce page changes to screen readers
     */
    function announcePageChanges() {
        // Create live region for announcements
        let liveRegion = document.getElementById('live-region');
        
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'live-region';
            liveRegion.setAttribute('role', 'status');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
            document.body.appendChild(liveRegion);
        }
        
        // Announce form submissions
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => {
                announce('Formulario enviado. Por favor espere...');
            });
        });
        
        // Announce successful actions
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList.contains('success')) {
                        const text = node.textContent.trim();
                        if (text) {
                            announce(text);
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * Announce message to screen readers
     */
    function announce(message) {
        const liveRegion = document.getElementById('live-region');
        if (liveRegion) {
            liveRegion.textContent = '';
            setTimeout(() => {
                liveRegion.textContent = message;
            }, 100);
        }
    }
    
    /**
     * Public API
     */
    window.Accessibility = {
        announce: announce,
        trapFocus: trapFocus
    };
    
})();
