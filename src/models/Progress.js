const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const Progress = sequelize.define('Progress', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  activityType: {
    type: DataTypes.ENUM('practice', 'lesson', 'revision', 'example'),
    allowNull: false
  },
  topic: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subtopic: {
    type: DataTypes.STRING
  },
  score: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0,
      max: 100
    }
  },
  totalQuestions: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0
    }
  },
  correctAnswers: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0
    }
  },
  timeSpent: {
    type: DataTypes.INTEGER, // in seconds
    validate: {
      min: 0
    }
  },
  xpEarned: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  difficulty: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    defaultValue: 'beginner'
  },
  completedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  answers: {
    type: DataTypes.JSON,
    defaultValue: []
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'activityType', 'completedAt']
    },
    {
      fields: ['userId', 'topic', 'completedAt']
    },
    {
      fields: ['userId', 'completedAt']
    },
    {
      fields: ['topic']
    },
    {
      fields: ['completedAt']
    }
  ]
});

// Calculate score before saving if not provided
Progress.beforeSave((progress) => {
  if (progress.totalQuestions && progress.correctAnswers !== undefined && !progress.score) {
    progress.score = Math.round((progress.correctAnswers / progress.totalQuestions) * 100);
  }
});

// Static method to get user statistics
Progress.getUserStats = async function(userId, dateRange = {}) {
  try {
    const where = { userId };
    
    if (dateRange.start || dateRange.end) {
      where.completedAt = {};
      if (dateRange.start) where.completedAt[Op.gte] = dateRange.start;
      if (dateRange.end) where.completedAt[Op.lte] = dateRange.end;
    }
    
    const stats = await this.findAll({
      where,
      attributes: [
        'activityType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('xpEarned')), 'totalXP'],
        [sequelize.fn('AVG', sequelize.col('score')), 'avgScore'],
        [sequelize.fn('SUM', sequelize.col('timeSpent')), 'totalTimeSpent'],
        [sequelize.fn('array_agg', sequelize.fn('DISTINCT', sequelize.col('topic'))), 'topics']
      ],
      group: ['activityType'],
      raw: true
    });
    
    return stats;
  } catch (error) {
    console.error('Error in getUserStats:', error);
    return [];
  }
};

// Static method to get topic progress
Progress.getTopicProgress = async function(userId, topic) {
  try {
    const progress = await this.findAll({
      where: { userId, topic },
      attributes: [
        'activityType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'attempts'],
        [sequelize.fn('AVG', sequelize.col('score')), 'avgScore'],
        [sequelize.fn('SUM', sequelize.col('xpEarned')), 'totalXP'],
        [sequelize.fn('MAX', sequelize.col('completedAt')), 'lastAttempt']
      ],
      group: ['activityType'],
      raw: true
    });
    
    return progress;
  } catch (error) {
    console.error('Error in getTopicProgress:', error);
    return [];
  }
};

// Instance method to calculate mastery level
Progress.prototype.getMasteryLevel = function() {
  if (this.score >= 95) return 'mastered';
  if (this.score >= 80) return 'proficient';
  if (this.score >= 60) return 'developing';
  return 'beginner';
};

// Static method for leaderboard
Progress.getLeaderboard = async function(period = 'all', limit = 10) {
  const where = {};
  const now = new Date();
  
  switch (period) {
    case 'daily':
      where.completedAt = {
        [Op.gte]: new Date(now.setHours(0, 0, 0, 0))
      };
      break;
    case 'weekly':
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      where.completedAt = { [Op.gte]: weekAgo };
      break;
    case 'monthly':
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      where.completedAt = { [Op.gte]: monthAgo };
      break;
  }
  
  const User = require('./User');
  
  const leaderboard = await this.findAll({
    where,
    attributes: [
      'userId',
      [sequelize.fn('SUM', sequelize.col('xpEarned')), 'totalXP'],
      [sequelize.fn('COUNT', sequelize.col('Progress.id')), 'activitiesCompleted'],
      [sequelize.fn('AVG', sequelize.col('score')), 'avgScore']
    ],
    include: [{
      model: User,
      attributes: ['username', 'level']
    }],
    group: ['userId', 'User.id'],
    order: [[sequelize.fn('SUM', sequelize.col('xpEarned')), 'DESC']],
    limit,
    raw: true,
    nest: true
  });
  
  return leaderboard;
};

module.exports = Progress;