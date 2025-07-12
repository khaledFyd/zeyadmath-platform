const { Sequelize } = require('sequelize');
const config = require('./config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

let sequelize;

if (dbConfig.use_env_variable) {
  sequelize = new Sequelize(process.env[dbConfig.use_env_variable], dbConfig);
} else {
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    dbConfig
  );
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Connected Successfully');

    // Sync models - create tables if they don't exist
    // Using force: false to avoid dropping existing tables
    await sequelize.sync({ force: false });
    console.log('Database synced - tables created if not exist');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await sequelize.close();
      console.log('PostgreSQL connection closed through app termination');
      process.exit(0);
    });
  } catch (error) {
    console.error(`Error connecting to PostgreSQL:`, error);
    console.error('Full error details:', error.stack);
    process.exit(1);
  }
};

module.exports = { connectDB, sequelize };