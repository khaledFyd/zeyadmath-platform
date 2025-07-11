// Template wrapper to inject XP tracking into existing HTML templates
const fs = require('fs').promises;
const path = require('path');

/**
 * Injects XP tracking script into an HTML template
 * This preserves the original content and only adds tracking functionality
 */
async function injectXPTracking(templatePath, lessonId, xpReward) {
  try {
    // Read the template
    const fullPath = path.join(process.cwd(), 'Math_teaching_templates', templatePath);
    let htmlContent = await fs.readFile(fullPath, 'utf8');
    
    // Create the XP tracking script
    const trackingScript = `
    <!-- XP Tracking Script - Injected by Zeyadmath Platform -->
    <script>
    (function() {
      // Store original console.log for debugging
      const originalLog = console.log;
      
      // Lesson metadata
      const lessonId = '${lessonId}';
      const xpReward = ${xpReward};
      let startTime = Date.now();
      let activityCompleted = false;
      
      // Track user interactions
      let interactions = 0;
      let correctAnswers = 0;
      let totalQuestions = 0;
      
      // Listen for completion events from the template
      // Templates can trigger this by calling: window.dispatchEvent(new CustomEvent('lesson-complete', { detail: { score: 85 } }))
      window.addEventListener('lesson-complete', function(event) {
        if (!activityCompleted) {
          const score = event.detail.score || 100;
          completeLesson(score);
        }
      });
      
      // Also listen for common completion indicators
      document.addEventListener('click', function(e) {
        interactions++;
        
        // Check if user clicked a submit or complete button
        const target = e.target;
        const text = target.textContent.toLowerCase();
        if ((target.tagName === 'BUTTON' || target.tagName === 'INPUT') && 
            (text.includes('submit') || text.includes('complete') || text.includes('finish') || text.includes('done'))) {
          // Check if there's a score visible
          setTimeout(() => {
            checkForCompletion();
          }, 1000);
        }
      });
      
      // Monitor for score displays
      function checkForCompletion() {
        // Look for common score patterns in the page
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
              originalLog('Auto-detected score:', score);
              completeLesson(score);
              break;
            }
          }
        }
        
        // If no score found but significant interaction, complete with 100%
        if (!activityCompleted && interactions > 10) {
          completeLesson(100);
        }
      }
      
      // Complete the lesson and award XP
      function completeLesson(score) {
        if (activityCompleted) return;
        activityCompleted = true;
        
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        originalLog('Lesson completed! Score:', score, 'Time:', timeSpent, 'seconds');
        
        // Notify parent window if in iframe
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'lesson-complete',
            lessonId: lessonId,
            score: score,
            timeSpent: timeSpent,
            xpReward: xpReward
          }, '*');
        }
        
        // Show completion message
        showCompletionMessage(score, xpReward);
      }
      
      // Show a non-intrusive completion message
      function showCompletionMessage(score, xp) {
        const message = document.createElement('div');
        message.style.cssText = \`
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #4caf50, #45a049);
          color: white;
          padding: 20px 30px;
          border-radius: 10px;
          font-family: 'Comic Sans MS', Arial, sans-serif;
          font-size: 18px;
          font-weight: bold;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          z-index: 10000;
          animation: slideIn 0.5s ease-out;
        \`;
        
        message.innerHTML = \`
          <div style="margin-bottom: 10px;">🎉 Lesson Complete!</div>
          <div style="font-size: 16px; opacity: 0.95;">Score: \${score}%</div>
          <div style="font-size: 16px; opacity: 0.95;">+\${xp} XP earned!</div>
        \`;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = \`
          @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        \`;
        document.head.appendChild(style);
        
        document.body.appendChild(message);
        
        // Remove after 5 seconds
        setTimeout(() => {
          message.style.animation = 'slideOut 0.5s ease-in';
          message.style.animationFillMode = 'forwards';
          setTimeout(() => message.remove(), 500);
        }, 5000);
      }
      
      // Fallback: Auto-complete after 5 minutes of activity
      setTimeout(() => {
        if (!activityCompleted && interactions > 5) {
          originalLog('Auto-completing lesson after 5 minutes');
          completeLesson(100);
        }
      }, 5 * 60 * 1000);
      
      // For debugging
      window.zeyMathTracking = {
        completeLesson: completeLesson,
        interactions: () => interactions,
        isCompleted: () => activityCompleted
      };
      
      originalLog('Zeyadmath XP tracking initialized for lesson', lessonId);
    })();
    </script>
    <!-- End XP Tracking Script -->
    `;
    
    // Inject before closing body tag
    if (htmlContent.includes('</body>')) {
      htmlContent = htmlContent.replace('</body>', trackingScript + '</body>');
    } else {
      // If no body tag, append at the end
      htmlContent += trackingScript;
    }
    
    return htmlContent;
  } catch (error) {
    console.error('Error injecting XP tracking:', error);
    throw error;
  }
}

module.exports = {
  injectXPTracking
};