const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GameSession = sequelize.define('GameSession', {
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
  gameType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'tower-defense'
  },
  lastPlayedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  lastXPSnapshot: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'User XP at the time of last play'
  },
  totalCoinsUsed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total coins used across all sessions'
  }
}, {
  timestamps: true,
  tableName: 'game_sessions',
  indexes: [
    {
      unique: true,
      fields: ['userId', 'gameType']
    }
  ]
});

module.exports = GameSession;