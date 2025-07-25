const { sequelize } = require('../config/database');
const User = require('./User');
const Progress = require('./Progress');
const Lesson = require('./Lesson');
const GameSession = require('./GameSession');

// Set up associations
User.hasMany(Progress, { foreignKey: 'userId' });
Progress.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(GameSession, { foreignKey: 'userId' });
GameSession.belongsTo(User, { foreignKey: 'userId' });

// Sync models (use migrations in production)
const syncModels = async () => {
  try {
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Models synced successfully');
    }
  } catch (error) {
    console.error('Error syncing models:', error);
  }
};

module.exports = {
  User,
  Progress,
  Lesson,
  GameSession,
  sequelize,
  syncModels
};