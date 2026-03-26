/**
 * Dark Mode Toggle System
 * Fundo Moraga - 2026
 * Sistema de modo oscuro con persistencia en localStorage
 */

(function() {
    'use strict';
    
    // Check for saved theme preference or default to 'light' mode
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Apply theme immediately to prevent flash
    if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDarkMode);
    } else {
        initDarkMode();
    }
    
    function initDarkMode() {
        createToggleButton();
        setupEventListeners();
    }
    
    /**
     * Create dark mode toggle button
     */
    function createToggleButton() {
        // Check if button already exists
        if (document.getElementById('dark-mode-toggle')) {
            return;
        }
        
        const toggle = document.createElement('button');
        toggle.id = 'dark-mode-toggle';
        toggle.className = 'dark-mode-toggle';
        toggle.setAttribute('aria-label', 'Alternar modo oscuro');
        toggle.setAttribute('title', 'Alternar modo oscuro');
        
        const icon = document.createElement('span');
        icon.className = 'dark-mode-icon';
        icon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
        
        toggle.appendChild(icon);
        document.body.appendChild(toggle);
        
        // Add CSS if not already present
        if (!document.getElementById('dark-mode-styles')) {
            addDarkModeStyles();
        }
    }
    
    /**
     * Add dark mode styles dynamically
     */
    function addDarkModeStyles() {
        const style = document.createElement('style');
        style.id = 'dark-mode-styles';
        style.textContent = `
            /* Dark Mode Toggle Button */
            .dark-mode-toggle {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #d4af37 0%, #c19a2e 100%);
                border: none;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .dark-mode-toggle:hover {
                transform: scale(1.1) rotate(10deg);
                box-shadow: 0 6px 20px rgba(212, 175, 55, 0.5);
            }
            
            .dark-mode-toggle:active {
                transform: scale(0.95);
            }
            
            .dark-mode-icon {
                font-size: 28px;
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
            }
            
            /* Dark Mode Variables */
            :root {
                --bg-primary: #ffffff;
                --bg-secondary: #f8f9fa;
                --text-primary: #1c1c1c;
                --text-secondary: #666666;
                --text-light: #999999;
                --border-color: #e0e0e0;
                --shadow: rgba(0, 0, 0, 0.1);
                --card-bg: #ffffff;
            }
            
            html.dark-mode {
                --bg-primary: #0f0f0f;
                --bg-secondary: #1a1a1a;
                --text-primary: #e0e0e0;
                --text-secondary: #b0b0b0;
                --text-light: #808080;
                --border-color: #333333;
                --shadow: rgba(0, 0, 0, 0.5);
                --card-bg: #1c1c1c;
            }
            
            /* Dark Mode Styles */
            html.dark-mode body {
                background-color: var(--bg-primary);
                color: var(--text-primary);
            }
            
            html.dark-mode .navbar {
                background: rgba(10, 10, 10, 0.95);
                border-bottom: 1px solid var(--border-color);
            }
            
            html.dark-mode .footer {
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
                border-top: 1px solid var(--border-color);
            }
            
            html.dark-mode .about-content,
            html.dark-mode .services-card,
            html.dark-mode .package-card,
            html.dark-mode .blog-card,
            html.dark-mode .booking-form-section {
                background: var(--card-bg);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
            }
            
            html.dark-mode h1,
            html.dark-mode h2,
            html.dark-mode h3,
            html.dark-mode h4 {
                color: var(--text-primary);
            }
            
            html.dark-mode p,
            html.dark-mode li {
                color: var(--text-secondary);
            }
            
            html.dark-mode input,
            html.dark-mode select,
            html.dark-mode textarea {
                background: var(--bg-secondary);
                color: var(--text-primary);
                border-color: var(--border-color);
            }
            
            html.dark-mode input:focus,
            html.dark-mode select:focus,
            html.dark-mode textarea:focus {
                border-color: #d4af37;
                background: var(--bg-primary);
            }
            
            html.dark-mode .timeline-content {
                background: var(--card-bg);
                border-color: var(--border-color);
            }
            
            html.dark-mode .timeline-year {
                background: linear-gradient(135deg, #d4af37 0%, #c19a2e 100%);
            }
            
            html.dark-mode code {
                background: var(--bg-secondary);
                color: #d4af37;
                border: 1px solid var(--border-color);
            }
            
            /* Smooth transition for theme switch */
            html.dark-mode,
            html.dark-mode body,
            html.dark-mode .navbar,
            html.dark-mode .footer,
            html.dark-mode .about-content,
            html.dark-mode .services-card,
            html.dark-mode input,
            html.dark-mode select,
            html.dark-mode textarea {
                transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
            }
            
            /* Mobile adjustments */
            @media (max-width: 768px) {
                .dark-mode-toggle {
                    width: 50px;
                    height: 50px;
                    bottom: 20px;
                    right: 20px;
                }
                
                .dark-mode-icon {
                    font-size: 24px;
                }
            }
            
            /* Print mode - always light */
            @media print {
                html.dark-mode {
                    --bg-primary: #ffffff;
                    --bg-secondary: #f8f9fa;
                    --text-primary: #000000;
                    --text-secondary: #333333;
                    --border-color: #cccccc;
                }
                
                .dark-mode-toggle {
                    display: none !important;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        const toggleBtn = document.getElementById('dark-mode-toggle');
        
        if (!toggleBtn) {
            return;
        }
        
        toggleBtn.addEventListener('click', toggleDarkMode);
        
        // Listen for system theme changes
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeQuery.addEventListener('change', handleSystemThemeChange);
        }
    }
    
    /**
     * Toggle dark mode
     */
    function toggleDarkMode() {
        const html = document.documentElement;
        const icon = document.querySelector('.dark-mode-icon');
        
        if (html.classList.contains('dark-mode')) {
            // Switch to light mode
            html.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
            if (icon) icon.textContent = '🌙';
            
            // Track event
            trackThemeChange('light');
        } else {
            // Switch to dark mode
            html.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
            if (icon) icon.textContent = '☀️';
            
            // Track event
            trackThemeChange('dark');
        }
    }
    
    /**
     * Handle system theme preference changes
     */
    function handleSystemThemeChange(e) {
        // Only apply if user hasn't set a preference
        if (!localStorage.getItem('theme')) {
            const html = document.documentElement;
            const icon = document.querySelector('.dark-mode-icon');
            
            if (e.matches) {
                html.classList.add('dark-mode');
                if (icon) icon.textContent = '☀️';
            } else {
                html.classList.remove('dark-mode');
                if (icon) icon.textContent = '🌙';
            }
        }
    }
    
    /**
     * Track theme change in analytics
     */
    function trackThemeChange(theme) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'theme_change', {
                'event_category': 'User Preferences',
                'event_label': theme,
                'value': theme === 'dark' ? 1 : 0
            });
        }
    }
    
    /**
     * Public API
     */
    window.DarkMode = {
        toggle: toggleDarkMode,
        getCurrentTheme: () => localStorage.getItem('theme') || 'light',
        setTheme: (theme) => {
            const html = document.documentElement;
            const icon = document.querySelector('.dark-mode-icon');
            
            if (theme === 'dark') {
                html.classList.add('dark-mode');
                if (icon) icon.textContent = '☀️';
            } else {
                html.classList.remove('dark-mode');
                if (icon) icon.textContent = '🌙';
            }
            
            localStorage.setItem('theme', theme);
            trackThemeChange(theme);
        }
    };
    
})();
