const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const authController = require('../controllers/authController');

// Validation rules
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
];

const loginValidation = [
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body()
    .custom((value, { req }) => {
      if (!req.body.email && !req.body.username) {
        throw new Error('Email or username is required');
      }
      return true;
    })
];

const updateProfileValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/\d/)
    .withMessage('New password must contain at least one number')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password must be different from current password')
];

// Public routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// Protected routes
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, updateProfileValidation, authController.updateProfile);
router.put('/change-password', auth, changePasswordValidation, authController.changePassword);

module.exports = router;