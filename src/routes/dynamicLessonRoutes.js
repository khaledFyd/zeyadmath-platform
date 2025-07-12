const express = require('express');
const router = express.Router();
const { auth, optionalAuth } = require('../middleware/auth');
const { scanLessonsDirectory, getLessonProgress } = require('../utils/lessonScanner');
const { Progress, User } = require('../models');

// Get all available lessons from file system
router.get('/', optionalAuth, async (req, res) => {
  try {
    // Scan for lessons
    const { lessons, lessonsByTopic, topics } = await scanLessonsDirectory();
    
    // If user is authenticated, add their progress
    if (req.userId) {
      const userProgress = await getLessonProgress(req.userId);
      
      // Add progress info to each lesson
      lessons.forEach(lesson => {
        const progress = userProgress[lesson.id] || {};
        lesson.completed = progress.completed || false;
        lesson.userScore = progress.score;
        lesson.userXpEarned = progress.xpEarned;
      });
    }
    
    res.json({
      success: true,
      data: {
        lessons,
        lessonsByTopic,
        topics,
        total: lessons.length
      }
    });
  } catch (error) {
    console.error('Error getting dynamic lessons:', error);
    res.status(500).json({
      success: false,
      error: 'Error loading lessons'
    });
  }
});

// Get specific lesson details
router.get('/:lessonId', optionalAuth, async (req, res) => {
  try {
    const { lessonId } = req.params;
    
    // Scan for lessons
    const { lessons } = await scanLessonsDirectory();
    
    // Find the requested lesson
    const lesson = lessons.find(l => l.id === lessonId);
    
    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found'
      });
    }
    
    // Add user progress if authenticated
    if (req.userId) {
      const userProgress = await getLessonProgress(req.userId);
      const progress = userProgress[lesson.id] || {};
      lesson.completed = progress.completed || false;
      lesson.userScore = progress.score;
      lesson.userXpEarned = progress.xpEarned;
    }
    
    res.json({
      success: true,
      data: lesson
    });
  } catch (error) {
    console.error('Error getting lesson details:', error);
    res.status(500).json({
      success: false,
      error: 'Error loading lesson'
    });
  }
});

// Complete a lesson
router.post('/:lessonId/complete', auth, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { score = 100, timeSpent = 0 } = req.body;
    
    // Get lesson details
    const { lessons } = await scanLessonsDirectory();
    const lesson = lessons.find(l => l.id === lessonId);
    
    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found'
      });
    }
    
    // Check if already completed
    const { Op } = require('sequelize');
    const existingProgress = await Progress.findOne({
      where: {
        userId: req.userId,
        activityType: 'lesson',
        metadata: {
          [Op.contains]: { lessonId: lessonId }
        }
      }
    });
    
    if (existingProgress && existingProgress.score >= 70) {
      return res.json({
        success: true,
        data: {
          alreadyCompleted: true,
          xpEarned: 0,
          totalXP: req.user.xp,
          level: req.user.level
        }
      });
    }
    
    // Calculate XP (with bonuses)
    let xpEarned = lesson.xpReward;
    if (score === 100) xpEarned = Math.floor(xpEarned * 1.5); // Perfect score bonus
    else if (score >= 90) xpEarned = Math.floor(xpEarned * 1.2); // High score bonus
    
    // Create progress record
    const progress = new Progress({
      userId: req.userId,
      activityType: 'lesson',
      topic: lesson.topic,
      score,
      timeSpent,
      xpEarned,
      difficulty: lesson.difficulty,
      metadata: {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonType: lesson.type
      }
    });
    
    await progress.save();
    
    // Update user XP
    const user = await User.findByPk(req.userId);
    user.xp += xpEarned;
    user.level = user.calculateLevel();
    user.updateStreak();
    await user.save();
    
    res.json({
      success: true,
      data: {
        xpEarned,
        totalXP: user.xp,
        level: user.level,
        leveledUp: user.level > req.user.level,
        streakCount: user.streakCount
      }
    });
  } catch (error) {
    console.error('Error completing lesson:', error);
    res.status(500).json({
      success: false,
      error: 'Error saving progress'
    });
  }
});

// Get lesson statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { lessons } = await scanLessonsDirectory();
    const userProgress = await getLessonProgress(req.userId);
    
    // Calculate stats
    const totalLessons = lessons.length;
    const completedLessons = Object.values(userProgress).filter(p => p.completed).length;
    const totalXpEarned = Object.values(userProgress).reduce((sum, p) => sum + (p.xpEarned || 0), 0);
    
    // Group by type
    const statsByType = {};
    lessons.forEach(lesson => {
      if (!statsByType[lesson.type]) {
        statsByType[lesson.type] = {
          total: 0,
          completed: 0,
          xpAvailable: 0,
          xpEarned: 0
        };
      }
      
      statsByType[lesson.type].total++;
      statsByType[lesson.type].xpAvailable += lesson.xpReward;
      
      const progress = userProgress[lesson.id];
      if (progress?.completed) {
        statsByType[lesson.type].completed++;
        statsByType[lesson.type].xpEarned += progress.xpEarned || 0;
      }
    });
    
    res.json({
      success: true,
      data: {
        totalLessons,
        completedLessons,
        completionPercentage: Math.round((completedLessons / totalLessons) * 100),
        totalXpEarned,
        statsByType
      }
    });
  } catch (error) {
    console.error('Error getting lesson stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error loading statistics'
    });
  }
});

module.exports = router;