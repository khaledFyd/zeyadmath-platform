const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Map of lesson IDs to template files
const LESSON_TEMPLATES = {
    'donut-algebra': {
        file: 'donut_algebra_tutorial_v2.html',
        title: '🍩 Donut Algebra - Combining Like Terms',
        baseXP: 15,
        difficulty: 'beginner'
    },
    'algebra-balance': {
        file: 'algebra-balance-final option 4.html',
        title: '⚖️ Algebra Balance - Solving Equations',
        baseXP: 20,
        difficulty: 'intermediate'
    },
    'enhanced-algebra-balance': {
        file: 'enhanced_algebra_balance_v2.html',
        title: '⚖️ Enhanced Algebra Balance - Advanced Equations',
        baseXP: 25,
        difficulty: 'advanced'
    }
};

// Serve lesson template with integration
router.get('/:lessonId', async (req, res) => {
    try {
        const { lessonId } = req.params;
        const template = LESSON_TEMPLATES[lessonId];
        
        if (!template) {
            return res.status(404).send('Lesson not found');
        }
        
        // Read the template file
        const templatePath = path.join(__dirname, '../../Math_teaching_templates', template.file);
        let html = await fs.readFile(templatePath, 'utf8');
        
        // Check if integration script is already added
        if (!html.includes('lesson-integration-v2.js')) {
            // Find the closing body tag
            const bodyCloseIndex = html.lastIndexOf('</body>');
            
            if (bodyCloseIndex !== -1) {
                // Inject the lesson configuration and integration script
                const integrationScript = `
    <!-- Lesson Integration -->
    <script>
        // Configure lesson details
        window.lessonConfig = {
            lessonId: '${lessonId}',
            lessonTitle: '${template.title}',
            baseXP: ${template.baseXP},
            difficulty: '${template.difficulty}'
        };
    </script>
    <script src="/js/lesson-integration-v2.js"></script>
`;
                
                // Insert before closing body tag
                html = html.slice(0, bodyCloseIndex) + integrationScript + html.slice(bodyCloseIndex);
            }
        }
        
        // Send the modified HTML
        res.set('Content-Type', 'text/html');
        res.send(html);
        
    } catch (error) {
        console.error('Error serving lesson template:', error);
        res.status(500).send('Error loading lesson');
    }
});

module.exports = router;