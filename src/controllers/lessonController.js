const { Lesson, Progress } = require('../models');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs').promises;

// Get all lessons
const getAllLessons = async (req, res) => {
  try {
    const { topic, difficulty, active } = req.query;
    
    // Build query
    const query = {};
    if (topic) query.topic = topic;
    if (difficulty) query.difficulty = difficulty;
    if (active !== undefined) query.isActive = active === 'true';
    else query.isActive = true; // Default to active lessons only

    const lessons = await Lesson.find(query)
      .sort({ topic: 1, difficulty: 1, order: 1 })
      .select('-content'); // Exclude content for list view

    // If user is authenticated, add completion status
    if (req.userId) {
      const completedLessons = await Progress.find({
        userId: req.userId,
        activityType: 'lesson',
        score: { $gte: 70 } // Consider completed if score >= 70
      }).distinct('metadata.lessonId');

      const lessonsWithStatus = lessons.map(lesson => ({
        ...lesson.toObject(),
        completed: completedLessons.some(id => id.toString() === lesson._id.toString()),
        accessible: true // Will be updated below
      }));

      // Check prerequisites
      for (const lesson of lessonsWithStatus) {
        lesson.accessible = await Lesson.findById(lesson._id).then(l => l.canUserAccess(req.userId));
      }

      return res.json({
        success: true,
        data: lessonsWithStatus
      });
    }

    res.json({
      success: true,
      data: lessons
    });
  } catch (error) {
    console.error('Get all lessons error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching lessons' 
    });
  }
};

// Get lesson by ID
const getLessonById = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id)
      .populate('prerequisites', 'title topic difficulty');

    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        error: 'Lesson not found' 
      });
    }

    // Check if user can access
    if (req.userId) {
      const canAccess = await lesson.canUserAccess(req.userId);
      if (!canAccess) {
        return res.status(403).json({ 
          success: false, 
          error: 'Complete prerequisites first' 
        });
      }

      // Get user's progress on this lesson
      const progress = await Progress.findOne({
        userId: req.userId,
        activityType: 'lesson',
        'metadata.lessonId': lesson._id
      }).sort({ completedAt: -1 });

      return res.json({
        success: true,
        data: {
          ...lesson.toObject(),
          userProgress: progress
        }
      });
    }

    res.json({
      success: true,
      data: lesson
    });
  } catch (error) {
    console.error('Get lesson by ID error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching lesson' 
    });
  }
};

// Get lessons by topic
const getLessonsByTopic = async (req, res) => {
  try {
    const { topic } = req.params;
    const { difficulty } = req.query;

    const lessons = await Lesson.getLessonsByTopic(topic, difficulty);

    // Add user-specific data if authenticated
    if (req.userId) {
      const completedLessons = await Progress.find({
        userId: req.userId,
        activityType: 'lesson',
        topic,
        score: { $gte: 70 }
      }).distinct('metadata.lessonId');

      const lessonsWithStatus = await Promise.all(
        lessons.map(async (lesson) => ({
          ...lesson.toObject(),
          completed: completedLessons.some(id => id.toString() === lesson._id.toString()),
          accessible: await lesson.canUserAccess(req.userId)
        }))
      );

      return res.json({
        success: true,
        data: lessonsWithStatus
      });
    }

    res.json({
      success: true,
      data: lessons
    });
  } catch (error) {
    console.error('Get lessons by topic error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching lessons' 
    });
  }
};

// Get lesson path (ordered lessons with prerequisites)
const getLessonPath = async (req, res) => {
  try {
    const { topic } = req.params;

    const path = await Lesson.getLessonPath(topic);

    // Add user progress if authenticated
    if (req.userId) {
      const completedLessons = await Progress.find({
        userId: req.userId,
        activityType: 'lesson',
        topic,
        score: { $gte: 70 }
      }).distinct('metadata.lessonId');

      const pathWithProgress = await Promise.all(
        path.map(async (lesson) => ({
          ...lesson.toObject(),
          completed: completedLessons.some(id => id.toString() === lesson._id.toString()),
          accessible: await lesson.canUserAccess(req.userId)
        }))
      );

      return res.json({
        success: true,
        data: pathWithProgress
      });
    }

    res.json({
      success: true,
      data: path
    });
  } catch (error) {
    console.error('Get lesson path error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching lesson path' 
    });
  }
};

// Mark lesson as completed
const completeLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { timeSpent, score, answers } = req.body;

    // Find lesson
    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        error: 'Lesson not found' 
      });
    }

    // Check access
    const canAccess = await lesson.canUserAccess(req.userId);
    if (!canAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Complete prerequisites first' 
      });
    }

    // Create progress record
    const progress = new Progress({
      userId: req.userId,
      activityType: 'lesson',
      topic: lesson.topic,
      subtopic: lesson.subtopic,
      score: score || 100, // Default to 100 for lesson completion
      timeSpent,
      xpEarned: lesson.xpReward,
      difficulty: lesson.difficulty,
      metadata: {
        lessonId: lesson._id,
        lessonTitle: lesson.title
      },
      answers
    });

    await progress.save();

    // Update lesson stats
    await lesson.updateCompletionStats(timeSpent, score, true);

    // Update user XP
    const user = await require('../models').User.findById(req.userId);
    user.xp += lesson.xpReward;
    user.level = user.calculateLevel();
    await user.save();

    res.json({
      success: true,
      data: {
        xpEarned: lesson.xpReward,
        totalXP: user.xp,
        level: user.level,
        progress: progress
      }
    });
  } catch (error) {
    console.error('Complete lesson error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error completing lesson' 
    });
  }
};

// Get recommended lessons
const getRecommendedLessons = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const recommendations = await Lesson.getRecommendedLessons(
      req.userId, 
      parseInt(limit)
    );

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Get recommended lessons error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching recommendations' 
    });
  }
};

// Get lesson topics
const getLessonTopics = async (req, res) => {
  try {
    const topics = await Lesson.distinct('topic', { isActive: true });
    
    // Get topic stats if user is authenticated
    if (req.userId) {
      const topicStats = await Promise.all(
        topics.map(async (topic) => {
          const lessonCount = await Lesson.countDocuments({ topic, isActive: true });
          const completedCount = await Progress.countDocuments({
            userId: req.userId,
            activityType: 'lesson',
            topic,
            score: { $gte: 70 }
          });

          return {
            topic,
            lessonCount,
            completedCount,
            progress: lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0
          };
        })
      );

      return res.json({
        success: true,
        data: topicStats
      });
    }

    res.json({
      success: true,
      data: topics.map(topic => ({ topic }))
    });
  } catch (error) {
    console.error('Get lesson topics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching topics' 
    });
  }
};

// Get revision materials for a topic
const getRevisionMaterials = async (req, res) => {
  try {
    const { topic } = req.params;

    // For now, return lessons marked as revision or all completed lessons
    const query = { 
      topic, 
      isActive: true,
      $or: [
        { tags: 'revision' },
        { difficulty: 'beginner' } // Include beginner lessons for revision
      ]
    };

    const materials = await Lesson.find(query)
      .select('-content')
      .sort({ difficulty: 1, order: 1 });

    res.json({
      success: true,
      data: materials
    });
  } catch (error) {
    console.error('Get revision materials error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching revision materials' 
    });
  }
};

// Get example problems for a topic
const getExampleProblems = async (req, res) => {
  try {
    const { topic } = req.params;

    // For now, return lessons tagged as examples
    const examples = await Lesson.find({ 
      topic, 
      isActive: true,
      tags: 'example'
    })
    .select('-content')
    .sort({ difficulty: 1, order: 1 });

    res.json({
      success: true,
      data: examples
    });
  } catch (error) {
    console.error('Get example problems error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching examples' 
    });
  }
};

module.exports = {
  getAllLessons,
  getLessonById,
  getLessonsByTopic,
  getLessonPath,
  completeLesson,
  getRecommendedLessons,
  getLessonTopics,
  getRevisionMaterials,
  getExampleProblems
};