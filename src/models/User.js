const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    validate: {
      len: {
        args: [3, 30],
        msg: 'Username must be between 3 and 30 characters'
      }
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: {
        msg: 'Please provide a valid email'
      }
    },
    set(value) {
      this.setDataValue('email', value.toLowerCase().trim());
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [6, 255],
        msg: 'Password must be at least 6 characters'
      }
    }
  },
  xp: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: {
        args: [0],
        msg: 'XP cannot be negative'
      }
    }
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: {
        args: [1],
        msg: 'Level must be at least 1'
      }
    }
  },
  achievements: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  streakCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastActivityDate: {
    type: DataTypes.DATE
  }
}, {
  timestamps: true,
  defaultScope: {
    attributes: { exclude: ['password'] }
  },
  scopes: {
    withPassword: {
      attributes: { include: ['password'] }
    }
  },
  indexes: [
    {
      fields: ['email']
    },
    {
      fields: ['username']
    },
    {
      fields: ['level', 'xp']
    }
  ]
});

// Hash password before saving
User.beforeSave(async (user) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

// Instance methods
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this.id, 
      username: this.username,
      email: this.email 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

User.prototype.calculateLevel = function() {
  return Math.floor(Math.sqrt(this.xp / 100)) + 1;
};

User.prototype.getXPForNextLevel = function() {
  return Math.pow(this.level, 2) * 100;
};

User.prototype.addAchievement = async function(achievement) {
  const achievements = this.achievements || [];
  achievements.push({
    ...achievement,
    earnedAt: achievement.earnedAt || new Date()
  });
  
  this.achievements = achievements;
  this.xp += achievement.xpAwarded || 0;
  this.level = this.calculateLevel();
  
  return await this.save();
};

User.prototype.updateStreak = function() {
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

module.exports = User;