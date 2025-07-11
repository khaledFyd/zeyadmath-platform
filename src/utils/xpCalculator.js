const calculateXP = (activity) => {
  // Base XP for different activity types
  const baseXP = {
    practice: 5,
    lesson: 10,
    revision: 7,
    example: 3
  };
  
  let xp = baseXP[activity.type] || 5;
  
  // Apply multiplier from environment
  const multiplier = parseFloat(process.env.XP_MULTIPLIER) || 1;
  xp *= multiplier;
  
  // Bonus for perfect score (50% bonus)
  if (activity.score === 100) {
    xp *= 1.5;
  }
  // Bonus for high score (20% bonus)
  else if (activity.score >= 90) {
    xp *= 1.2;
  }
  // Bonus for good score (10% bonus)
  else if (activity.score >= 80) {
    xp *= 1.1;
  }
  
  // Time bonus - if completed faster than expected
  if (activity.timeSpent && activity.expectedTime) {
    const timeRatio = activity.timeSpent / activity.expectedTime;
    
    if (timeRatio < 0.5) {
      // Completed in less than half the expected time (30% bonus)
      xp *= 1.3;
    } else if (timeRatio < 0.75) {
      // Completed in less than 75% of expected time (15% bonus)
      xp *= 1.15;
    } else if (timeRatio < 1) {
      // Completed faster than expected (5% bonus)
      xp *= 1.05;
    }
  }
  
  // Streak bonus
  const streakThreshold = parseInt(process.env.STREAK_BONUS_THRESHOLD) || 5;
  if (activity.streak >= streakThreshold) {
    // 2% bonus per streak day above threshold, max 20%
    const streakBonus = Math.min(0.2, (activity.streak - streakThreshold + 1) * 0.02);
    xp *= (1 + streakBonus);
  }
  
  // Difficulty multiplier
  const difficultyMultipliers = {
    beginner: 1,
    intermediate: 1.5,
    advanced: 2
  };
  
  if (activity.difficulty && difficultyMultipliers[activity.difficulty]) {
    xp *= difficultyMultipliers[activity.difficulty];
  }
  
  // First completion bonus
  if (activity.firstCompletion) {
    xp *= 1.5;
  }
  
  // Round to nearest integer
  return Math.floor(xp);
};

// Achievement definitions
const achievements = [
  // Streak achievements
  {
    id: 'streak_3',
    name: 'Consistent Learner',
    description: 'Complete activities 3 days in a row',
    condition: (user) => user.streakCount >= 3,
    xpReward: 25
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Complete activities 7 days in a row',
    condition: (user) => user.streakCount >= 7,
    xpReward: 50
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Complete activities 30 days in a row',
    condition: (user) => user.streakCount >= 30,
    xpReward: 200
  },
  
  // XP achievements
  {
    id: 'xp_100',
    name: 'Beginner',
    description: 'Earn 100 XP',
    condition: (user) => user.xp >= 100,
    xpReward: 10
  },
  {
    id: 'xp_500',
    name: 'Intermediate',
    description: 'Earn 500 XP',
    condition: (user) => user.xp >= 500,
    xpReward: 25
  },
  {
    id: 'xp_1000',
    name: 'Advanced',
    description: 'Earn 1000 XP',
    condition: (user) => user.xp >= 1000,
    xpReward: 50
  },
  {
    id: 'xp_5000',
    name: 'Expert',
    description: 'Earn 5000 XP',
    condition: (user) => user.xp >= 5000,
    xpReward: 100
  },
  
  // Level achievements
  {
    id: 'level_5',
    name: 'Rising Star',
    description: 'Reach level 5',
    condition: (user) => user.level >= 5,
    xpReward: 50
  },
  {
    id: 'level_10',
    name: 'Math Enthusiast',
    description: 'Reach level 10',
    condition: (user) => user.level >= 10,
    xpReward: 100
  },
  {
    id: 'level_20',
    name: 'Math Master',
    description: 'Reach level 20',
    condition: (user) => user.level >= 20,
    xpReward: 200
  }
];

// Check and award achievements
const checkAchievements = async (user, progressStats = {}) => {
  const newAchievements = [];
  const earnedAchievementIds = user.achievements.map(a => a.id || a.name);
  
  for (const achievement of achievements) {
    // Skip if already earned
    if (earnedAchievementIds.includes(achievement.id)) {
      continue;
    }
    
    // Check if condition is met
    if (achievement.condition(user, progressStats)) {
      newAchievements.push({
        name: achievement.name,
        description: achievement.description,
        xpAwarded: achievement.xpReward,
        earnedAt: new Date()
      });
    }
  }
  
  // Check topic-specific achievements
  if (progressStats.topicMastery) {
    for (const [topic, mastery] of Object.entries(progressStats.topicMastery)) {
      if (mastery >= 90 && !earnedAchievementIds.includes(`master_${topic}`)) {
        newAchievements.push({
          name: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Master`,
          description: `Achieve 90% mastery in ${topic}`,
          xpAwarded: 75,
          earnedAt: new Date()
        });
      }
    }
  }
  
  // Check perfect score achievements
  if (progressStats.perfectScores) {
    const perfectMilestones = [10, 25, 50, 100];
    for (const milestone of perfectMilestones) {
      if (progressStats.perfectScores >= milestone && 
          !earnedAchievementIds.includes(`perfect_${milestone}`)) {
        newAchievements.push({
          name: `Perfect ${milestone}`,
          description: `Get ${milestone} perfect scores`,
          xpAwarded: milestone,
          earnedAt: new Date()
        });
      }
    }
  }
  
  return newAchievements;
};

// Calculate topic mastery percentage
const calculateTopicMastery = (topicProgress) => {
  if (!topicProgress || topicProgress.length === 0) return 0;
  
  const weights = {
    practice: 0.4,
    lesson: 0.3,
    revision: 0.2,
    example: 0.1
  };
  
  let totalWeight = 0;
  let weightedScore = 0;
  
  topicProgress.forEach(activity => {
    const weight = weights[activity._id] || 0.25;
    totalWeight += weight;
    weightedScore += (activity.avgScore || 0) * weight;
  });
  
  return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
};

module.exports = {
  calculateXP,
  checkAchievements,
  calculateTopicMastery,
  achievements
};