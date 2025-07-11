const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  xp: { 
    type: Number, 
    default: 0,
    min: [0, 'XP cannot be negative']
  },
  level: { 
    type: Number, 
    default: 1,
    min: [1, 'Level must be at least 1']
  },
  achievements: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    earnedAt: {
      type: Date,
      default: Date.now
    },
    xpAwarded: {
      type: Number,
      default: 0
    }
  }],
  streakCount: {
    type: Number,
    default: 0
  },
  lastActivityDate: {
    type: Date
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ level: -1, xp: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      username: this.username,
      email: this.email 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Calculate level based on XP
userSchema.methods.calculateLevel = function() {
  return Math.floor(Math.sqrt(this.xp / 100)) + 1;
};

// Get XP required for next level
userSchema.methods.getXPForNextLevel = function() {
  return Math.pow(this.level, 2) * 100;
};

// Add achievement
userSchema.methods.addAchievement = function(achievement) {
  this.achievements.push(achievement);
  this.xp += achievement.xpAwarded || 0;
  this.level = this.calculateLevel();
  return this.save();
};

// Update streak
userSchema.methods.updateStreak = function() {
  const now = new Date();
  const lastActivity = this.lastActivityDate;
  
  if (!lastActivity) {
    this.streakCount = 1;
  } else {
    const daysSinceLastActivity = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastActivity === 0) {
      // Same day, don't update streak
      return;
    } else if (daysSinceLastActivity === 1) {
      // Consecutive day
      this.streakCount += 1;
    } else {
      // Streak broken
      this.streakCount = 1;
    }
  }
  
  this.lastActivityDate = now;
};

module.exports = mongoose.model('User', userSchema);