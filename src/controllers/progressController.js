const { User, Progress } = require('../models');
const { calculateXP, checkAchievements, calculateTopicMastery } = require('../utils/xpCalculator');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Record a learning activity
const recordActivity = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      activityType,
      topic,
      subtopic,
      score,
      totalQuestions,
      correctAnswers,
      timeSpent,
      difficulty,
      metadata,
      answers,
      xpOverride
    } = req.body;

    // Get user
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Update user streak
    user.updateStreak();

    // Check if this is first completion of this topic/type combination
    const previousAttempts = await Progress.count({
      where: {
        userId: req.userId,
        activityType,
        topic,
        score: { [Op.gte]: 70 } // Consider "completed" if score >= 70
      }
    });

    // Calculate XP
    const xpData = {
      type: activityType,
      score: score || (correctAnswers && totalQuestions ? (correctAnswers / totalQuestions) * 100 : 0),
      timeSpent,
      expectedTime: metadata?.expectedTime,
      streak: user.streakCount,
      difficulty,
      firstCompletion: previousAttempts === 0
    };

    // Use xpOverride if provided (for incremental saves), otherwise calculate XP
    const xpEarned = xpOverride !== undefined ? xpOverride : calculateXP(xpData);

    // Create progress record
    const progress = await Progress.create({
      userId: req.userId,
      activityType,
      topic,
      subtopic,
      score: xpData.score,
      totalQuestions,
      correctAnswers,
      timeSpent,
      xpEarned,
      difficulty,
      metadata,
      answers
    });

    // Update user XP and level
    console.log(`[XP Update] User ${user.username} - Current XP: ${user.xp}, Adding: ${xpEarned}`);
    user.xp += xpEarned;
    console.log(`[XP Update] New total XP: ${user.xp}`);
    const newLevel = user.calculateLevel();
    const leveledUp = newLevel > user.level;
    user.level = newLevel;

    // Check for achievements
    const progressStats = await Progress.getUserStats(req.userId);
    const topicProgress = await Progress.getTopicProgress(req.userId, topic);
    
    // Calculate additional stats for achievements
    const perfectScores = await Progress.count({
      where: {
        userId: req.userId,
        score: 100
      }
    });

    const topicMastery = {};
    const allTopics = await Progress.findAll({
      where: { userId: req.userId },
      attributes: [[Progress.sequelize.fn('DISTINCT', Progress.sequelize.col('topic')), 'topic']],
      raw: true
    }).then(results => results.map(r => r.topic));
    for (const t of allTopics) {
      const tProgress = await Progress.getTopicProgress(req.userId, t);
      topicMastery[t] = calculateTopicMastery(tProgress);
    }

    const achievementStats = {
      progressStats,
      topicProgress,
      perfectScores,
      topicMastery
    };

    const newAchievements = await checkAchievements(user, achievementStats);

    // Award achievement XP
    for (const achievement of newAchievements) {
      await user.addAchievement(achievement);
    }

    // Save user updates
    await user.save();

    // Send response
    res.status(201).json({
      success: true,
      data: {
        xpEarned,
        totalXP: user.xp,
        level: user.level,
        leveledUp,
        xpForNextLevel: user.getXPForNextLevel(),
        newAchievements,
        streakCount: user.streakCount,
        progress: {
          id: progress.id,
          score: progress.score,
          mastery: progress.getMasteryLevel()
        }
      }
    });
  } catch (error) {
    console.error('Record activity error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error recording activity' 
    });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const userId = req.userId;
    const { startDate, endDate } = req.query;

    console.log('Getting stats for user:', userId);

    // Build date range query
    const dateRange = {};
    if (startDate) dateRange.start = new Date(startDate);
    if (endDate) dateRange.end = new Date(endDate);

    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      console.error('User not found:', userId);
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Get activity stats
    const activityStats = await Progress.getUserStats(userId, dateRange);

    // Get recent progress
    const recentProgress = await Progress.findAll({
      where: { userId },
      order: [['completedAt', 'DESC']],
      limit: 10,
      attributes: ['activityType', 'topic', 'score', 'xpEarned', 'completedAt']
    });

    // Get topic mastery
    const allTopics = await Progress.findAll({
      where: { userId },
      attributes: [[Progress.sequelize.fn('DISTINCT', Progress.sequelize.col('topic')), 'topic']],
      raw: true
    }).then(results => results.map(r => r.topic));
    const topicMastery = {};
    
    for (const topic of allTopics) {
      const topicProgress = await Progress.getTopicProgress(userId, topic);
      topicMastery[topic] = {
        mastery: calculateTopicMastery(topicProgress),
        details: topicProgress
      };
    }

    // Get achievement progress
    const earnedAchievementIds = user.achievements.map(a => a.name);
    const { achievements } = require('../utils/xpCalculator');
    const availableAchievements = achievements
      .filter(a => !earnedAchievementIds.includes(a.name))
      .map(a => ({
        name: a.name,
        description: a.description,
        xpReward: a.xpReward
      }));

    res.json({
      success: true,
      data: {
        user: {
          username: user.username,
          xp: user.xp,
          level: user.level,
          xpForNextLevel: user.getXPForNextLevel(),
          streakCount: user.streakCount,
          achievements: user.achievements,
          joinedDate: user.createdAt
        },
        activityStats,
        recentProgress,
        topicMastery,
        availableAchievements
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching user statistics',
      details: error.message 
    });
  }
};

// Get detailed progress by activity type
const getDetailedProgress = async (req, res) => {
  try {
    const userId = req.userId;
    const { type, topic, startDate, endDate, limit = 50, offset = 0 } = req.query;

    // Build query
    const where = { userId };
    if (type) where.activityType = type;
    if (topic) where.topic = topic;
    
    if (startDate || endDate) {
      where.completedAt = {};
      if (startDate) where.completedAt[Op.gte] = new Date(startDate);
      if (endDate) where.completedAt[Op.lte] = new Date(endDate);
    }

    // Get total count
    const totalCount = await Progress.count({ where });

    // Get progress records
    const progress = await Progress.findAll({
      where,
      order: [['completedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate aggregated stats
    const stats = await Progress.findOne({
      where,
      attributes: [
        [Progress.sequelize.fn('COUNT', Progress.sequelize.col('id')), 'totalActivities'],
        [Progress.sequelize.fn('SUM', Progress.sequelize.col('xpEarned')), 'totalXP'],
        [Progress.sequelize.fn('AVG', Progress.sequelize.col('score')), 'avgScore'],
        [Progress.sequelize.fn('SUM', Progress.sequelize.col('timeSpent')), 'totalTime'],
        [Progress.sequelize.literal("SUM(CASE WHEN score = 100 THEN 1 ELSE 0 END)"), 'perfectScores']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        progress,
        stats: stats || {
          totalActivities: 0,
          totalXP: 0,
          avgScore: 0,
          totalTime: 0,
          perfectScores: 0
        },
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: totalCount > parseInt(offset) + parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get detailed progress error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching detailed progress' 
    });
  }
};

// Get leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const { period = 'all', limit = 10 } = req.query;

    const leaderboard = await Progress.getLeaderboard(period, parseInt(limit));

    // Add current user's rank if authenticated
    let userRank = null;
    if (req.userId) {
      // Get date filter for period
      const dateFilter = period !== 'all' ? Progress.getLeaderboard(period, 1).then(result => result.dateFilter) : {};
      
      // Get user's total XP for the period
      const userStats = await Progress.findOne({
        where: {
          userId: req.userId,
          ...dateFilter
        },
        attributes: [
          [Progress.sequelize.fn('SUM', Progress.sequelize.col('xpEarned')), 'totalXP']
        ],
        raw: true
      });

      if (userStats && userStats.totalXP) {
        // Get all users' XP for ranking
        const allUsers = await Progress.findAll({
          where: dateFilter,
          attributes: [
            'userId',
            [Progress.sequelize.fn('SUM', Progress.sequelize.col('xpEarned')), 'totalXP']
          ],
          group: ['userId'],
          order: [[Progress.sequelize.fn('SUM', Progress.sequelize.col('xpEarned')), 'DESC']],
          raw: true
        });

        userRank = allUsers.findIndex(u => u.userId === req.userId) + 1;
      }
    }

    res.json({
      success: true,
      data: {
        period,
        leaderboard,
        userRank
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching leaderboard' 
    });
  }
};

// Award bonus XP (admin only)
const awardBonusXP = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;

    // Validate input
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid userId or amount' 
      });
    }

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Award XP
    user.xp += amount;
    const newLevel = user.calculateLevel();
    const leveledUp = newLevel > user.level;
    user.level = newLevel;

    // Create progress record for bonus XP
    const progress = await Progress.create({
      userId,
      activityType: 'bonus',
      topic: 'bonus',
      xpEarned: amount,
      metadata: { reason }
    });

    await user.save();

    res.json({
      success: true,
      data: {
        xpAwarded: amount,
        totalXP: user.xp,
        level: user.level,
        leveledUp,
        reason
      }
    });
  } catch (error) {
    console.error('Award bonus XP error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error awarding bonus XP' 
    });
  }
};

module.exports = {
  recordActivity,
  getUserStats,
  getDetailedProgress,
  getLeaderboard,
  awardBonusXP
};