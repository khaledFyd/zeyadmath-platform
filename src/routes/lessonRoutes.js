const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const { auth, optionalAuth } = require('../middleware/auth');
const lessonController = require('../controllers/lessonController');

// Validation rules
const getLessonsValidation = [
  query('topic')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Topic cannot be empty'),
  query('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid difficulty level'),
  query('active')
    .optional()
    .isBoolean()
    .withMessage('Active must be a boolean')
];

const lessonIdValidation = [
  param('id')
    .isInt()
    .withMessage('Invalid lesson ID')
];

const topicValidation = [
  param('topic')
    .trim()
    .notEmpty()
    .withMessage('Topic is required')
];

const completeLessonValidation = [
  param('id')
    .isInt()
    .withMessage('Invalid lesson ID'),
  body('timeSpent')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Time spent must be a positive integer'),
  body('score')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Score must be between 0 and 100')
];

const recommendationsValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
];

// Routes
router.get('/', optionalAuth, getLessonsValidation, lessonController.getAllLessons);
router.get('/topics', optionalAuth, lessonController.getLessonTopics);
router.get('/recommendations', auth, recommendationsValidation, lessonController.getRecommendedLessons);
router.get('/:id', optionalAuth, lessonIdValidation, lessonController.getLessonById);
router.get('/topic/:topic', optionalAuth, topicValidation, lessonController.getLessonsByTopic);
router.get('/topic/:topic/path', optionalAuth, topicValidation, lessonController.getLessonPath);
router.post('/:id/complete', auth, completeLessonValidation, lessonController.completeLesson);

// Revision and examples routes
router.get('/revisions/:topic', optionalAuth, topicValidation, lessonController.getRevisionMaterials);
router.get('/examples/:topic', optionalAuth, topicValidation, lessonController.getExampleProblems);

module.exports = router;