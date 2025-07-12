require('dotenv').config();
const { User, Lesson, Progress, sequelize } = require('../src/models');
const { connectDB } = require('../src/config/database');

async function completeBasicLessons() {
  try {
    await connectDB();
    console.log('Connected to database');
    
    // Find demo user
    const user = await User.findOne({ where: { email: 'demo@zeyadmath.com' } });
    if (!user) {
      console.error('Demo user not found!');
      process.exit(1);
    }
    
    console.log('Found user:', user.username);
    
    // Find basic lessons (no prerequisites)
    const basicLessons = await Lesson.findAll({ 
      where: { 
        prerequisites: [],
        isActive: true 
      }
    });
    
    console.log(`Found ${basicLessons.length} basic lessons`);
    
    // Complete each basic lesson
    for (const lesson of basicLessons) {
      console.log(`Completing lesson: ${lesson.title}`);
      
      // Check if already completed
      const existing = await Progress.findOne({
        where: {
          userId: user.id,
          activityType: 'lesson'
        }
      });
      
      // Check if this lesson was already completed
      if (existing && existing.metadata && existing.metadata.lessonId === lesson.id) {
      
        console.log('  - Already completed');
        continue;
      }
      
      // Create progress record
      const progress = await Progress.create({
        userId: user.id,
        activityType: 'lesson',
        topic: lesson.topic,
        subtopic: lesson.subtopic,
        score: 100,
        totalQuestions: 10,
        correctAnswers: 10,
        timeSpent: 300, // 5 minutes
        xpEarned: lesson.xpReward,
        difficulty: lesson.difficulty,
        metadata: {
          lessonId: lesson.id,
          lessonTitle: lesson.title
        }
      });
      
      // Update user XP
      user.xp += lesson.xpReward;
      user.level = user.calculateLevel();
      
      console.log(`  - Completed! Earned ${lesson.xpReward} XP`);
    }
    
    // Save user
    await user.save();
    console.log(`\nUser now has ${user.xp} XP and is level ${user.level}`);
    
    // Show which lessons are now accessible
    const allLessons = await Lesson.findAll({ 
      where: { isActive: true },
      include: [{
        model: Lesson,
        as: 'prerequisiteLessons',
        through: { attributes: [] }
      }]
    });
    console.log('\nAccessible lessons:');
    
    for (const lesson of allLessons) {
      const canAccess = await lesson.canUserAccess(user.id);
      console.log(`- ${lesson.title}: ${canAccess ? '✅ Accessible' : '🔒 Locked'}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

completeBasicLessons();