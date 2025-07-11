# Creating a Math Learning Platform

## Overview
This guide outlines how to create a math learning platform similar to the existing site, with enhanced features for tracking XP, lessons, revisions, and examples from HTML templates.

## Architecture Requirements

### Database Schema Updates

#### User Model Enhancement
```javascript
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  achievements: [{
    name: String,
    description: String,
    earnedAt: Date,
    xpAwarded: Number
  }],
  createdAt: { type: Date, default: Date.now }
});
```

#### Progress Model Enhancement
```javascript
const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  activityType: { 
    type: String, 
    enum: ['practice', 'lesson', 'revision', 'example'],
    required: true 
  },
  topic: { type: String, required: true },
  subtopic: String,
  score: Number,
  totalQuestions: Number,
  correctAnswers: Number,
  timeSpent: Number, // in seconds
  xpEarned: { type: Number, default: 0 },
  completedAt: { type: Date, default: Date.now },
  metadata: mongoose.Schema.Types.Mixed // For storing activity-specific data
});
```

#### Lesson Model
```javascript
const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  topic: { type: String, required: true },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
  content: { type: String, required: true }, // HTML content from templates
  xpReward: { type: Number, default: 10 },
  prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  order: Number
});
```

### API Endpoints

#### XP and Progress Endpoints
```
POST /api/xp/award
  - Award XP for completed activities
  - Body: { userId, activityType, xpAmount, metadata }

GET /api/user/stats
  - Get user XP, level, and achievements
  - Returns: { xp, level, achievements, recentProgress }

POST /api/progress/activity
  - Record any learning activity (practice, lesson, revision, example)
  - Body: { activityType, topic, score, timeSpent, metadata }

GET /api/progress/detailed
  - Get detailed progress by activity type
  - Query params: ?type=practice&topic=multiplication
```

#### Lesson Management
```
GET /api/lessons
  - Get all available lessons
  - Query params: ?topic=multiplication&difficulty=beginner

GET /api/lessons/:id
  - Get specific lesson content

POST /api/lessons/:id/complete
  - Mark lesson as completed and award XP

GET /api/revisions/:topic
  - Get revision materials for a topic

GET /api/examples/:topic
  - Get example problems for a topic
```

### Frontend Structure

#### Enhanced Pages
```
public/
├── dashboard.html          # User dashboard with XP and progress
├── lessons/
│   ├── index.html         # Lesson listing
│   └── viewer.html        # Lesson content viewer
├── practice/
│   ├── index.html         # Practice topic selection
│   └── [topic].html       # Topic-specific practice
├── revisions/
│   └── index.html         # Revision materials
├── examples/
│   └── index.html         # Example problems
└── progress/
    └── detailed.html      # Detailed progress view
```

### Template Integration

#### Math_teaching_templates Structure
```
Math_teaching_templates/
├── lessons/
│   ├── multiplication/
│   │   ├── intro.html
│   │   ├── single-digit.html
│   │   └── multi-digit.html
│   ├── division/
│   └── fractions/
├── practice/
│   ├── multiplication/
│   ├── division/
│   └── fractions/
├── revisions/
│   └── [topics]/
└── examples/
    └── [topics]/
```

#### Template Processing
```javascript
// Template loader utility
const loadTemplate = async (category, topic, filename) => {
  const templatePath = path.join('Math_teaching_templates', category, topic, filename);
  const content = await fs.readFile(templatePath, 'utf8');
  
  // Process template to inject XP tracking
  return injectXPTracking(content);
};

// XP tracking injection
const injectXPTracking = (htmlContent) => {
  // Add data attributes for XP calculation
  // Add completion tracking scripts
  return processedContent;
};
```

### XP System Implementation

#### XP Calculation
```javascript
const calculateXP = (activity) => {
  const baseXP = {
    practice: 5,
    lesson: 10,
    revision: 7,
    example: 3
  };
  
  let xp = baseXP[activity.type];
  
  // Bonus for perfect score
  if (activity.score === 100) xp *= 1.5;
  
  // Time bonus
  if (activity.timeSpent < activity.expectedTime) xp *= 1.2;
  
  // Streak bonus
  if (activity.streak > 5) xp *= 1.1;
  
  return Math.floor(xp);
};
```

#### Level System
```javascript
const calculateLevel = (totalXP) => {
  // Level = floor(sqrt(totalXP / 100))
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
};

const getXPForNextLevel = (currentLevel) => {
  return Math.pow(currentLevel, 2) * 100;
};
```

### Progress Tracking Enhancement

#### Activity Recording
```javascript
// Client-side activity tracker
class ActivityTracker {
  constructor() {
    this.startTime = Date.now();
    this.answers = [];
  }
  
  recordAnswer(question, answer, isCorrect) {
    this.answers.push({ question, answer, isCorrect, timestamp: Date.now() });
  }
  
  async submitActivity(type, topic) {
    const timeSpent = (Date.now() - this.startTime) / 1000;
    const correct = this.answers.filter(a => a.isCorrect).length;
    const score = (correct / this.answers.length) * 100;
    
    const response = await fetch('/api/progress/activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        activityType: type,
        topic: topic,
        score: score,
        totalQuestions: this.answers.length,
        correctAnswers: correct,
        timeSpent: timeSpent,
        metadata: { answers: this.answers }
      })
    });
    
    const result = await response.json();
    return result.xpEarned;
  }
}
```

#### Progress Visualization
```javascript
// Progress chart component
const renderProgressChart = (progressData) => {
  const ctx = document.getElementById('progressChart').getContext('2d');
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: progressData.map(p => new Date(p.completedAt).toLocaleDateString()),
      datasets: [{
        label: 'Score',
        data: progressData.map(p => p.score),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }, {
        label: 'XP Earned',
        data: progressData.map(p => p.xpEarned),
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1
      }]
    }
  });
};
```

### Implementation Steps

1. **Database Setup**
   - Create new schemas for enhanced progress tracking
   - Migrate existing user data to include XP fields
   - Set up indexes for performance

2. **Backend API Development**
   - Implement XP calculation logic
   - Create endpoints for activity tracking
   - Add lesson management APIs
   - Implement achievement system

3. **Template Processing**
   - Create template loader utility
   - Build XP tracking injection system
   - Process Math_teaching_templates content

4. **Frontend Development**
   - Build dashboard with XP display
   - Create activity tracking system
   - Implement progress visualization
   - Add lesson viewer with completion tracking

5. **Integration**
   - Connect practice sessions to XP system
   - Link lessons to progress tracking
   - Implement revision tracking
   - Add example problem completion

### Security Considerations

- Validate XP calculations server-side
- Prevent XP farming through rate limiting
- Secure activity submission endpoints
- Implement anti-cheat measures

### Performance Optimization

- Cache processed templates
- Implement pagination for progress data
- Use database indexes for quick lookups
- Optimize XP calculation queries

### Testing Strategy

- Unit tests for XP calculations
- Integration tests for API endpoints
- E2E tests for activity tracking
- Performance tests for progress queries