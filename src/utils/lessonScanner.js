const fs = require('fs').promises;
const path = require('path');

// Configuration for lesson types and their properties
const LESSON_TYPES = {
  tutorial: {
    xpReward: 20,
    estimatedTime: 20,
    difficulty: 'beginner',
    icon: '📖'
  },
  examples: {
    xpReward: 15,
    estimatedTime: 15,
    difficulty: 'beginner',
    icon: '💡'
  },
  worksheet: {
    xpReward: 25,
    estimatedTime: 30,
    difficulty: 'intermediate',
    icon: '📝'
  },
  revision: {
    xpReward: 10,
    estimatedTime: 10,
    difficulty: 'beginner',
    icon: '🔄'
  }
};

// Extract lesson info from filename
function parseLessonFromFilename(filename) {
  // Remove .html extension
  const name = filename.replace('.html', '');
  
  // Try to extract type from filename
  let type = 'tutorial'; // default
  let title = name;
  
  // Check if filename contains type keywords
  for (const lessonType of Object.keys(LESSON_TYPES)) {
    if (name.toLowerCase().includes(lessonType)) {
      type = lessonType;
      break;
    }
  }
  
  // Clean up title - replace hyphens/underscores with spaces
  title = title
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Extract topic from title
  let topic = 'algebra'; // default
  if (title.toLowerCase().includes('donut')) topic = 'algebra-basics';
  else if (title.toLowerCase().includes('balance')) topic = 'equations';
  else if (title.toLowerCase().includes('fraction')) topic = 'fractions';
  else if (title.toLowerCase().includes('multiplication')) topic = 'multiplication';
  
  return {
    filename,
    title,
    type,
    topic,
    ...LESSON_TYPES[type]
  };
}

// Scan directory for HTML files
async function scanLessonsDirectory() {
  const templatesDir = path.join(process.cwd(), 'Math_teaching_templates');
  
  try {
    // Read all files in the directory
    const files = await fs.readdir(templatesDir);
    
    // Filter HTML files and parse lesson info
    const lessons = files
      .filter(file => file.endsWith('.html'))
      .map(file => ({
        id: file.replace('.html', '').replace(/[^a-zA-Z0-9]/g, '_'),
        ...parseLessonFromFilename(file),
        path: `/templates/${file}`
      }));
    
    // Group by topic
    const lessonsByTopic = {};
    lessons.forEach(lesson => {
      if (!lessonsByTopic[lesson.topic]) {
        lessonsByTopic[lesson.topic] = [];
      }
      lessonsByTopic[lesson.topic].push(lesson);
    });
    
    return {
      lessons,
      lessonsByTopic,
      topics: Object.keys(lessonsByTopic)
    };
  } catch (error) {
    console.error('Error scanning lessons directory:', error);
    return {
      lessons: [],
      lessonsByTopic: {},
      topics: []
    };
  }
}

// Get user's progress for lessons (from Progress collection)
async function getLessonProgress(userId) {
  try {
    const Progress = require('../models').Progress;
    
    // Get all lesson completions for user
    const progressRecords = await Progress.find({
      userId,
      activityType: 'lesson'
    }).lean();
    
    // Create a map of lesson ID to progress
    const progressMap = {};
    progressRecords.forEach(record => {
      const lessonId = record.metadata?.lessonId || record.topic;
      progressMap[lessonId] = {
        completed: record.score >= 70,
        score: record.score,
        xpEarned: record.xpEarned,
        completedAt: record.completedAt
      };
    });
    
    return progressMap;
  } catch (error) {
    console.error('Error getting lesson progress:', error);
    return {};
  }
}

module.exports = {
  scanLessonsDirectory,
  getLessonProgress,
  LESSON_TYPES
};