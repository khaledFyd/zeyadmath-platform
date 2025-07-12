// Lesson Integration Module - Adds navigation and completion functionality to teaching templates

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
        
        this.init();
    }
    
    async init() {
        // Check authentication
        await this.checkAuth();
        
        // Add navigation bar
        this.addNavigationBar();
        
        // Add completion section
        this.addCompletionSection();
        
        // Override XP functions to track total XP
        this.interceptXPFunctions();
        
        // Add keyboard shortcuts
        this.addKeyboardShortcuts();
    }
    
    async checkAuth() {
        const token = localStorage.getItem('token');
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
                this.userData = await response.json();
                this.isAuthenticated = true;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.isAuthenticated = false;
        }
    }
    
    addNavigationBar() {
        const navBar = document.createElement('div');
        navBar.className = 'lesson-nav-bar';
        navBar.innerHTML = `
            <div class="nav-container">
                <button class="nav-btn back-btn" onclick="lessonIntegration.goToDashboard()">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 11H14a1 1 0 100-2H8.414l1.293-1.293z"/>
                    </svg>
                    Back to Dashboard
                </button>
                <div class="nav-title">${this.config.lessonTitle}</div>
                <div class="nav-user">
                    ${this.isAuthenticated ? `
                        <span class="user-xp">🏆 ${this.userData.totalXP || 0} XP</span>
                        <span class="user-level">Level ${this.userData.level || 1}</span>
                    ` : `
                        <a href="/auth.html" class="login-link">Login to save progress</a>
                    `}
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .lesson-nav-bar {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                z-index: 1000;
                padding: 15px 0;
            }
            
            .nav-container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 20px;
            }
            
            .nav-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 8px;
                font-family: inherit;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .nav-btn:hover {
                background: #5a67d8;
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
            }
            
            .nav-title {
                font-size: 18px;
                font-weight: bold;
                color: #2d3748;
            }
            
            .nav-user {
                display: flex;
                align-items: center;
                gap: 15px;
                font-size: 14px;
            }
            
            .user-xp {
                background: linear-gradient(135deg, #ffd89b 0%, #19547b 100%);
                color: white;
                padding: 5px 12px;
                border-radius: 20px;
                font-weight: 600;
            }
            
            .user-level {
                background: #4caf50;
                color: white;
                padding: 5px 12px;
                border-radius: 20px;
                font-weight: 600;
            }
            
            .login-link {
                color: #667eea;
                text-decoration: none;
                font-weight: 600;
                padding: 8px 16px;
                border: 2px solid #667eea;
                border-radius: 8px;
                transition: all 0.3s ease;
            }
            
            .login-link:hover {
                background: #667eea;
                color: white;
            }
            
            /* Adjust body padding to account for fixed nav */
            body {
                padding-top: 70px !important;
            }
            
            /* Completion section styles */
            .lesson-completion-section {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                padding: 20px;
                width: 320px;
                transform: translateX(400px);
                transition: transform 0.5s ease;
                z-index: 1001;
            }
            
            .lesson-completion-section.show {
                transform: translateX(0);
            }
            
            .completion-header {
                font-size: 20px;
                font-weight: bold;
                color: #2d3748;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .completion-message {
                color: #718096;
                margin-bottom: 15px;
                line-height: 1.5;
            }
            
            .completion-stats {
                background: #f7fafc;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 15px;
            }
            
            .stat-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 14px;
            }
            
            .stat-row:last-child {
                margin-bottom: 0;
            }
            
            .stat-label {
                color: #718096;
            }
            
            .stat-value {
                font-weight: 600;
                color: #2d3748;
            }
            
            .completion-actions {
                display: flex;
                gap: 10px;
            }
            
            .complete-btn, .not-ready-btn {
                flex: 1;
                padding: 12px;
                border: none;
                border-radius: 8px;
                font-family: inherit;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .complete-btn {
                background: #4caf50;
                color: white;
            }
            
            .complete-btn:hover:not(:disabled) {
                background: #45a049;
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(76, 175, 80, 0.3);
            }
            
            .complete-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .not-ready-btn {
                background: #e2e8f0;
                color: #4a5568;
            }
            
            .not-ready-btn:hover {
                background: #cbd5e0;
            }
            
            .completion-success {
                text-align: center;
                padding: 20px;
            }
            
            .success-icon {
                font-size: 48px;
                margin-bottom: 10px;
            }
            
            .xp-earned {
                font-size: 24px;
                font-weight: bold;
                color: #4caf50;
                margin-bottom: 10px;
            }
            
            .show-completion-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #667eea;
                color: white;
                border: none;
                padding: 15px 25px;
                border-radius: 30px;
                font-family: inherit;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 5px 20px rgba(102, 126, 234, 0.3);
                transition: all 0.3s ease;
                z-index: 1000;
            }
            
            .show-completion-btn:hover {
                background: #5a67d8;
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
            }
            
            .show-completion-btn.pulse {
                animation: pulse-btn 2s infinite;
            }
            
            @keyframes pulse-btn {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            @media (max-width: 768px) {
                .nav-container {
                    flex-wrap: wrap;
                }
                
                .nav-title {
                    order: -1;
                    width: 100%;
                    text-align: center;
                    margin-bottom: 10px;
                }
                
                .lesson-completion-section {
                    width: calc(100vw - 40px);
                    right: 20px;
                    left: 20px;
                    bottom: 80px;
                }
            }
        `;
        document.head.appendChild(style);
        document.body.insertBefore(navBar, document.body.firstChild);
    }
    
    addCompletionSection() {
        // Add show completion button
        const showBtn = document.createElement('button');
        showBtn.className = 'show-completion-btn';
        showBtn.innerHTML = '✓ Complete Lesson';
        showBtn.onclick = () => this.showCompletionSection();
        document.body.appendChild(showBtn);
        
        // Add completion section
        const section = document.createElement('div');
        section.className = 'lesson-completion-section';
        section.id = 'lessonCompletionSection';
        section.innerHTML = `
            <div class="completion-content">
                <div class="completion-header">
                    <span>📚</span>
                    <span>Ready to complete this lesson?</span>
                </div>
                <p class="completion-message">
                    Make sure you've understood all the concepts before marking as complete.
                </p>
                <div class="completion-stats">
                    <div class="stat-row">
                        <span class="stat-label">Time Spent:</span>
                        <span class="stat-value" id="timeSpent">0 min</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Points Earned:</span>
                        <span class="stat-value" id="pointsEarned">0</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Base XP Reward:</span>
                        <span class="stat-value">${this.config.baseXP} XP</span>
                    </div>
                </div>
                <div class="completion-actions">
                    <button class="not-ready-btn" onclick="lessonIntegration.hideCompletionSection()">
                        Not Ready
                    </button>
                    <button class="complete-btn" onclick="lessonIntegration.completeLesson()" 
                            ${!this.isAuthenticated ? 'disabled' : ''}>
                        ${this.isAuthenticated ? '✓ Complete' : '🔒 Login Required'}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(section);
        
        // Update stats periodically
        setInterval(() => this.updateCompletionStats(), 1000);
        
        // Check if problems are completed
        this.checkForAutoCompletion();
    }
    
    updateCompletionStats() {
        const timeElapsed = Math.floor((Date.now() - this.lessonStartTime) / 1000 / 60);
        document.getElementById('timeSpent').textContent = `${timeElapsed} min`;
        
        // Get current XP from the page
        const xpElement = document.getElementById('xp-value');
        if (xpElement) {
            document.getElementById('pointsEarned').textContent = xpElement.textContent;
        }
    }
    
    interceptXPFunctions() {
        // Store original addXP function if it exists
        if (typeof window.addXP === 'function') {
            const originalAddXP = window.addXP;
            window.addXP = (amount) => {
                this.totalXPEarned += amount;
                originalAddXP(amount);
                
                // Pulse the completion button when XP is earned
                const btn = document.querySelector('.show-completion-btn');
                if (btn) {
                    btn.classList.add('pulse');
                    setTimeout(() => btn.classList.remove('pulse'), 2000);
                }
            };
        }
    }
    
    checkForAutoCompletion() {
        // Monitor for worksheet completion
        const checkCompletion = setInterval(() => {
            if (typeof problemsCompleted !== 'undefined' && 
                typeof totalProblems !== 'undefined' && 
                problemsCompleted === totalProblems) {
                clearInterval(checkCompletion);
                setTimeout(() => this.showCompletionSection(), 1000);
            }
        }, 1000);
    }
    
    showCompletionSection() {
        const section = document.getElementById('lessonCompletionSection');
        section.classList.add('show');
        this.updateCompletionStats();
    }
    
    hideCompletionSection() {
        const section = document.getElementById('lessonCompletionSection');
        section.classList.remove('show');
    }
    
    async completeLesson() {
        if (!this.isAuthenticated) {
            alert('Please login to save your progress!');
            return;
        }
        
        const section = document.getElementById('lessonCompletionSection');
        const content = section.querySelector('.completion-content');
        
        // Show loading state
        content.innerHTML = `
            <div class="completion-success">
                <div style="font-size: 24px;">⏳ Saving progress...</div>
            </div>
        `;
        
        try {
            // Calculate score based on XP earned vs possible XP
            const xpElement = document.getElementById('xp-value');
            const currentXP = xpElement ? parseInt(xpElement.textContent) : 0;
            const score = Math.min(100, Math.round((currentXP / 500) * 100)); // Assuming 500 is max possible XP
            
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
            
            // Show success state
            content.innerHTML = `
                <div class="completion-success">
                    <div class="success-icon">🎉</div>
                    <div class="xp-earned">+${result.xpEarned} XP</div>
                    <p style="color: #4a5568; margin-bottom: 15px;">Great job completing this lesson!</p>
                    <button class="complete-btn" onclick="lessonIntegration.goToDashboard()">
                        Back to Dashboard
                    </button>
                </div>
            `;
            
            // Update user XP display
            if (this.userData) {
                this.userData.totalXP += result.xpEarned;
                document.querySelector('.user-xp').textContent = `🏆 ${this.userData.totalXP} XP`;
            }
            
        } catch (error) {
            console.error('Error completing lesson:', error);
            content.innerHTML = `
                <div class="completion-success">
                    <div class="success-icon">❌</div>
                    <p style="color: #e53e3e; margin-bottom: 15px;">Failed to save progress. Please try again.</p>
                    <button class="complete-btn" onclick="lessonIntegration.hideCompletionSection()">
                        Close
                    </button>
                </div>
            `;
        }
    }
    
    goToDashboard() {
        window.location.href = '/dashboard.html';
    }
    
    addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to show completion
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                this.showCompletionSection();
            }
            // Escape to hide completion
            if (e.key === 'Escape') {
                this.hideCompletionSection();
            }
        });
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.lessonIntegration = new LessonIntegration(window.lessonConfig || {});
    });
} else {
    window.lessonIntegration = new LessonIntegration(window.lessonConfig || {});
}