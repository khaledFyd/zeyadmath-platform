const { User, sequelize } = require('../models');
const { Op } = require('sequelize');
const os = require('os');

// Test model for database health check
const DiagnosticTest = sequelize.define('DiagnosticTest', {
  testData: {
    type: sequelize.Sequelize.STRING,
    allowNull: false
  },
  testTimestamp: {
    type: sequelize.Sequelize.DATE,
    defaultValue: sequelize.Sequelize.NOW
  }
}, {
  tableName: 'diagnostic_tests',
  timestamps: true
});

// Get system diagnostics (public endpoint - no auth required)
const getSystemDiagnostics = async (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    server: {},
    database: {},
    users: {},
    system: {},
    environment: {}
  };

  try {
    // Server diagnostics
    diagnostics.server = {
      status: 'online',
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB'
      }
    };

    // System diagnostics
    diagnostics.system = {
      hostname: os.hostname(),
      type: os.type(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
      freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + ' GB',
      cpus: os.cpus().length,
      loadAverage: os.loadavg()
    };

    // Environment info
    diagnostics.environment = {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000,
      databaseType: 'PostgreSQL'
    };

    // Database health check
    let dbStatus = 'unknown';
    let dbLatency = 0;
    let dbOperations = {
      write: false,
      read: false,
      delete: false
    };

    try {
      // Ensure test table exists
      await DiagnosticTest.sync();
      
      const startTime = Date.now();
      
      // Test 1: Write
      const writeStart = Date.now();
      const testRecord = await DiagnosticTest.create({ 
        testData: `Diagnostic test ${Date.now()}` 
      });
      dbOperations.write = Date.now() - writeStart;
      
      // Test 2: Read
      const readStart = Date.now();
      const readRecord = await DiagnosticTest.findByPk(testRecord.id);
      dbOperations.read = Date.now() - readStart;
      
      // Test 3: Delete
      const deleteStart = Date.now();
      await testRecord.destroy();
      dbOperations.delete = Date.now() - deleteStart;
      
      dbLatency = Date.now() - startTime;
      dbStatus = 'healthy';
      
      // Clean up old test records (older than 1 hour)
      await DiagnosticTest.destroy({
        where: {
          createdAt: {
            [Op.lt]: new Date(Date.now() - 60 * 60 * 1000)
          }
        }
      });
    } catch (error) {
      console.error('Database health check failed:', error);
      dbStatus = 'unhealthy';
      dbOperations.error = error.message;
    }

    diagnostics.database = {
      status: dbStatus,
      latency: `${dbLatency}ms`,
      operations: dbOperations,
      type: sequelize.options.dialect,
      host: sequelize.options.host || 'localhost'
    };

    // User statistics
    try {
      // Total users
      const totalUsers = await User.count();
      
      // Active users (activity in last 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const activeUsers = await User.count({
        where: {
          lastActivityDate: {
            [Op.gte]: thirtyMinutesAgo
          }
        }
      });

      // Recently logged in users (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentlyActiveUsers = await User.findAll({
        where: {
          lastActivityDate: {
            [Op.gte]: fiveMinutesAgo
          }
        },
        attributes: ['username', 'lastActivityDate'],
        order: [['lastActivityDate', 'DESC']],
        limit: 10
      });

      // User growth (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const newUsersToday = await User.count({
        where: {
          createdAt: {
            [Op.gte]: oneDayAgo
          }
        }
      });

      diagnostics.users = {
        total: totalUsers,
        activeNow: activeUsers,
        recentlyActive: recentlyActiveUsers.map(u => ({
          username: u.username,
          lastSeen: u.lastActivityDate
        })),
        newToday: newUsersToday,
        status: totalUsers > 0 ? 'operational' : 'no users'
      };
    } catch (error) {
      console.error('User statistics error:', error);
      diagnostics.users = {
        status: 'error',
        error: error.message
      };
    }

    // Overall health status
    diagnostics.overall = {
      healthy: dbStatus === 'healthy' && diagnostics.server.status === 'online',
      message: dbStatus === 'healthy' 
        ? 'All systems operational' 
        : 'Some systems may be experiencing issues'
    };

    res.json({
      success: true,
      diagnostics
    });

  } catch (error) {
    console.error('Diagnostics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error generating diagnostics',
      diagnostics: {
        ...diagnostics,
        error: error.message,
        overall: {
          healthy: false,
          message: 'Diagnostics check failed'
        }
      }
    });
  }
};

module.exports = {
  getSystemDiagnostics
};