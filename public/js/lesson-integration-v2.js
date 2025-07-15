// Simplified Lesson Integration - Clean single-page layout

class LessonIntegration {
    constructor(lessonConfig = {}) {
        this.config = {
            lessonId: lessonConfig.lessonId || 'unknown',
            lessonTitle: lessonConfig.lessonTitle || 'Math Lesson',
            baseXP: lessonConfig.baseXP || 15,
            difficulty: lessonConfig.difficulty || 'beginner',
            ...lessonConfig
        };
        
        this.isAuthenticated = false;
        this.userData = null;
        this.lessonStartTime = Date.now();
        this.totalXPEarned = 0;
        this.lessonCompleted = false;
        this.xpTransactions = []; // Track XP additions to prevent duplicates
        
        // Try to restore lesson state from sessionStorage
        this.restoreLessonState();
        
        this.init();
    }
    
    async init() {
        // Load override CSS to remove sub-window styling
        this.loadOverrideCSS();
        
        // Modify page structure for unified layout FIRST
        this.restructurePage();
        
        // Add navigation bar with loading state
        this.addSimpleNavigation();
        
        // Check authentication and update navigation
        await this.checkAuth();
        
        // Update navigation with auth status
        this.updateNavigationAuth();
        
        // Auth status checked
        
        // Add completion section at bottom
        this.addCompletionSection();
        
        // Override XP functions to track total XP
        this.interceptXPFunctions();
        
        // Save XP on page unload
        this.setupUnloadHandler();
        
        // Monitor for XP corruption
        this.monitorXPDisplay();
    }
    
    loadOverrideCSS() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/lesson-override.css';
        document.head.appendChild(link);
    }
    
    async checkAuth() {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            this.isAuthenticated = false;
            return;
        }
        
        try {
            const response = await fetch('/api/progress/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            
            if (response.ok) {
                const data = await response.json();
                
                // Handle the nested data structure from the API
                if (data.data && data.data.user) {
                    this.userData = data.data.user;
                } else if (data.user) {
                    this.userData = data.user;
                } else {
                    this.userData = data.data || data;
                }
                
                
                // Ensure totalXP exists in userData
                if (this.userData && !this.userData.totalXP && this.userData.xp !== undefined) {
                    this.userData.totalXP = this.userData.xp;
                }
                
                this.isAuthenticated = true;
                
                // Recover any pending XP from localStorage
                this.recoverPendingXP();
            } else {
                this.isAuthenticated = false;
            }
        } catch (error) {
            this.isAuthenticated = false;
        }
    }
    
    async recoverPendingXP() {
        const pendingXP = localStorage.getItem('pendingXP');
        if (!pendingXP) return;
        
        try {
            const pending = JSON.parse(pendingXP);
            if (pending.length === 0) return;
            
            
            // Process each pending XP entry
            for (const entry of pending) {
                await fetch('/api/progress/activity', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({
                        activityType: 'practice',
                        topic: entry.lesson + '-recovered',
                        score: Math.min(100, Math.round((entry.xp / 50) * 100)),
                        timeSpent: 60,
                        difficulty: 'beginner',
                        metadata: {
                            recoveredXP: true,
                            originalDate: entry.date,
                            pointsEarned: entry.xp
                        }
                    })
                });
            }
            
            // Clear pending XP after successful recovery
            localStorage.removeItem('pendingXP');
        } catch (error) {
        }
    }
    
    restructurePage() {
        // Remove all sub-window styling
        const elementsToClean = [
            '.container',
            '.content-wrapper',
            '.lesson-wrapper',
            '.main-content',
            '.lesson-content',
            'main',
            'article'
        ];
        
        elementsToClean.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.maxWidth = '100%';
                el.style.height = 'auto';
                el.style.overflow = 'visible';
                el.style.position = 'static';
                el.style.transform = 'none';
                el.style.borderRadius = '0';
                el.style.boxShadow = 'none';
            });
        });
        
        // Remove container restrictions
        const container = document.querySelector('.container');
        if (container) {
            container.style.maxWidth = '100%';
            container.style.margin = '0';
            container.style.padding = '0';
            container.style.background = 'transparent';
        }
        
        // Find and hide duplicate headers
        const headers = document.querySelectorAll('header');
        const mainContent = document.querySelector('.container') || document.body;
        
        // Hide all headers except the first one inside main content
        let firstHeaderFound = false;
        headers.forEach(header => {
            if (mainContent.contains(header)) {
                if (!firstHeaderFound) {
                    firstHeaderFound = true;
                    // Style the first header properly
                    header.style.borderRadius = '0';
                    header.style.marginTop = '0';
                } else {
                    // Hide duplicate headers
                    header.style.display = 'none';
                }
            }
        });
        
        // Clean up body styling
        document.body.style.padding = '0';
        document.body.style.margin = '0';
        document.body.style.background = '#ffffff';
        document.body.style.minHeight = '100vh';
        document.body.style.overflowX = 'hidden';
        document.body.style.overflowY = 'auto';
        
        // Remove any fixed or absolute positioned elements that create overlays
        const fixedElements = document.querySelectorAll('[style*="position: fixed"], [style*="position: absolute"]');
        fixedElements.forEach(el => {
            // Don't modify tooltips or dropdowns
            if (!el.classList.contains('tooltip') && !el.classList.contains('dropdown')) {
                el.style.position = 'static';
            }
        });
        
        // Add unified styles
        const style = document.createElement('style');
        style.textContent = `
            /* Reset and base styles */
            * {
                box-sizing: border-box;
            }
            
            body {
                margin: 0;
                padding: 0;
                background: #f7fafc;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
            }
            
            /* Simple navigation bar */
            .lesson-nav {
                background: white;
                border-bottom: 1px solid #e2e8f0;
                padding: 16px 20px;
                position: sticky;
                top: 0;
                z-index: 100;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }
            
            .nav-content {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 20px;
                flex-wrap: wrap;
            }
            
            .nav-left {
                display: flex;
                align-items: center;
                gap: 16px;
            }
            
            .back-link {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #4a5568;
                text-decoration: none;
                font-weight: 500;
                transition: color 0.2s;
            }
            
            .back-link:hover {
                color: #667eea;
            }
            
            .back-link svg {
                width: 20px;
                height: 20px;
            }
            
            .lesson-title {
                font-size: 18px;
                font-weight: 600;
                color: #1a202c;
            }
            
            .nav-right {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .user-info {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 14px;
            }
            
            .xp-badge, .level-badge {
                background: #edf2f7;
                padding: 4px 12px;
                border-radius: 16px;
                font-weight: 600;
            }
            
            .xp-badge {
                color: #667eea;
                background: #e9f0ff;
            }
            
            .level-badge {
                color: #48bb78;
                background: #e6ffed;
            }
            
            .login-prompt {
                color: #667eea !important;
                text-decoration: none !important;
                font-weight: 500 !important;
                padding: 6px 16px !important;
                border: 1px solid #667eea !important;
                border-radius: 6px !important;
                transition: all 0.2s !important;
                background: transparent !important;
                display: inline-block !important;
            }
            
            .login-prompt:hover {
                background: #667eea !important;
                color: white !important;
                text-decoration: none !important;
            }
            
            /* Main content wrapper */
            .lesson-content {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                background: white;
                min-height: calc(100vh - 60px);
            }
            
            /* Clean up existing lesson headers */
            .lesson-content > header:first-child {
                display: none !important;
            }
            
            /* Tab navigation styling */
            .tabs {
                margin-bottom: 24px;
                border-bottom: 2px solid #e2e8f0;
            }
            
            /* Completion section at bottom */
            .lesson-completion {
                background: #f8fafc;
                border-radius: 12px;
                padding: 32px;
                margin: 48px 0 24px;
                text-align: center;
                border: 1px solid #e2e8f0;
            }
            
            .completion-header {
                font-size: 24px;
                font-weight: 600;
                color: #1a202c;
                margin-bottom: 12px;
            }
            
            .completion-message {
                color: #718096;
                margin-bottom: 24px;
                max-width: 600px;
                margin-left: auto;
                margin-right: auto;
            }
            
            .completion-stats {
                display: flex;
                justify-content: center;
                gap: 48px;
                margin-bottom: 32px;
                flex-wrap: wrap;
            }
            
            .stat-item {
                text-align: center;
            }
            
            .stat-value {
                font-size: 32px;
                font-weight: 700;
                color: #667eea;
                display: block;
            }
            
            .stat-label {
                color: #718096;
                font-size: 14px;
                margin-top: 4px;
            }
            
            .completion-actions {
                display: flex;
                gap: 16px;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .btn {
                padding: 12px 32px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                border: none;
                cursor: pointer;
                transition: all 0.2s;
                text-decoration: none;
                display: inline-block;
            }
            
            .btn-primary {
                background: #667eea;
                color: white;
            }
            
            .btn-primary:hover:not(:disabled) {
                background: #5a67d8;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }
            
            .btn-secondary {
                background: #e2e8f0;
                color: #4a5568;
            }
            
            .btn-secondary:hover {
                background: #cbd5e0;
            }
            
            .btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .completion-success {
                background: #e6ffed;
                border: 1px solid #9ae6b4;
                border-radius: 8px;
                padding: 24px;
                margin-top: 24px;
            }
            
            .success-message {
                color: #22543d;
                font-weight: 600;
                font-size: 18px;
                margin-bottom: 8px;
            }
            
            .xp-earned {
                color: #48bb78;
                font-size: 36px;
                font-weight: 700;
                margin: 16px 0;
            }
            
            /* Responsive design */
            @media (max-width: 768px) {
                .nav-content {
                    font-size: 14px;
                }
                
                .lesson-title {
                    display: none;
                }
                
                .completion-stats {
                    gap: 24px;
                }
                
                .stat-value {
                    font-size: 24px;
                }
                
                .lesson-content {
                    padding: 16px;
                }
            }
            
            /* Remove any iframe-like styling */
            .container {
                height: auto !important;
                overflow: visible !important;
            }
            
            /* Ensure smooth scrolling */
            html {
                scroll-behavior: smooth;
            }
        `;
        // Add style at the end of head to ensure higher priority
        document.head.appendChild(style);
        
        // Force a style recalculation
        document.body.offsetHeight;
    }
    
    addSimpleNavigation() {
        const nav = document.createElement('nav');
        nav.className = 'lesson-nav';
        nav.innerHTML = `
            <div class="nav-content">
                <div class="nav-left">
                    <a href="/dashboard.html" class="back-link">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                        </svg>
                        Back
                    </a>
                    <div class="lesson-title">${this.config.lessonTitle}</div>
                </div>
                <div class="nav-right" id="nav-auth-section">
                    <div class="loading-auth" style="display: flex; align-items: center; gap: 8px; color: #666;">
                        <div style="width: 16px; height: 16px; border: 2px solid #666; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <span>Loading...</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add spinning animation style if not already present
        if (!document.getElementById('auth-loading-styles')) {
            const style = document.createElement('style');
            style.id = 'auth-loading-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Insert at the very beginning of body
        document.body.insertBefore(nav, document.body.firstChild);
        
        // Wrap existing content
        const existingContent = Array.from(document.body.children).filter(
            child => !child.classList.contains('lesson-nav')
        );
        
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'lesson-content';
        
        existingContent.forEach(child => {
            contentWrapper.appendChild(child);
        });
        
        document.body.appendChild(contentWrapper);
    }
    
    updateNavigationAuth() {
        
        const navAuthSection = document.getElementById('nav-auth-section');
        if (!navAuthSection) {
            return;
        }
        
        if (this.isAuthenticated && this.userData) {
            const userXP = this.userData.totalXP || this.userData.xp || 0;
            navAuthSection.innerHTML = `
                <div class="user-info">
                    <span class="xp-badge">🏆 ${userXP} XP</span>
                    <span class="level-badge">Lvl ${this.userData.level || 1}</span>
                </div>
            `;
        } else {
            navAuthSection.innerHTML = `
                <a href="/auth.html" class="login-prompt">Login</a>
            `;
        }
    }
    
    addCompletionSection() {
        const completionSection = document.createElement('section');
        completionSection.className = 'lesson-completion';
        completionSection.id = 'lessonCompletion';
        completionSection.innerHTML = `
            <h2 class="completion-header">Ready to complete this lesson?</h2>
            <p class="completion-message">
                Make sure you've understood all the concepts before marking as complete.
            </p>
            
            <div class="completion-stats">
                <div class="stat-item">
                    <span class="stat-value" id="timeSpent">0</span>
                    <span class="stat-label">Minutes Spent</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="pointsEarned">0</span>
                    <span class="stat-label">Points Earned</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${this.config.baseXP}</span>
                    <span class="stat-label">Base XP Reward</span>
                </div>
            </div>
            
            <div class="completion-actions">
                <button class="btn btn-secondary" onclick="lessonIntegration.continueLesson()">
                    Continue Practicing
                </button>
                <button class="btn btn-primary" id="completeBtn" onclick="lessonIntegration.completeLesson()" 
                        ${!this.isAuthenticated ? 'disabled' : ''}>
                    ${this.isAuthenticated ? '✓ Complete Lesson' : '🔒 Login Required'}
                </button>
            </div>
            
            <div id="completionResult"></div>
        `;
        
        // Append to the lesson content wrapper
        const contentWrapper = document.querySelector('.lesson-content');
        if (contentWrapper) {
            contentWrapper.appendChild(completionSection);
        }
        
        // Update stats periodically
        setInterval(() => this.updateCompletionStats(), 1000);
        
        // Check for auto-completion
        this.checkForAutoCompletion();
    }
    
    updateCompletionStats() {
        const timeElapsed = Math.floor((Date.now() - this.lessonStartTime) / 1000 / 60);
        const timeElement = document.getElementById('timeSpent');
        if (timeElement) {
            timeElement.textContent = timeElapsed;
        }
        
        // Update the points earned display with LESSON XP, not total user XP
        const pointsElement = document.getElementById('pointsEarned');
        if (pointsElement) {
            // Show the XP earned in THIS lesson only
            pointsElement.textContent = this.totalXPEarned;
            // Logging moved to monitorXPDisplay to prevent spam
        }
        
        // The xp-value element shows the user's TOTAL XP (all-time)
        // This is NOT the same as lesson XP and should not be validated here
        const xpElement = document.getElementById('xp-value');
        if (xpElement && this.userData) {
            const totalUserXP = this.userData.totalXP || this.userData.xp || 0;
            xpElement.textContent = totalUserXP;
            // Logging moved to monitorXPDisplay to prevent spam
        }
    }
    
    restoreLessonState() {
        const stateKey = `lessonState_${this.config.lessonId}`;
        const savedState = sessionStorage.getItem(stateKey);
        
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                
                // Check for corrupted values and clear if found
                if (state.currentXP > 500 || state.totalXPEarned > 500) {
                    
                    // Clear all lesson-related sessionStorage
                    const keysToRemove = [];
                    for (let i = 0; i < sessionStorage.length; i++) {
                        const key = sessionStorage.key(i);
                        if (key && key.includes('lesson')) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => {
                        sessionStorage.removeItem(key);
                    });
                    
                    // Reset to clean state
                    this.totalXPEarned = 0;
                    return;
                }
                
                // Only restore reasonable values
                if (state.totalXPEarned && state.totalXPEarned > 0 && state.totalXPEarned <= 500) {
                    this.totalXPEarned = state.totalXPEarned;
                    
                    // Update XP display after DOM is ready
                    setTimeout(() => {
                        const xpElement = document.getElementById('xp-value');
                        if (xpElement && state.currentXP && state.currentXP <= 500) {
                            xpElement.textContent = state.currentXP;
                        } else if (xpElement) {
                            // Reset display if corrupted
                            xpElement.textContent = '0';
                        }
                    }, 100);
                } else {
                    this.totalXPEarned = 0;
                }
                
                // Restore other state as needed
                if (state.lessonStartTime) {
                    this.lessonStartTime = state.lessonStartTime;
                }
            } catch (error) {
                // Clear corrupted state on error
                sessionStorage.removeItem(stateKey);
                this.totalXPEarned = 0;
            }
        }
    }
    
    saveLessonState() {
        // Save lesson state with lesson XP, not total user XP
        const lessonXP = this.totalXPEarned;
        
        const state = {
            lessonId: this.config.lessonId,
            totalXPEarned: lessonXP,
            lessonStartTime: this.lessonStartTime,
            timestamp: Date.now()
        };
        
        const stateKey = `lessonState_${this.config.lessonId}`;
        sessionStorage.setItem(stateKey, JSON.stringify(state));
    }

    interceptXPFunctions() {
        // Intercepting XP functions
        
        // Store original addXP function if it exists
        if (typeof window.addXP === 'function') {
            const originalAddXP = window.addXP;
            window.addXP = (amount) => {
                // Create a unique identifier for this XP transaction
                const timestamp = Date.now();
                const transactionId = `${amount}_${timestamp}`;
                
                // Check if we've seen this exact transaction very recently (within 100ms)
                const recentTransactions = this.xpTransactions.filter(t => 
                    t.amount === amount && (timestamp - t.timestamp) < 100
                );
                
                if (recentTransactions.length > 0) {
                    return;
                }
                
                // Add to transaction history
                this.xpTransactions.push({ amount, timestamp, id: transactionId });
                
                // Keep only last 100 transactions to prevent memory issues
                if (this.xpTransactions.length > 100) {
                    this.xpTransactions = this.xpTransactions.slice(-100);
                }
                
                
                this.totalXPEarned += amount;
                
                // Warn if total XP is getting unusually high
                if (this.totalXPEarned > 10000) {
                }
                
                originalAddXP(amount);
                
                // Save lesson state
                this.saveLessonState();
                
                // Save XP incrementally if user is authenticated
                if (this.isAuthenticated) {
                    this.saveIncrementalXP(amount);
                } else {
                }
                
                // Pulse the completion button when XP is earned
                const btn = document.querySelector('.show-completion-btn');
                if (btn) {
                    btn.classList.add('pulse');
                    setTimeout(() => btn.classList.remove('pulse'), 2000);
                }
            };
        } else {
        }
    }
    
    async saveIncrementalXP(xpAmount) {
        
        // Check authentication first
        if (!this.isAuthenticated) {
            return;
        }
        
        // Double-check auth token
        const token = localStorage.getItem('authToken');
        if (!token) {
            this.isAuthenticated = false;
            return;
        }
        
        // Decode JWT info (logging removed)
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            // JWT payload available if needed
        } catch (e) {
            // JWT decode error
        }
        
        try {
            // Debounce XP saves to avoid too many API calls
            if (this.xpSaveTimeout) {
                clearTimeout(this.xpSaveTimeout);
            }
            
            // Accumulate XP to save
            this.pendingXP = (this.pendingXP || 0) + xpAmount;
            
            this.xpSaveTimeout = setTimeout(async () => {
                const xpToSave = this.pendingXP;
                this.pendingXP = 0;
                
                
                // Re-verify auth token at save time
                const currentToken = localStorage.getItem('authToken');
                if (!currentToken) {
                    return;
                }
                
                const requestBody = {
                    activityType: 'practice',
                    topic: this.config.lessonId + '-progress',
                    score: 100, // Always use 100% for incremental saves
                    timeSpent: 60, // Default 1 minute per save
                    difficulty: this.config.difficulty,
                    xpOverride: xpToSave, // Send the exact XP amount to save
                    metadata: {
                        lessonTitle: this.config.lessonTitle,
                        incrementalSave: true,
                        pointsEarned: xpToSave,
                        exactXP: xpToSave, // Ensure we track the exact XP
                        timestamp: new Date().toISOString()
                    }
                };
                
                
                // Save as a practice activity with minimal score
                const response = await fetch('/api/progress/activity', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentToken}`
                    },
                    body: JSON.stringify(requestBody)
                });
                
                
                if (response.ok) {
                    const result = await response.json();
                    
                    // Check all possible response structures for totalXP
                    let newTotalXP = null;
                    if (result.data?.totalXP !== undefined) {
                        newTotalXP = result.data.totalXP;
                    } else if (result.data?.user?.xp !== undefined) {
                        newTotalXP = result.data.user.xp;
                    } else if (result.totalXP !== undefined) {
                        newTotalXP = result.totalXP;
                    } else if (result.xp !== undefined) {
                        newTotalXP = result.xp;
                    }
                    
                    
                    if (newTotalXP !== null && newTotalXP !== undefined) {
                        // Update userData
                        if (this.userData) {
                            const oldXP = this.userData.xp || this.userData.totalXP || 0;
                            this.userData.xp = newTotalXP;
                            this.userData.totalXP = newTotalXP;
                        } else {
                            this.userData = { xp: newTotalXP, totalXP: newTotalXP };
                        }
                        
                        // Update XP badge
                        const xpBadge = document.querySelector('.xp-badge');
                        if (xpBadge) {
                            const oldText = xpBadge.textContent;
                            xpBadge.textContent = `🏆 ${newTotalXP} XP`;
                            xpBadge.classList.add('pulse');
                            setTimeout(() => xpBadge.classList.remove('pulse'), 500);
                        } else {
                        }
                    } else {
                    }
                    
                    // Show visual feedback
                    this.showXPSaveNotification(xpToSave);
                } else {
                    const errorText = await response.text();
                    
                    // Try to parse error as JSON for better debugging
                    try {
                        const errorJson = JSON.parse(errorText);
                    } catch (e) {
                        // Not JSON, already logged as text
                    }
                    
                    // Put XP back in pending if save failed
                    this.pendingXP += xpToSave;
                }
            }, 2000); // Wait 2 seconds before saving to batch multiple XP gains
        } catch (error) {
        }
    }
    
    showXPSaveNotification(xpAmount) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #4caf50;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: 600;
            animation: slideUp 0.3s ease, fadeOut 0.3s ease 2s forwards;
        `;
        notification.textContent = `✅ Saved ${xpAmount} XP`;
        
        // Add animation styles if not present
        if (!document.getElementById('xp-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'xp-notification-styles';
            style.textContent = `
                @keyframes slideUp {
                    from { transform: translate(-50%, 100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                @keyframes fadeOut {
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2500);
    }
    
    setupUnloadHandler() {
        // Save any pending XP when user leaves the page
        window.addEventListener('beforeunload', async (e) => {
            // Save lesson state
            this.saveLessonState();
            if (this.pendingXP && this.isAuthenticated) {
                // Cancel any pending timeout
                if (this.xpSaveTimeout) {
                    clearTimeout(this.xpSaveTimeout);
                }
                
                // Try to save synchronously using sendBeacon
                const data = {
                    activityType: 'practice',
                    topic: this.config.lessonId + '-progress',
                    score: Math.min(100, Math.round((this.pendingXP / 50) * 100)),
                    timeSpent: 60,
                    difficulty: this.config.difficulty,
                    metadata: {
                        lessonTitle: this.config.lessonTitle,
                        incrementalSave: true,
                        pointsEarned: this.pendingXP,
                        unloadSave: true
                    }
                };
                
                // Use fetch with keepalive for reliable unload saves
                fetch('/api/progress/activity', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(data),
                    keepalive: true // Ensures request completes even if page unloads
                }).catch(() => {
                    // Fallback to localStorage if fetch fails
                    const pendingXP = localStorage.getItem('pendingXP') || '[]';
                    const pending = JSON.parse(pendingXP);
                    pending.push({ xp: this.pendingXP, lesson: this.config.lessonId, date: new Date().toISOString() });
                    localStorage.setItem('pendingXP', JSON.stringify(pending));
                });
            }
        });
    }
    
    checkForAutoCompletion() {
        // Monitor for worksheet completion
        const checkCompletion = setInterval(() => {
            if (typeof problemsCompleted !== 'undefined' && 
                typeof totalProblems !== 'undefined' && 
                problemsCompleted === totalProblems && 
                !this.lessonCompleted) {
                
                clearInterval(checkCompletion);
                
                // Scroll to completion section
                setTimeout(() => {
                    const completionSection = document.getElementById('lessonCompletion');
                    if (completionSection) {
                        completionSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        // Add a subtle highlight animation
                        completionSection.style.animation = 'highlight 1s ease';
                        setTimeout(() => {
                            completionSection.style.animation = '';
                        }, 1000);
                    }
                }, 1000);
            }
        }, 1000);
    }
    
    continueLesson() {
        // Scroll back to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    async completeLesson() {
        if (!this.isAuthenticated || this.lessonCompleted) {
            return;
        }
        
        const completeBtn = document.getElementById('completeBtn');
        const resultDiv = document.getElementById('completionResult');
        
        // Show loading state
        completeBtn.disabled = true;
        completeBtn.textContent = '⏳ Saving...';
        
        try {
            // Calculate score based on XP earned vs possible XP
            const xpElement = document.getElementById('xp-value');
            // Use lesson XP for completion, not total user XP
            const lessonXP = this.totalXPEarned;
            
            // Calculate score based on lesson XP (assuming max 50 XP per lesson)
            const score = Math.min(100, Math.round((lessonXP / 50) * 100));
            
            const response = await fetch('/api/progress/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    activityType: 'lesson',
                    topic: this.config.lessonId,
                    score: score,
                    timeSpent: Math.floor((Date.now() - this.lessonStartTime) / 1000),
                    difficulty: this.config.difficulty,
                    metadata: {
                        lessonTitle: this.config.lessonTitle,
                        pointsEarned: currentXP
                    }
                })
            });
            
            if (!response.ok) throw new Error('Failed to save progress');
            
            const result = await response.json();
            this.lessonCompleted = true;
            
            // Show success state
            resultDiv.innerHTML = `
                <div class="completion-success">
                    <div class="success-message">🎉 Lesson Completed!</div>
                    <div class="xp-earned">+${result.xpEarned} XP</div>
                    <p style="color: #48bb78;">Great job! Your progress has been saved.</p>
                </div>
            `;
            
            // Update button
            completeBtn.textContent = '✓ Completed';
            completeBtn.style.background = '#48bb78';
            
            // Update user XP display
            if (this.userData) {
                this.userData.totalXP += result.xpEarned;
                const xpBadge = document.querySelector('.xp-badge');
                if (xpBadge) {
                    xpBadge.textContent = `🏆 ${this.userData.totalXP} XP`;
                }
            }
            
        } catch (error) {
            completeBtn.disabled = false;
            completeBtn.textContent = '✓ Complete Lesson';
            
            resultDiv.innerHTML = `
                <div style="background: #fff5f5; border: 1px solid #feb2b2; border-radius: 8px; padding: 16px; margin-top: 16px;">
                    <p style="color: #c53030;">Failed to save progress. Please try again.</p>
                </div>
            `;
        }
    }
    
    monitorXPDisplay() {
        // Store last logged values to prevent spam
        let lastLoggedLessonXP = -1;
        let lastLoggedUserXP = -1;
        
        // Update displays periodically
        const checkInterval = setInterval(() => {
            // Update lesson XP display
            const pointsElement = document.getElementById('pointsEarned');
            if (pointsElement) {
                pointsElement.textContent = this.totalXPEarned;
                
                // Only log if value changed
                if (this.totalXPEarned !== lastLoggedLessonXP) {
                    lastLoggedLessonXP = this.totalXPEarned;
                    
                    // Warn if XP seems too high
                    if (this.totalXPEarned > 10000) {
                    }
                }
            }
            
            // Update total user XP display
            const xpElement = document.getElementById('xp-value');
            if (xpElement && this.userData) {
                const totalUserXP = this.userData.totalXP || this.userData.xp || 0;
                xpElement.textContent = totalUserXP;
                
                // Only log if value changed
                if (totalUserXP !== lastLoggedUserXP) {
                    lastLoggedUserXP = totalUserXP;
                }
            }
            
            // Update completion stats (without logging)
            this.updateCompletionStats();
        }, 1000); // Check every second
        
        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            clearInterval(checkInterval);
        });
    }
}

// Add highlight animation
const animationStyle = document.createElement('style');
animationStyle.textContent = `
    @keyframes highlight {
        0%, 100% { background-color: #f8fafc; }
        50% { background-color: #e9f0ff; }
    }
`;
document.head.appendChild(animationStyle);

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.lessonIntegration = new LessonIntegration(window.lessonConfig || {});
        // Expose global LessonXP object for worksheets to use
        window.LessonXP = {
            earnXP: (amount) => {
                if (window.addXP) {
                    window.addXP(amount);
                } else {
                }
            }
        };
        
        // Add debug functions
        window.debugXP = {
            checkAuth: () => {
                const li = window.lessonIntegration;
                const token = localStorage.getItem('authToken');
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                    } catch (e) {
                    }
                }
            },
            
            testXPSave: async (amount = 10) => {
                const li = window.lessonIntegration;
                if (!li.isAuthenticated) {
                    return;
                }
                await li.saveIncrementalXP(amount);
            },
            
            forceXPSave: async () => {
                const li = window.lessonIntegration;
                if (li.pendingXP > 0) {
                    clearTimeout(li.xpSaveTimeout);
                    await li.saveIncrementalXP(0); // Will save pending XP
                } else {
                }
            },
            
            getStatus: () => {
                const li = window.lessonIntegration;
            }
        };
        
    });
} else {
    window.lessonIntegration = new LessonIntegration(window.lessonConfig || {});
    // Expose global LessonXP object for worksheets to use
    window.LessonXP = {
        earnXP: (amount) => {
            if (window.addXP) {
                window.addXP(amount);
            } else {
            }
        }
    };
    
    // Add debug functions
    window.debugXP = {
        checkAuth: () => {
            const li = window.lessonIntegration;
            const token = localStorage.getItem('authToken');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                } catch (e) {
                }
            }
        },
        
        testXPSave: async (amount = 10) => {
            const li = window.lessonIntegration;
            if (!li.isAuthenticated) {
                return;
            }
            await li.saveIncrementalXP(amount);
        },
        
        forceXPSave: async () => {
            const li = window.lessonIntegration;
            if (li.pendingXP > 0) {
                clearTimeout(li.xpSaveTimeout);
                await li.saveIncrementalXP(0); // Will save pending XP
            } else {
            }
        },
        
        getStatus: () => {
            const li = window.lessonIntegration;
        }
    };
    
}

// Add utility to clear corrupted session data
window.clearCorruptedState = function() {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.includes('lesson')) {
            const value = sessionStorage.getItem(key);
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
    });
};

// Function to reset lesson XP (useful when restarting a lesson)
window.resetLessonXP = function() {
    if (window.lessonIntegration) {
        window.lessonIntegration.totalXPEarned = 0;
        window.lessonIntegration.xpTransactions = [];
        window.lessonIntegration.pendingXP = 0;
        window.lessonIntegration.lessonStartTime = Date.now();
        window.lessonIntegration.saveLessonState();
        
        // Update displays
        const pointsElement = document.getElementById('pointsEarned');
        if (pointsElement) {
            pointsElement.textContent = '0';
        }
        
    }
};

// Add diagnostic function
window.checkXPState = function() {
    
    if (window.lessonIntegration) {
    }
    
    // Check for local XP display
    const xpDisplay = document.getElementById('xp-value');
    if (xpDisplay) {
    }
    
    // Check for XP badge
    const xpBadge = document.querySelector('.xp-badge');
    if (xpBadge) {
    }
    
};

// Function to refresh user data
window.refreshUserData = async function() {
    if (window.lessonIntegration) {
        await window.lessonIntegration.checkAuth();
        window.lessonIntegration.updateNavigationAuth();
    }
};

// Function to check current user
window.checkCurrentUser = function() {
    const token = localStorage.getItem('authToken');
    
    if (window.lessonIntegration && window.lessonIntegration.userData) {
        const user = window.lessonIntegration.userData;
    } else {
    }
    
    // Decode JWT to see user info
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
        }
    }
};

// Function to reset bad XP state
window.resetXPDisplay = function() {
    
    // Reset local display
    const xpDisplay = document.getElementById('xp-value');
    if (xpDisplay) {
        xpDisplay.textContent = '0';
    }
    
    // Clear session storage for all lessons
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
        if (key.startsWith('lessonState_')) {
            sessionStorage.removeItem(key);
        }
    });
    
    // Reset lesson integration state
    if (window.lessonIntegration) {
        window.lessonIntegration.totalXPEarned = 0;
        window.lessonIntegration.pendingXP = 0;
    }
    
};
