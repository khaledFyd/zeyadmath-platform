require('dotenv').config();
const mongoose = require('mongoose');
const { User, Lesson, Progress } = require('../src/models');
const connectDB = require('../src/config/database');

async function completeBasicLessons() {
  try {
    await connectDB();
    console.log('Connected to database');
    
    // Find demo user
    const user = await User.findOne({ email: 'demo@zeyadmath.com' });
    if (!user) {
      console.error('Demo user not found!');
      process.exit(1);
    }
    
    console.log('Found user:', user.username);
    
    // Find basic lessons (no prerequisites)
    const basicLessons = await Lesson.find({ 
      prerequisites: { $size: 0 },
      isActive: true 
    });
    
    console.log(`Found ${basicLessons.length} basic lessons`);
    
    // Complete each basic lesson
    for (const lesson of basicLessons) {
      console.log(`Completing lesson: ${lesson.title}`);
      
      // Check if already completed
      const existing = await Progress.findOne({
        userId: user._id,
        activityType: 'lesson',
        'metadata.lessonId': lesson._id
      });
      
      if (existing) {
        console.log('  - Already completed');
        continue;
      }
      
      // Create progress record
      const progress = new Progress({
        userId: user._id,
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
          lessonId: lesson._id,
          lessonTitle: lesson.title
        }
      });
      
      await progress.save();
      
      // Update user XP
      user.xp += lesson.xpReward;
      user.level = user.calculateLevel();
      
      console.log(`  - Completed! Earned ${lesson.xpReward} XP`);
    }
    
    // Save user
    await user.save();
    console.log(`\nUser now has ${user.xp} XP and is level ${user.level}`);
    
    // Show which lessons are now accessible
    const allLessons = await Lesson.find({ isActive: true }).populate('prerequisites');
    console.log('\nAccessible lessons:');
    
    for (const lesson of allLessons) {
      const canAccess = await lesson.canUserAccess(user._id);
      console.log(`- ${lesson.title}: ${canAccess ? '✅ Accessible' : '🔒 Locked'}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

completeBasicLessons();