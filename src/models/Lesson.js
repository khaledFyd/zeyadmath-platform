const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Lesson title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
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
  difficulty: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
    required: true
  },
  content: { 
    type: String, 
    required: function() {
      return !this.templatePath; // Content is required only if templatePath is not provided
    }
  },
  templatePath: {
    type: String, // Path to HTML template file
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  objectives: [{
    type: String
  }],
  xpReward: { 
    type: Number, 
    default: 10,
    min: [0, 'XP reward cannot be negative']
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Lesson'
  }],
  order: {
    type: Number,
    default: 0
  },
  estimatedTime: {
    type: Number, // in minutes
    default: 15
  },
  tags: [{
    type: String,
    trim: true
  }],
  resources: [{
    title: String,
    type: {
      type: String,
      enum: ['video', 'article', 'exercise', 'game', 'quiz']
    },
    url: String,
    description: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Track completion statistics
  completionStats: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    totalCompletions: {
      type: Number,
      default: 0
    },
    averageTime: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    }
  }
});

// Indexes for performance
lessonSchema.index({ topic: 1, difficulty: 1, order: 1 });
lessonSchema.index({ isActive: 1, topic: 1 });
lessonSchema.index({ tags: 1 });

// Update timestamp on save
lessonSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for completion rate
lessonSchema.virtual('completionRate').get(function() {
  if (this.completionStats.totalAttempts === 0) return 0;
  return Math.round((this.completionStats.totalCompletions / this.completionStats.totalAttempts) * 100);
});

// Static method to get lessons by topic and difficulty
lessonSchema.statics.getLessonsByTopic = async function(topic, difficulty = null) {
  const query = { 
    topic, 
    isActive: true 
  };
  
  if (difficulty) {
    query.difficulty = difficulty;
  }
  
  return this.find(query)
    .sort({ difficulty: 1, order: 1 })
    .populate('prerequisites', 'title topic difficulty');
};

// Static method to get lesson path (ordered lessons with prerequisites)
lessonSchema.statics.getLessonPath = async function(topic) {
  const lessons = await this.find({ 
    topic, 
    isActive: true 
  })
  .populate('prerequisites')
  .sort({ difficulty: 1, order: 1 });
  
  // Build dependency graph and return ordered path
  const lessonMap = new Map();
  const visited = new Set();
  const path = [];
  
  lessons.forEach(lesson => {
    lessonMap.set(lesson._id.toString(), lesson);
  });
  
  function addToPath(lessonId) {
    if (visited.has(lessonId)) return;
    
    const lesson = lessonMap.get(lessonId);
    if (!lesson) return;
    
    // Add prerequisites first
    lesson.prerequisites.forEach(prereq => {
      addToPath(prereq._id.toString());
    });
    
    visited.add(lessonId);
    path.push(lesson);
  }
  
  lessons.forEach(lesson => {
    addToPath(lesson._id.toString());
  });
  
  return path;
};

// Instance method to check if user can access lesson
lessonSchema.methods.canUserAccess = async function(userId) {
  if (this.prerequisites.length === 0) return true;
  
  const Progress = mongoose.model('Progress');
  
  try {
    // Check if all prerequisites are completed
    const completedLessons = await Progress.find({
      userId,
      activityType: 'lesson',
      score: { $gte: 70 } // Minimum passing score
    }).distinct('metadata.lessonId');
    
    const completedSet = new Set(completedLessons.map(id => id ? id.toString() : ''));
    
    return this.prerequisites.every(prereq => 
      completedSet.has(prereq.toString())
    );
  } catch (error) {
    console.error('Error checking lesson access:', error);
    // For development, allow access if there's an error
    return true;
  }
};

// Instance method to update completion stats
lessonSchema.methods.updateCompletionStats = function(timeSpent, score, completed) {
  this.completionStats.totalAttempts += 1;
  
  if (completed) {
    this.completionStats.totalCompletions += 1;
  }
  
  // Update average time
  const totalTime = this.completionStats.averageTime * (this.completionStats.totalAttempts - 1) + timeSpent;
  this.completionStats.averageTime = Math.round(totalTime / this.completionStats.totalAttempts);
  
  // Update average score
  if (score !== null && score !== undefined) {
    const totalScore = this.completionStats.averageScore * (this.completionStats.totalAttempts - 1) + score;
    this.completionStats.averageScore = Math.round(totalScore / this.completionStats.totalAttempts);
  }
  
  return this.save();
};

// Static method to get recommended lessons for user
lessonSchema.statics.getRecommendedLessons = async function(userId, limit = 5) {
  const Progress = mongoose.model('Progress');
  
  // Get user's completed lessons and topics
  const userProgress = await Progress.find({
    userId,
    activityType: 'lesson'
  }).sort({ completedAt: -1 });
  
  const completedLessonIds = userProgress
    .filter(p => p.score >= 70)
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
  const recommendedLessons = await this.find({
    _id: { $nin: completedLessonIds },
    isActive: true
  })
  .populate('prerequisites')
  .limit(limit * 2); // Get more to filter
  
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

module.exports = mongoose.model('Lesson', lessonSchema);