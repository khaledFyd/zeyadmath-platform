// Check authentication
if (!API.utils.isAuthenticated()) {
    window.location.href = '/auth.html';
}

// Global variables
let lessonData = null;
let startTime = Date.now();
let timeInterval = null;

// Get lesson ID from URL
const urlParams = new URLSearchParams(window.location.search);
const lessonId = urlParams.get('id');

if (!lessonId) {
    showError('No lesson ID provided');
} else {
    loadLesson();
}

// Load lesson data
async function loadLesson() {
    try {
        const response = await API.lessons.getLessonById(lessonId);
        lessonData = response.data;
        
        // Update UI
        document.getElementById('lessonTitle').textContent = lessonData.title;
        document.getElementById('lessonMeta').textContent = 
            `${lessonData.topic} • ${lessonData.difficulty} • ${lessonData.xpReward} XP`;
        
        // Check if user has access
        if (!lessonData.userProgress && lessonData.prerequisites && lessonData.prerequisites.length > 0) {
            // Check if prerequisites are met
            const hasAccess = await checkPrerequisites();
            if (!hasAccess) {
                showPrerequisitesWarning();
                hideLoading();
                return;
            }
        }
        
        // Load lesson content
        loadLessonContent();
        
        // Start time tracking
        startTimeTracking();
        
        // Show lesson container
        hideLoading();
        document.getElementById('lessonContainer').style.display = 'block';
        
        // If already completed, show XP reward
        if (lessonData.userProgress && lessonData.userProgress.score >= 70) {
            document.getElementById('completeButton').textContent = '✓ Completed';
            document.getElementById('completeButton').disabled = true;
            document.getElementById('xpReward').textContent = 
                `You earned ${lessonData.userProgress.xpEarned} XP`;
            document.getElementById('xpReward').style.display = 'inline-block';
        }
        
    } catch (error) {
        console.error('Failed to load lesson:', error);
        showError('Failed to load lesson. Please try again later.');
    }
}

// Check prerequisites
async function checkPrerequisites() {
    // For now, return true - in a real implementation, check user's completed lessons
    return true;
}

// Show prerequisites warning
function showPrerequisitesWarning() {
    const warning = document.getElementById('prerequisitesWarning');
    const list = document.getElementById('prerequisitesList');
    
    list.innerHTML = lessonData.prerequisites.map(prereq => 
        `<li>${prereq.title} (${prereq.topic})</li>`
    ).join('');
    
    warning.style.display = 'block';
    document.getElementById('completeButton').disabled = true;
}

// Load lesson content
function loadLessonContent() {
    const contentDiv = document.getElementById('lessonContent');
    
    // If lesson has a template path, load it through the API with XP tracking
    if (lessonData.templatePath) {
        // For now, use the direct template path since iframe can't send auth headers
        // The XP tracking will be handled via postMessage
        contentDiv.innerHTML = `
            <iframe 
                src="/templates/${lessonData.templatePath}" 
                class="lesson-frame"
                onload="onFrameLoad()"
                id="lessonFrame"
            ></iframe>
        `;
    } else if (lessonData.content) {
        // Display HTML content directly
        contentDiv.innerHTML = lessonData.content;
    } else {
        // Placeholder content
        contentDiv.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <h2 style="color: #666; margin-bottom: 20px;">${lessonData.title}</h2>
                <p style="color: #999; font-size: 1.2rem;">
                    This lesson content is not yet available.
                </p>
                <p style="color: #999; margin-top: 20px;">
                    Topic: ${lessonData.topic}<br>
                    Difficulty: ${lessonData.difficulty}<br>
                    Estimated time: ${lessonData.estimatedTime || 15} minutes
                </p>
                ${lessonData.description ? `
                    <div style="margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 10px;">
                        <h3 style="color: #666; margin-bottom: 10px;">Description:</h3>
                        <p style="color: #666;">${lessonData.description}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

// Handle iframe load
function onFrameLoad() {
    // Inject XP tracking into the iframe
    try {
        const iframe = document.getElementById('lessonFrame');
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        
        // Inject comprehensive tracking script
        const script = iframeDoc.createElement('script');
        script.textContent = `
        (function() {
            console.log('XP Tracking injected for lesson: ${lessonData.title}');
            
            const lessonId = '${lessonId}';
            const xpReward = ${lessonData.xpReward};
            let startTime = Date.now();
            let activityCompleted = false;
            let interactions = 0;
            
            // Listen for completion events
            window.addEventListener('lesson-complete', function(event) {
                if (!activityCompleted) {
                    const score = event.detail.score || 100;
                    completeLesson(score);
                }
            });
            
            // Track interactions
            document.addEventListener('click', function(e) {
                interactions++;
                
                const target = e.target;
                const text = target.textContent.toLowerCase();
                if ((target.tagName === 'BUTTON' || target.tagName === 'INPUT') && 
                    (text.includes('submit') || text.includes('complete') || text.includes('finish') || text.includes('done') || text.includes('check'))) {
                    setTimeout(() => checkForCompletion(), 1000);
                }
            });
            
            // Check for completion indicators
            function checkForCompletion() {
                const bodyText = document.body.innerText;
                const scorePatterns = [
                    /score[\\s:]+([0-9]+)/i,
                    /([0-9]+)\\s*\\/\\s*([0-9]+)\\s*(correct|points)/i,
                    /you got[\\s:]+([0-9]+)/i,
                    /([0-9]+)%/
                ];
                
                for (const pattern of scorePatterns) {
                    const match = bodyText.match(pattern);
                    if (match) {
                        const score = parseInt(match[1]);
                        if (score > 0 && !activityCompleted) {
                            console.log('Score detected:', score);
                            completeLesson(score);
                            break;
                        }
                    }
                }
                
                // If significant interaction but no score, complete with 100%
                if (!activityCompleted && interactions > 10) {
                    completeLesson(100);
                }
            }
            
            // Complete lesson and notify parent
            function completeLesson(score) {
                if (activityCompleted) return;
                activityCompleted = true;
                
                const timeSpent = Math.floor((Date.now() - startTime) / 1000);
                console.log('Lesson completed! Score:', score, 'Time:', timeSpent);
                
                // Notify parent window
                parent.postMessage({
                    type: 'lesson-complete',
                    lessonId: lessonId,
                    score: score,
                    timeSpent: timeSpent,
                    xpReward: xpReward
                }, '*');
                
                // Show completion message in iframe
                showCompletionMessage(score, xpReward);
            }
            
            // Show completion message
            function showCompletionMessage(score, xp) {
                const message = document.createElement('div');
                message.style.cssText = 'position:fixed;top:20px;right:20px;background:linear-gradient(135deg,#4caf50,#45a049);color:white;padding:20px 30px;border-radius:10px;font-family:Comic Sans MS,Arial,sans-serif;font-size:18px;font-weight:bold;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:10000;';
                message.innerHTML = '<div style="margin-bottom:10px;">🎉 Lesson Complete!</div><div style="font-size:16px;opacity:0.95;">Score: ' + score + '%</div><div style="font-size:16px;opacity:0.95;">+' + xp + ' XP earned!</div>';
                document.body.appendChild(message);
                
                setTimeout(() => message.style.opacity = '0', 4000);
                setTimeout(() => message.remove(), 4500);
            }
            
            // Auto-complete after 5 minutes
            setTimeout(() => {
                if (!activityCompleted && interactions > 5) {
                    console.log('Auto-completing after 5 minutes');
                    completeLesson(100);
                }
            }, 5 * 60 * 1000);
            
            // Expose for debugging
            window.zeyMathTracking = {
                completeLesson: completeLesson,
                checkForCompletion: checkForCompletion,
                interactions: () => interactions
            };
        })();
        `;
        iframeDoc.head.appendChild(script);
        
        console.log('XP tracking injected successfully');
    } catch (error) {
        console.log('Could not inject tracking script:', error);
    }
}

// Listen for messages from iframe
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'lesson-complete') {
        console.log('Received completion message from iframe:', event.data);
        // Complete the lesson with the score from the iframe
        completeLesson(event.data.score);
    }
});

// Start time tracking
function startTimeTracking() {
    updateTimeDisplay();
    timeInterval = setInterval(updateTimeDisplay, 1000);
}

// Update time display
function updateTimeDisplay() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    document.getElementById('timeSpent').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Complete lesson
async function completeLesson(score = 100) {
    if (lessonData.userProgress && lessonData.userProgress.score >= 70) {
        return; // Already completed
    }
    
    const button = document.getElementById('completeButton');
    button.disabled = true;
    button.innerHTML = '<span class="spinner spinner-sm"></span> Completing...';
    
    try {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        
        const response = await API.lessons.completeLesson(lessonId, {
            timeSpent,
            score
        });
        
        // Show success
        button.innerHTML = '✓ Completed!';
        button.style.background = 'var(--success-green)';
        
        // Show XP earned
        const xpDiv = document.getElementById('xpReward');
        xpDiv.textContent = `+${response.data.xpEarned} XP earned!`;
        xpDiv.style.display = 'inline-block';
        
        // Animate XP
        xpDiv.style.animation = 'pulse 0.5s ease';
        
        // Update user data in localStorage
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        userData.xp = response.data.totalXP;
        userData.level = response.data.level;
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // Redirect after delay
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Failed to complete lesson:', error);
        button.disabled = false;
        button.textContent = 'Complete Lesson';
        alert('Failed to complete lesson. Please try again.');
    }
}

// Hide loading
function hideLoading() {
    document.getElementById('loadingContainer').style.display = 'none';
}

// Show error
function showError(message) {
    document.getElementById('loadingContainer').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (timeInterval) {
        clearInterval(timeInterval);
    }
});