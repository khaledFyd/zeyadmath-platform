const { User, sequelize } = require('../models');
const { Op } = require('sequelize');

// Test model for database health check
const TestRecord = sequelize.define('TestRecord', {
  testData: {
    type: sequelize.Sequelize.STRING,
    allowNull: false
  }
}, {
  tableName: 'test_records',
  timestamps: true
});

// Get site status (demo user only)
const getSiteStatus = async (req, res) => {
  try {
    // Check if user is demo user
    const user = await User.findByPk(req.userId);
    if (!user || user.email !== 'demo@zeyadmath.com') {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied. This feature is only available for demo users.' 
      });
    }

    const status = {
      server: 'online',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    };

    // Database health check
    let dbStatus = 'unknown';
    let dbLatency = 0;
    try {
      const startTime = Date.now();
      
      // Ensure test table exists
      await TestRecord.sync();
      
      // Write test
      const testRecord = await TestRecord.create({ 
        testData: `Health check ${Date.now()}` 
      });
      
      // Read test
      const readRecord = await TestRecord.findByPk(testRecord.id);
      
      // Delete test
      await testRecord.destroy();
      
      dbLatency = Date.now() - startTime;
      dbStatus = 'healthy';
    } catch (error) {
      console.error('Database health check failed:', error);
      dbStatus = 'unhealthy';
    }

    status.database = {
      status: dbStatus,
      latency: `${dbLatency}ms`,
      type: sequelize.options.dialect
    };

    // Get logged in users count (users active in last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const activeUsersCount = await User.count({
      where: {
        lastActivityDate: {
          [Op.gte]: thirtyMinutesAgo
        }
      }
    });

    // Get total users count
    const totalUsersCount = await User.count();

    status.users = {
      totalRegistered: totalUsersCount,
      activeNow: activeUsersCount,
      demoUserActive: true
    };

    // Get some basic stats
    const stats = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT user_id) as unique_learners,
        COUNT(*) as total_activities,
        SUM(xp_earned) as total_xp_earned
      FROM progress
    `, { type: sequelize.QueryTypes.SELECT });

    status.platformStats = {
      uniqueLearners: stats[0]?.unique_learners || 0,
      totalActivities: stats[0]?.total_activities || 0,
      totalXPEarned: stats[0]?.total_xp_earned || 0
    };

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Get site status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching site status' 
    });
  }
};

module.exports = {
  getSiteStatus
};