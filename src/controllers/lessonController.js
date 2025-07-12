const { Lesson, Progress } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;

// Get all lessons
const getAllLessons = async (req, res) => {
  try {
    const { topic, difficulty, active } = req.query;
    
    // Build query
    const where = {};
    if (topic) where.topic = topic;
    if (difficulty) where.difficulty = difficulty;
    if (active !== undefined) where.isActive = active === 'true';
    else where.isActive = true; // Default to active lessons only

    const lessons = await Lesson.findAll({
      where,
      order: [['topic', 'ASC'], ['difficulty', 'ASC'], ['order', 'ASC']],
      attributes: { exclude: ['content'] } // Exclude content for list view
    });

    // If user is authenticated, add completion status
    if (req.userId) {
      const completedProgress = await Progress.findAll({
        where: {
          userId: req.userId,
          activityType: 'lesson',
          score: { [Op.gte]: 70 } // Consider completed if score >= 70
        },
        attributes: ['metadata'],
        raw: true
      });
      
      const completedLessons = completedProgress
        .map(p => p.metadata && p.metadata.lessonId)
        .filter(id => id);

      const lessonsWithStatus = lessons.map(lesson => ({
        ...lesson.toJSON(),
        completed: completedLessons.some(id => id === lesson.id || id === lesson.id.toString()),
        accessible: true // Will be updated below
      }));

      // Check prerequisites
      for (const lesson of lessonsWithStatus) {
        const lessonInstance = await Lesson.findByPk(lesson.id);
        lesson.accessible = await lessonInstance.canUserAccess(req.userId);
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

    const lesson = await Lesson.findByPk(id, {
      include: [{
        model: Lesson,
        as: 'prerequisiteLessons',
        attributes: ['title', 'topic', 'difficulty'],
        through: { attributes: [] }
      }]
    });

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
        where: {
          userId: req.userId,
          activityType: 'lesson'
        },
        order: [['completedAt', 'DESC']]
      });
      
      // Check if progress is for this lesson
      const lessonProgress = progress && progress.metadata && 
        progress.metadata.lessonId === lesson.id ? progress : null;

      return res.json({
        success: true,
        data: {
          ...lesson.toJSON(),
          userProgress: lessonProgress
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
      const completedProgress = await Progress.findAll({
        where: {
          userId: req.userId,
          activityType: 'lesson',
          topic,
          score: { [Op.gte]: 70 }
        },
        attributes: ['metadata']
      });
      
      const completedLessons = completedProgress
        .map(p => p.metadata && p.metadata.lessonId)
        .filter(id => id);

      const lessonsWithStatus = await Promise.all(
        lessons.map(async (lesson) => ({
          ...lesson.toJSON(),
          completed: completedLessons.some(id => id === lesson.id || id === lesson.id.toString()),
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
      const completedProgress = await Progress.findAll({
        where: {
          userId: req.userId,
          activityType: 'lesson',
          topic,
          score: { [Op.gte]: 70 }
        },
        attributes: ['metadata']
      });
      
      const completedLessons = completedProgress
        .map(p => p.metadata && p.metadata.lessonId)
        .filter(id => id);

      const pathWithProgress = await Promise.all(
        path.map(async (lesson) => ({
          ...lesson.toJSON(),
          completed: completedLessons.some(id => id === lesson.id || id === lesson.id.toString()),
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
    const lesson = await Lesson.findByPk(id);
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
    const progress = await Progress.create({
      userId: req.userId,
      activityType: 'lesson',
      topic: lesson.topic,
      subtopic: lesson.subtopic,
      score: score || 100, // Default to 100 for lesson completion
      timeSpent,
      xpEarned: lesson.xpReward,
      difficulty: lesson.difficulty,
      metadata: {
        lessonId: lesson.id,
        lessonTitle: lesson.title
      },
      answers
    });

    // Update lesson stats
    await lesson.updateCompletionStats(timeSpent, score, true);

    // Update user XP
    const user = await require('../models').User.findByPk(req.userId);
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
    const topics = await Lesson.findAll({
      where: { isActive: true },
      attributes: [[Lesson.sequelize.fn('DISTINCT', Lesson.sequelize.col('topic')), 'topic']],
      raw: true
    }).then(results => results.map(r => r.topic));
    
    // Get topic stats if user is authenticated
    if (req.userId) {
      const topicStats = await Promise.all(
        topics.map(async (topic) => {
          const lessonCount = await Lesson.count({ where: { topic, isActive: true } });
          const completedCount = await Progress.count({
            where: {
              userId: req.userId,
              activityType: 'lesson',
              topic,
              score: { [Op.gte]: 70 }
            }
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
    const materials = await Lesson.findAll({ 
      where: {
        topic, 
        isActive: true,
        [Op.or]: [
          Lesson.sequelize.literal("tags @> '\"revision\"'"),
          { difficulty: 'beginner' } // Include beginner lessons for revision
        ]
      },
      attributes: { exclude: ['content'] },
      order: [['difficulty', 'ASC'], ['order', 'ASC']]
    });

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
    const examples = await Lesson.findAll({ 
      where: {
        topic, 
        isActive: true
      },
      attributes: { exclude: ['content'] },
      order: [['difficulty', 'ASC'], ['order', 'ASC']]
    });
    
    // Filter by tag
    const filteredExamples = examples.filter(lesson => 
      lesson.tags && lesson.tags.includes('example')
    );

    res.json({
      success: true,
      data: filteredExamples
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