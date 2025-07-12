const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const Lesson = sequelize.define('Lesson', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: {
        args: [1, 100],
        msg: 'Title cannot exceed 100 characters'
      }
    }
  },
  topic: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subtopic: {
    type: DataTypes.STRING
  },
  difficulty: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    defaultValue: 'beginner',
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    validate: {
      contentOrTemplate() {
        if (!this.content && !this.templatePath) {
          throw new Error('Either content or templatePath must be provided');
        }
      }
    }
  },
  templatePath: {
    type: DataTypes.STRING
  },
  description: {
    type: DataTypes.STRING(500),
    validate: {
      len: {
        args: [0, 500],
        msg: 'Description cannot exceed 500 characters'
      }
    }
  },
  objectives: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  xpReward: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    validate: {
      min: {
        args: [0],
        msg: 'XP reward cannot be negative'
      }
    }
  },
  prerequisites: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  estimatedTime: {
    type: DataTypes.INTEGER, // in minutes
    defaultValue: 15
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  resources: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  completionStats: {
    type: DataTypes.JSON,
    defaultValue: {
      totalAttempts: 0,
      totalCompletions: 0,
      averageTime: 0,
      averageScore: 0
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['topic', 'difficulty', 'order']
    },
    {
      fields: ['isActive', 'topic']
    }
    // Note: JSON fields like 'tags' need GIN indexes which must be created via migration
  ]
});

// Virtual for completion rate
Lesson.prototype.getCompletionRate = function() {
  if (!this.completionStats || this.completionStats.totalAttempts === 0) return 0;
  return Math.round((this.completionStats.totalCompletions / this.completionStats.totalAttempts) * 100);
};

// Static method to get lessons by topic and difficulty
Lesson.getLessonsByTopic = async function(topic, difficulty = null) {
  const where = { 
    topic, 
    isActive: true 
  };
  
  if (difficulty) {
    where.difficulty = difficulty;
  }
  
  return this.findAll({
    where,
    order: [['difficulty', 'ASC'], ['order', 'ASC']]
  });
};

// Static method to get lesson path (ordered lessons with prerequisites)
Lesson.getLessonPath = async function(topic) {
  const lessons = await this.findAll({
    where: { 
      topic, 
      isActive: true 
    },
    order: [['difficulty', 'ASC'], ['order', 'ASC']]
  });
  
  // Build dependency graph and return ordered path
  const lessonMap = new Map();
  const visited = new Set();
  const path = [];
  
  lessons.forEach(lesson => {
    lessonMap.set(lesson.id.toString(), lesson);
  });
  
  function addToPath(lessonId) {
    if (visited.has(lessonId)) return;
    
    const lesson = lessonMap.get(lessonId);
    if (!lesson) return;
    
    // Add prerequisites first
    if (lesson.prerequisites && Array.isArray(lesson.prerequisites)) {
      lesson.prerequisites.forEach(prereqId => {
        addToPath(prereqId.toString());
      });
    }
    
    visited.add(lessonId);
    path.push(lesson);
  }
  
  lessons.forEach(lesson => {
    addToPath(lesson.id.toString());
  });
  
  return path;
};

// Instance method to check if user can access lesson
Lesson.prototype.canUserAccess = async function(userId) {
  if (!this.prerequisites || this.prerequisites.length === 0) return true;
  
  const Progress = require('./Progress');
  
  try {
    // Check if all prerequisites are completed
    const completedLessons = await Progress.findAll({
      where: {
        userId,
        activityType: 'lesson',
        score: { [Op.gte]: 70 } // Minimum passing score
      },
      attributes: ['metadata'],
      raw: true
    });
    
    const completedSet = new Set(
      completedLessons
        .map(p => p.metadata && p.metadata.lessonId)
        .filter(id => id)
        .map(id => id.toString())
    );
    
    return this.prerequisites.every(prereqId => 
      completedSet.has(prereqId.toString())
    );
  } catch (error) {
    console.error('Error checking lesson access:', error);
    // For development, allow access if there's an error
    return true;
  }
};

// Instance method to update completion stats
Lesson.prototype.updateCompletionStats = async function(timeSpent, score, completed) {
  const stats = this.completionStats || {
    totalAttempts: 0,
    totalCompletions: 0,
    averageTime: 0,
    averageScore: 0
  };
  
  stats.totalAttempts += 1;
  
  if (completed) {
    stats.totalCompletions += 1;
  }
  
  // Update average time
  const totalTime = stats.averageTime * (stats.totalAttempts - 1) + timeSpent;
  stats.averageTime = Math.round(totalTime / stats.totalAttempts);
  
  // Update average score
  if (score !== null && score !== undefined) {
    const totalScore = stats.averageScore * (stats.totalAttempts - 1) + score;
    stats.averageScore = Math.round(totalScore / stats.totalAttempts);
  }
  
  this.completionStats = stats;
  return await this.save();
};

// Static method to get recommended lessons for user
Lesson.getRecommendedLessons = async function(userId, limit = 5) {
  const Progress = require('./Progress');
  
  // Get user's completed lessons and topics
  const userProgress = await Progress.findAll({
    where: {
      userId,
      activityType: 'lesson'
    },
    order: [['completedAt', 'DESC']],
    raw: true
  });
  
  const completedLessonIds = userProgress
    .filter(p => p.score >= 70 && p.metadata && p.metadata.lessonId)
    .map(p => p.metadata.lessonId);
  
  const topicScores = {};
  userProgress.forEach(p => {
    if (!topicScores[p.topic]) {
      topicScores[p.topic] = { total: 0, count: 0 };
    }
    topicScores[p.topic].total += p.score;
    topicScores[p.topic].count += 1;
  });
  
  // Find lessons user hasn't completed
  const where = {
    isActive: true
  };
  
  if (completedLessonIds.length > 0) {
    where.id = { [Op.notIn]: completedLessonIds };
  }
  
  const recommendedLessons = await this.findAll({
    where,
    limit: limit * 2 // Get more to filter
  });
  
  // Filter by accessible lessons and sort by relevance
  const accessible = [];
  for (const lesson of recommendedLessons) {
    const canAccess = await lesson.canUserAccess(userId);
    if (canAccess) {
      // Calculate relevance score
      let relevance = 0;
      
      // Prefer topics user is doing well in
      if (topicScores[lesson.topic]) {
        const avgScore = topicScores[lesson.topic].total / topicScores[lesson.topic].count;
        if (avgScore >= 80) relevance += 2;
        else if (avgScore >= 60) relevance += 1;
      }
      
      // Prefer next difficulty level
      const lastInTopic = userProgress.find(p => p.topic === lesson.topic);
      if (lastInTopic) {
        if (lesson.difficulty === 'beginner' && lastInTopic.difficulty === 'beginner') relevance += 1;
        if (lesson.difficulty === 'intermediate' && lastInTopic.difficulty === 'beginner') relevance += 3;
        if (lesson.difficulty === 'advanced' && lastInTopic.difficulty === 'intermediate') relevance += 2;
      }
      
      accessible.push({ lesson, relevance });
    }
  }
  
  // Sort by relevance and return top lessons
  return accessible
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)
    .map(item => item.lesson);
};

module.exports = Lesson;