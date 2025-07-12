const express = require('express');
const router = express.Router();
const { User, Progress } = require('../models');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');

// Debug endpoint to check user's current XP directly from database
router.get('/user-xp/:username', auth, async (req, res) => {
  try {
    const { username } = req.params;
    
    // Find user by username
    const user = await User.findOne({
      where: { username },
      attributes: ['id', 'username', 'email', 'xp', 'level', 'createdAt', 'updatedAt']
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get recent progress records
    const recentProgress = await Progress.findAll({
      where: { userId: user.id },
      order: [['completedAt', 'DESC']],
      limit: 10,
      attributes: ['id', 'activityType', 'topic', 'xpEarned', 'score', 'completedAt', 'metadata']
    });
    
    // Calculate total XP from progress records
    const totalXPFromProgress = await Progress.sum('xpEarned', {
      where: { userId: user.id }
    }) || 0;
    
    // Count total activities
    const totalActivities = await Progress.count({
      where: { userId: user.id }
    });
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          xpInUserTable: user.xp,
          level: user.level,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        progressSummary: {
          totalXPFromProgress,
          totalActivities,
          xpDiscrepancy: user.xp - totalXPFromProgress
        },
        recentProgress: recentProgress.map(p => ({
          id: p.id,
          activityType: p.activityType,
          topic: p.topic,
          xpEarned: p.xpEarned,
          score: p.score,
          completedAt: p.completedAt,
          metadata: p.metadata
        }))
      }
    });
  } catch (error) {
    console.error('Debug user XP error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching user XP data',
      details: error.message
    });
  }
});

// Debug endpoint to manually fix user XP (admin only)
router.post('/fix-user-xp', auth, async (req, res) => {
  try {
    const { userId, username } = req.body;
    
    if (!userId && !username) {
      return res.status(400).json({
        success: false,
        error: 'Must provide either userId or username'
      });
    }
    
    // Find user
    const whereClause = userId ? { id: userId } : { username };
    const user = await User.findOne({ where: whereClause });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Calculate correct XP from progress records
    const correctXP = await Progress.sum('xpEarned', {
      where: { userId: user.id }
    }) || 0;
    
    const oldXP = user.xp;
    user.xp = correctXP;
    user.level = user.calculateLevel();
    await user.save();
    
    res.json({
      success: true,
      data: {
        username: user.username,
        oldXP,
        newXP: correctXP,
        difference: correctXP - oldXP,
        newLevel: user.level
      }
    });
  } catch (error) {
    console.error('Fix user XP error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fixing user XP',
      details: error.message
    });
  }
});

// Debug endpoint to check XP calculation
router.post('/test-xp-calculation', auth, async (req, res) => {
  try {
    const { activityType = 'practice', score = 100, difficulty = 'beginner' } = req.body;
    
    const { calculateXP } = require('../utils/xpCalculator');
    
    const xpData = {
      type: activityType,
      score: score,
      difficulty: difficulty,
      firstCompletion: false,
      streak: 1
    };
    
    const calculatedXP = calculateXP(xpData);
    
    res.json({
      success: true,
      data: {
        input: xpData,
        calculatedXP,
        explanation: `Base XP for ${activityType} with score ${score}% at ${difficulty} difficulty = ${calculatedXP} XP`
      }
    });
  } catch (error) {
    console.error('Test XP calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Error testing XP calculation',
      details: error.message
    });
  }
});

module.exports = router;