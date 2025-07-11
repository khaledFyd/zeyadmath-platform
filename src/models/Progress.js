const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  activityType: { 
    type: String, 
    enum: ['practice', 'lesson', 'revision', 'example'],
    required: [true, 'Activity type is required']
  },
  topic: { 
    type: String, 
    required: [true, 'Topic is required'],
    trim: true,
    index: true
  },
  subtopic: {
    type: String,
    trim: true
  },
  score: {
    type: Number,
    min: [0, 'Score cannot be negative'],
    max: [100, 'Score cannot exceed 100']
  },
  totalQuestions: {
    type: Number,
    min: [0, 'Total questions cannot be negative']
  },
  correctAnswers: {
    type: Number,
    min: [0, 'Correct answers cannot be negative']
  },
  timeSpent: {
    type: Number, // in seconds
    min: [0, 'Time spent cannot be negative']
  },
  xpEarned: { 
    type: Number, 
    default: 0,
    min: [0, 'XP earned cannot be negative']
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  completedAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Track individual answers for detailed analysis
  answers: [{
    question: String,
    userAnswer: mongoose.Schema.Types.Mixed,
    correctAnswer: mongoose.Schema.Types.Mixed,
    isCorrect: Boolean,
    timeSpent: Number, // seconds per question
    hint: Boolean // whether hint was used
  }]
});

// Compound indexes for efficient queries
progressSchema.index({ userId: 1, activityType: 1, completedAt: -1 });
progressSchema.index({ userId: 1, topic: 1, completedAt: -1 });
progressSchema.index({ userId: 1, completedAt: -1 });

// Calculate score if not provided
progressSchema.pre('save', function(next) {
  if (this.totalQuestions && this.correctAnswers !== undefined && !this.score) {
    this.score = Math.round((this.correctAnswers / this.totalQuestions) * 100);
  }
  next();
});

// Static method to get user statistics
progressSchema.statics.getUserStats = async function(userId, dateRange = {}) {
  try {
    const query = { userId: mongoose.Types.ObjectId(userId) };
    
    if (dateRange.start || dateRange.end) {
      query.completedAt = {};
      if (dateRange.start) query.completedAt.$gte = dateRange.start;
      if (dateRange.end) query.completedAt.$lte = dateRange.end;
    }
    
    const stats = await this.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 },
          totalXP: { $sum: '$xpEarned' },
          avgScore: { $avg: '$score' },
          totalTimeSpent: { $sum: '$timeSpent' },
          topics: { $addToSet: '$topic' }
        }
      }
    ]);
    
    return stats;
  } catch (error) {
    console.error('Error in getUserStats:', error);
    return [];
  }
};

// Static method to get topic progress
progressSchema.statics.getTopicProgress = async function(userId, topic) {
  try {
    const progress = await this.aggregate([
      { 
        $match: { 
          userId: mongoose.Types.ObjectId(userId), 
          topic: topic 
        } 
      },
    {
      $group: {
        _id: '$activityType',
        attempts: { $sum: 1 },
        avgScore: { $avg: '$score' },
        totalXP: { $sum: '$xpEarned' },
        lastAttempt: { $max: '$completedAt' }
      }
    }
  ]);
  
  return progress;
  } catch (error) {
    console.error('Error in getTopicProgress:', error);
    return [];
  }
};

// Instance method to calculate mastery level
progressSchema.methods.getMasteryLevel = function() {
  if (this.score >= 95) return 'mastered';
  if (this.score >= 80) return 'proficient';
  if (this.score >= 60) return 'developing';
  return 'beginner';
};

// Static method for leaderboard
progressSchema.statics.getLeaderboard = async function(period = 'all', limit = 10) {
  const dateFilter = {};
  const now = new Date();
  
  switch (period) {
    case 'daily':
      dateFilter.completedAt = {
        $gte: new Date(now.setHours(0, 0, 0, 0))
      };
      break;
    case 'weekly':
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter.completedAt = { $gte: weekAgo };
      break;
    case 'monthly':
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter.completedAt = { $gte: monthAgo };
      break;
  }
  
  const leaderboard = await this.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$userId',
        totalXP: { $sum: '$xpEarned' },
        activitiesCompleted: { $sum: 1 },
        avgScore: { $avg: '$score' }
      }
    },
    { $sort: { totalXP: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        username: '$user.username',
        level: '$user.level',
        totalXP: 1,
        activitiesCompleted: 1,
        avgScore: 1
      }
    }
  ]);
  
  return leaderboard;
};

module.exports = mongoose.model('Progress', progressSchema);