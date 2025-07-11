require('dotenv').config();
const mongoose = require('mongoose');
const { Lesson } = require('../src/models');
const connectDB = require('../src/config/database');

// Template configurations - each template can be used for multiple lesson types
const templateConfigs = [
  {
    templatePath: 'donut_algebra_tutorial_v2.html',
    baseTitle: 'Donut Algebra - Combining Like Terms',
    topic: 'algebra',
    subtopic: 'like-terms',
    description: 'Learn to combine like terms using fun donut examples',
    lessons: [
      {
        type: 'tutorial',
        title: 'Donut Algebra Tutorial - Combining Like Terms',
        difficulty: 'beginner',
        xpReward: 15,
        estimatedTime: 20,
        tags: ['tutorial', 'like-terms', 'interactive', 'visual-learning'],
        order: 1
      },
      {
        type: 'examples',
        title: 'Donut Algebra Examples - Practice Problems',
        difficulty: 'beginner',
        xpReward: 10,
        estimatedTime: 15,
        tags: ['examples', 'like-terms', 'practice'],
        order: 2
      },
      {
        type: 'worksheet',
        title: 'Donut Algebra Worksheet - Like Terms',
        difficulty: 'intermediate',
        xpReward: 20,
        estimatedTime: 30,
        tags: ['worksheet', 'like-terms', 'exercises'],
        order: 3
      },
      {
        type: 'revision',
        title: 'Donut Algebra Revision - Quick Review',
        difficulty: 'beginner',
        xpReward: 8,
        estimatedTime: 10,
        tags: ['revision', 'like-terms', 'review'],
        order: 4
      }
    ]
  },
  {
    templatePath: 'algebra-balance-final option 4.html',
    baseTitle: 'Algebra Balance - Solving Equations',
    topic: 'algebra',
    subtopic: 'equations',
    description: 'Master equation solving with our interactive balance scale',
    lessons: [
      {
        type: 'tutorial',
        title: 'Algebra Balance Tutorial - Solving Equations',
        difficulty: 'intermediate',
        xpReward: 20,
        estimatedTime: 25,
        tags: ['tutorial', 'equations', 'balance', 'interactive'],
        order: 5
      },
      {
        type: 'examples',
        title: 'Algebra Balance Examples - Equation Solutions',
        difficulty: 'intermediate',
        xpReward: 15,
        estimatedTime: 20,
        tags: ['examples', 'equations', 'step-by-step'],
        order: 6
      },
      {
        type: 'worksheet',
        title: 'Algebra Balance Worksheet - Practice Equations',
        difficulty: 'intermediate',
        xpReward: 25,
        estimatedTime: 35,
        tags: ['worksheet', 'equations', 'practice'],
        order: 7
      },
      {
        type: 'revision',
        title: 'Algebra Balance Revision - Equation Review',
        difficulty: 'intermediate',
        xpReward: 12,
        estimatedTime: 15,
        tags: ['revision', 'equations', 'review'],
        order: 8
      }
    ]
  },
  {
    templatePath: 'enhanced_algebra_balance_v2.html',
    baseTitle: 'Enhanced Algebra Balance - Advanced Equations',
    topic: 'algebra',
    subtopic: 'advanced-equations',
    description: 'Advanced equation solving with enhanced visual feedback',
    lessons: [
      {
        type: 'tutorial',
        title: 'Enhanced Algebra Tutorial - Advanced Techniques',
        difficulty: 'advanced',
        xpReward: 30,
        estimatedTime: 30,
        tags: ['tutorial', 'advanced', 'equations', 'visual-learning'],
        order: 9
      },
      {
        type: 'examples',
        title: 'Enhanced Algebra Examples - Complex Problems',
        difficulty: 'advanced',
        xpReward: 20,
        estimatedTime: 25,
        tags: ['examples', 'advanced', 'complex-equations'],
        order: 10
      },
      {
        type: 'worksheet',
        title: 'Enhanced Algebra Worksheet - Challenge Problems',
        difficulty: 'advanced',
        xpReward: 35,
        estimatedTime: 40,
        tags: ['worksheet', 'advanced', 'challenges'],
        order: 11
      },
      {
        type: 'revision',
        title: 'Enhanced Algebra Revision - Master Review',
        difficulty: 'advanced',
        xpReward: 15,
        estimatedTime: 20,
        tags: ['revision', 'advanced', 'comprehensive-review'],
        order: 12
      }
    ]
  }
];

async function seedTemplates() {
  try {
    await connectDB();
    console.log('🌱 Starting template seeding...');
    
    let totalCreated = 0;
    let totalSkipped = 0;
    
    for (const config of templateConfigs) {
      console.log(`\n📚 Processing template: ${config.baseTitle}`);
      
      for (const lessonData of config.lessons) {
        const lessonTitle = lessonData.title;
        
        // Check if lesson already exists
        const existingLesson = await Lesson.findOne({ title: lessonTitle });
        
        if (existingLesson) {
          console.log(`  ⏭️  Skipping "${lessonTitle}" - already exists`);
          totalSkipped++;
          continue;
        }
        
        // Create new lesson
        const newLesson = new Lesson({
          title: lessonTitle,
          topic: config.topic,
          subtopic: config.subtopic,
          difficulty: lessonData.difficulty,
          description: `${config.description} (${lessonData.type})`,
          templatePath: config.templatePath,
          xpReward: lessonData.xpReward,
          estimatedTime: lessonData.estimatedTime,
          tags: lessonData.tags,
          order: lessonData.order,
          isActive: true,
          resources: [
            {
              title: 'Interactive Template',
              type: lessonData.type === 'tutorial' ? 'article' : 
                    lessonData.type === 'examples' ? 'exercise' : 
                    lessonData.type === 'worksheet' ? 'quiz' : 'article',
              description: `Interactive ${lessonData.type} for ${config.subtopic}`
            }
          ]
        });
        
        await newLesson.save();
        console.log(`  ✅ Created "${lessonTitle}" - ${lessonData.xpReward} XP`);
        totalCreated++;
      }
    }
    
    // Set up prerequisites
    console.log('\n🔗 Setting up prerequisites...');
    
    // Make tutorials prerequisites for examples
    // Make examples prerequisites for worksheets
    // Revisions have no prerequisites
    
    for (const config of templateConfigs) {
      const lessons = await Lesson.find({ 
        topic: config.topic,
        subtopic: config.subtopic 
      }).sort('order');
      
      const tutorial = lessons.find(l => l.tags.includes('tutorial'));
      const examples = lessons.find(l => l.tags.includes('examples'));
      const worksheet = lessons.find(l => l.tags.includes('worksheet'));
      
      if (examples && tutorial) {
        examples.prerequisites = [tutorial._id];
        await examples.save();
        console.log(`  📎 ${examples.title} requires ${tutorial.title}`);
      }
      
      if (worksheet && examples) {
        worksheet.prerequisites = [examples._id];
        await worksheet.save();
        console.log(`  📎 ${worksheet.title} requires ${examples.title}`);
      }
    }
    
    // Also set cross-topic prerequisites
    console.log('\n🔗 Setting cross-topic prerequisites...');
    
    // Donut Algebra (like-terms) is prerequisite for Algebra Balance (equations)
    const donutTutorial = await Lesson.findOne({ 
      title: 'Donut Algebra Tutorial - Combining Like Terms' 
    });
    const balanceTutorial = await Lesson.findOne({ 
      title: 'Algebra Balance Tutorial - Solving Equations' 
    });
    
    if (balanceTutorial && donutTutorial) {
      balanceTutorial.prerequisites = [donutTutorial._id];
      await balanceTutorial.save();
      console.log(`  📎 ${balanceTutorial.title} requires ${donutTutorial.title}`);
    }
    
    // Algebra Balance is prerequisite for Enhanced Algebra Balance
    const enhancedTutorial = await Lesson.findOne({ 
      title: 'Enhanced Algebra Tutorial - Advanced Techniques' 
    });
    
    if (enhancedTutorial && balanceTutorial) {
      enhancedTutorial.prerequisites = [balanceTutorial._id];
      await enhancedTutorial.save();
      console.log(`  📎 ${enhancedTutorial.title} requires ${balanceTutorial.title}`);
    }
    
    console.log(`\n✨ Template seeding completed!`);
    console.log(`   Created: ${totalCreated} lessons`);
    console.log(`   Skipped: ${totalSkipped} lessons`);
    
    // Show lesson summary
    const allLessons = await Lesson.find().sort({ topic: 1, order: 1 });
    console.log('\n📊 Total lessons in database:', allLessons.length);
    
    const byType = {};
    allLessons.forEach(lesson => {
      lesson.tags.forEach(tag => {
        if (['tutorial', 'examples', 'worksheet', 'revision'].includes(tag)) {
          byType[tag] = (byType[tag] || 0) + 1;
        }
      });
    });
    
    console.log('\n📈 Lessons by type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

seedTemplates();