// Check authentication
if (!API.utils.isAuthenticated()) {
    window.location.href = '/auth.html';
}

// Global variables
let userData = null;
let userStats = null;
let progressChart = null;

// Load user data on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserData();
    await loadUserStats();
    await loadLessons();
    setupProgressChart();
    setupAutoRefresh();
});

// Setup auto-refresh when page gains focus
function setupAutoRefresh() {
    let lastUpdateTime = Date.now();
    
    // Check if page was hidden and now visible again
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
            const timeSinceLastUpdate = Date.now() - lastUpdateTime;
            // If more than 10 seconds since last update, refresh
            if (timeSinceLastUpdate > 10000) {
                console.log('Page regained focus, refreshing recent activity...');
                await loadUserStats();
                lastUpdateTime = Date.now();
                
                // Show a subtle notification
                showRefreshNotification();
            }
        }
    });
    
    // Also refresh when window gains focus
    window.addEventListener('focus', async () => {
        const timeSinceLastUpdate = Date.now() - lastUpdateTime;
        if (timeSinceLastUpdate > 10000) {
            console.log('Window focused, refreshing recent activity...');
            await loadUserStats();
            lastUpdateTime = Date.now();
        }
    });
    
    // Periodic refresh every 60 seconds if page is active
    setInterval(async () => {
        if (!document.hidden) {
            console.log('Periodic refresh of recent activity...');
            await loadUserStats();
            lastUpdateTime = Date.now();
        }
    }, 60000); // 1 minute
}

// Show refresh notification
function showRefreshNotification() {
    const notification = document.createElement('div');
    notification.className = 'refresh-notification';
    notification.textContent = '✨ Activity refreshed';
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease, fadeOut 0.3s ease 2s forwards;
        z-index: 1000;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2500);
}

// Load user data
async function loadUserData() {
    try {
        const response = await API.auth.getProfile();
        userData = response.user;
        
        // Update UI
        document.getElementById('username').textContent = userData.username;
        document.getElementById('totalXP').textContent = API.utils.formatXP(userData.xp);
        document.getElementById('level').textContent = userData.level;
        document.getElementById('streak').textContent = userData.streakCount || 0;
        document.getElementById('achievementCount').textContent = userData.achievements.length;
        
        // Update XP progress bar
        const currentLevelXP = Math.pow(userData.level - 1, 2) * 100;
        const nextLevelXP = userData.xpForNextLevel;
        const progressPercent = ((userData.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
        document.getElementById('xpProgress').style.width = `${progressPercent}%`;
        
    } catch (error) {
        console.error('Failed to load user data:', error);
        showNotification('Failed to load user data', 'error');
    }
}

// Load user statistics
async function loadUserStats() {
    try {
        const response = await API.progress.getUserStats();
        userStats = response.data;
        
        // Load recent activity
        loadRecentActivity();
        
        // Load achievements
        loadAchievements();
        
    } catch (error) {
        console.error('Failed to load user stats:', error);
        // Set default values so the page still works
        userStats = {
            recentProgress: [],
            availableAchievements: []
        };
        
        // Still try to load what we can
        loadRecentActivity();
        loadAchievements();
    }
}

// Load lessons - Static display of 3 available templates
async function loadLessons() {
    const container = document.getElementById('lessonsContainer');
    
    // Static lesson data for our 3 templates
    const availableLessons = [
        {
            id: 'donut-algebra',
            title: '🍩 Donut Algebra',
            topic: 'Algebra',
            difficulty: 'beginner',
            description: 'Learn to combine like terms using delicious donut metaphors!',
            xpReward: 15,
            url: '/lessons/donut-algebra',
            completed: false,
            accessible: true
        },
        {
            id: 'algebra-balance',
            title: '⚖️ Algebra Balance',
            topic: 'Algebra',
            difficulty: 'intermediate',
            description: 'Master solving equations with an interactive balance scale.',
            xpReward: 20,
            url: '/lessons/algebra-balance',
            completed: false,
            accessible: true
        },
        {
            id: 'enhanced-algebra-balance',
            title: '⚖️ Enhanced Algebra Balance',
            topic: 'Algebra',
            difficulty: 'advanced',
            description: 'Advanced equation solving with complex algebraic expressions.',
            xpReward: 25,
            url: '/lessons/enhanced-algebra-balance',
            completed: false,
            accessible: true
        }
    ];
    
    // Check completion status from localStorage if user is logged in
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            const response = await API.progress.getUserStats();
            if (response.data && response.data.completedLessons) {
                availableLessons.forEach(lesson => {
                    lesson.completed = response.data.completedLessons.includes(lesson.id);
                });
            }
        } catch (error) {
            console.log('Could not fetch completion status');
        }
    }
    
    // Group lessons by topic
    const lessonsByTopic = availableLessons.reduce((acc, lesson) => {
        if (!acc[lesson.topic]) {
            acc[lesson.topic] = [];
        }
        acc[lesson.topic].push(lesson);
        return acc;
    }, {});
    
    // Render lessons
    container.innerHTML = Object.entries(lessonsByTopic).map(([topic, topicLessons]) => `
        <div style="grid-column: 1 / -1;">
            <h3 style="color: #666; margin-bottom: 15px; text-transform: capitalize;">${topic} Lessons</h3>
            <div class="lessons-grid">
                ${topicLessons.map(lesson => createStaticLessonCard(lesson)).join('')}
            </div>
        </div>
    `).join('');
}

// Create static lesson card HTML
function createStaticLessonCard(lesson) {
    const isLocked = !lesson.accessible;
    const isCompleted = lesson.completed;
    
    return `
        <div class="lesson-card ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}" 
             onclick="${isLocked ? '' : `openStaticLesson('${lesson.url}')`}">
            <div class="lesson-header">
                <div>
                    <h3 class="lesson-title">${lesson.title}</h3>
                    <p class="lesson-topic">${lesson.topic}</p>
                </div>
                <span class="lesson-difficulty difficulty-${lesson.difficulty}">
                    ${lesson.difficulty}
                </span>
            </div>
            ${lesson.description ? `<p style="color: #666; font-size: 0.9rem; margin-bottom: 15px;">${lesson.description}</p>` : ''}
            <div class="lesson-footer">
                <span class="xp-badge">+${lesson.xpReward} XP</span>
                ${isCompleted ? '<span class="completion-badge">✓ Completed</span>' : ''}
                ${isLocked ? '<span style="color: #999; font-size: 0.9rem;">🔒 Locked</span>' : ''}
            </div>
        </div>
    `;
}

// Open static lesson
function openStaticLesson(url) {
    window.location.href = url;
}

// Load recent activity
function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    
    if (!userStats.recentProgress || userStats.recentProgress.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <p class="empty-text">No recent activity yet. Start learning to see your progress!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userStats.recentProgress.map(activity => {
        // Format the topic name for better display
        const lessonInfo = getLessonInfo(activity.topic);
        const scoreColor = activity.score >= 90 ? '#4caf50' : activity.score >= 70 ? '#ff9800' : '#f44336';
        
        return `
            <div class="activity-item ${activity.activityType === 'lesson' ? 'lesson-complete' : ''}">
                <div class="activity-icon">${getActivityIcon(activity.activityType)}</div>
                <div class="activity-details">
                    <div class="activity-title">${lessonInfo.title}</div>
                    <div class="activity-meta">
                        <span class="activity-type">${formatActivityType(activity.activityType)}</span> • 
                        <span class="activity-score" style="color: ${scoreColor}">Score: ${Math.round(activity.score)}%</span> • 
                        <span class="activity-xp">+${activity.xpEarned} XP</span>
                    </div>
                    <div class="activity-meta">
                        <span class="activity-time">${getRelativeTime(activity.completedAt)}</span>
                        ${activity.metadata?.incrementalSave ? '<span class="incremental-badge">Progress</span>' : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Get lesson info from topic ID
function getLessonInfo(topic) {
    const lessonMap = {
        'donut-algebra': { title: '🍩 Donut Algebra', icon: '🍩' },
        'donut-algebra-progress': { title: '🍩 Donut Algebra (Progress)', icon: '🍩' },
        'donut-algebra-recovered': { title: '🍩 Donut Algebra (Recovered)', icon: '🍩' },
        'algebra-balance': { title: '⚖️ Algebra Balance', icon: '⚖️' },
        'algebra-balance-progress': { title: '⚖️ Algebra Balance (Progress)', icon: '⚖️' },
        'algebra-balance-recovered': { title: '⚖️ Algebra Balance (Recovered)', icon: '⚖️' },
        'enhanced-algebra-balance': { title: '⚖️ Enhanced Balance', icon: '⚖️' },
        'enhanced-algebra-balance-progress': { title: '⚖️ Enhanced Balance (Progress)', icon: '⚖️' },
        'enhanced-algebra-balance-recovered': { title: '⚖️ Enhanced Balance (Recovered)', icon: '⚖️' }
    };
    
    return lessonMap[topic] || { title: topic, icon: '📚' };
}

// Format activity type for display
function formatActivityType(type) {
    const typeMap = {
        'practice': 'Practice',
        'lesson': 'Lesson Complete',
        'revision': 'Revision',
        'example': 'Examples',
        'bonus': 'Bonus'
    };
    return typeMap[type] || type;
}

// Get relative time display
function getRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return API.utils.formatDate(dateStr);
}

// Load achievements
function loadAchievements() {
    const container = document.getElementById('achievementsContainer');
    
    if (!userData.achievements || userData.achievements.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏆</div>
                <p class="empty-text">No achievements yet. Keep learning to unlock achievements!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="lessons-grid">
            ${userData.achievements.map(achievement => `
                <div class="lesson-card">
                    <div class="lesson-header">
                        <div>
                            <h3 class="lesson-title">${achievement.name}</h3>
                            <p class="lesson-topic">${achievement.description}</p>
                        </div>
                        <span class="xp-badge">+${achievement.xpAwarded} XP</span>
                    </div>
                    <div class="lesson-footer">
                        <span style="color: #666; font-size: 0.9rem;">
                            Earned ${API.utils.formatDate(achievement.earnedAt)}
                        </span>
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${userStats.availableAchievements && userStats.availableAchievements.length > 0 ? `
            <h3 style="margin: 30px 0 20px; color: #333;">Available Achievements</h3>
            <div class="lessons-grid">
                ${userStats.availableAchievements.map(achievement => `
                    <div class="lesson-card" style="opacity: 0.7;">
                        <div class="lesson-header">
                            <div>
                                <h3 class="lesson-title">${achievement.name}</h3>
                                <p class="lesson-topic">${achievement.description}</p>
                            </div>
                            <span class="xp-badge">+${achievement.xpReward} XP</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;
}

// Setup progress chart
function setupProgressChart() {
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    // Get progress data
    const progressData = userStats?.recentProgress || [];
    
    const labels = progressData.slice(0, 10).reverse().map(p => 
        new Date(p.completedAt).toLocaleDateString()
    );
    
    const scores = progressData.slice(0, 10).reverse().map(p => p.score);
    const xpData = progressData.slice(0, 10).reverse().map(p => p.xpEarned);
    
    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Score (%)',
                data: scores,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                tension: 0.1,
                yAxisID: 'y-score'
            }, {
                label: 'XP Earned',
                data: xpData,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                tension: 0.1,
                yAxisID: 'y-xp'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Recent Progress'
                }
            },
            scales: {
                'y-score': {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Score (%)'
                    },
                    min: 0,
                    max: 100
                },
                'y-xp': {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'XP Earned'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// Switch tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    // Load content if needed
    if (tabName === 'progress' && progressChart) {
        progressChart.update();
    }
}

// Open lesson
function openLesson(lessonId) {
    // For now, redirect to a lesson viewer page
    window.location.href = `/lessons/viewer.html?id=${lessonId}`;
}

// Get activity icon
function getActivityIcon(type) {
    const icons = {
        'practice': '✏️',
        'lesson': '📖',
        'revision': '🔄',
        'example': '💡',
        'bonus': '🎁'
    };
    return icons[type] || '📚';
}

// Play Tower Defense game
async function playTowerDefense() {
    try {
        // Check if user has enough XP
        if (!userData || userData.xp < 100) {
            showNotification('You need at least 100 XP to play Tower Defense!', 'warning');
            return;
        }
        
        // Navigate to the game
        window.location.href = '/games/tower-defense';
    } catch (error) {
        console.error('Error accessing game:', error);
        showNotification('Failed to access the game. Please try again.', 'error');
    }
}

// Logout
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = '/auth.html';
}

// Show notification
function showNotification(message, type = 'info') {
    // For now, just use alert
    alert(message);
}