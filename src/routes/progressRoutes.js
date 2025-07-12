const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { auth, optionalAuth } = require('../middleware/auth');
const progressController = require('../controllers/progressController');

// Validation rules
const recordActivityValidation = [
  body('activityType')
    .isIn(['practice', 'lesson', 'revision', 'example'])
    .withMessage('Invalid activity type'),
  body('topic')
    .trim()
    .notEmpty()
    .withMessage('Topic is required'),
  body('score')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Score must be between 0 and 100'),
  body('totalQuestions')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total questions must be a positive integer'),
  body('correctAnswers')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Correct answers must be a positive integer'),
  body('timeSpent')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Time spent must be a positive integer (seconds)'),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid difficulty level')
];

const getStatsValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
];

const getDetailedProgressValidation = [
  query('type')
    .optional()
    .isIn(['practice', 'lesson', 'revision', 'example'])
    .withMessage('Invalid activity type'),
  query('topic')
    .optional()
    .trim(),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a positive integer')
];

const getLeaderboardValidation = [
  query('period')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'all'])
    .withMessage('Invalid period'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const awardBonusXPValidation = [
  body('userId')
    .isInt()
    .withMessage('Invalid user ID'),
  body('amount')
    .isInt({ min: 1 })
    .withMessage('Amount must be a positive integer'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters')
];

// Routes
router.post('/activity', auth, recordActivityValidation, progressController.recordActivity);
router.get('/stats', auth, getStatsValidation, progressController.getUserStats);
router.get('/detailed', auth, getDetailedProgressValidation, progressController.getDetailedProgress);
router.get('/leaderboard', optionalAuth, getLeaderboardValidation, progressController.getLeaderboard);

// Admin route (you should add admin middleware)
router.post('/award-xp', auth, awardBonusXPValidation, progressController.awardBonusXP);

module.exports = router;