const express = require('express');
const router = express.Router();
const { Lesson } = require('../models');
const { injectXPTracking } = require('../utils/templateWrapper');
const { auth } = require('../middleware/auth');

// Serve wrapped template with XP tracking
router.get('/:lessonId', auth, async (req, res) => {
  try {
    const { lessonId } = req.params;
    
    // Find the lesson
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).send('Lesson not found');
    }
    
    // Check if lesson has a template
    if (!lesson.templatePath) {
      return res.status(400).send('This lesson does not have an interactive template');
    }
    
    // Check if user has access
    const canAccess = await lesson.canUserAccess(req.userId);
    if (!canAccess) {
      return res.status(403).send('Complete prerequisites first');
    }
    
    // Inject XP tracking and serve the template
    const wrappedHtml = await injectXPTracking(
      lesson.templatePath,
      lesson._id.toString(),
      lesson.xpReward
    );
    
    res.set('Content-Type', 'text/html');
    res.send(wrappedHtml);
    
  } catch (error) {
    console.error('Error serving template:', error);
    res.status(500).send('Error loading template');
  }
});

module.exports = router;