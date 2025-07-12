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
    .withMessage('Username must be between 3 and 30 characters. Example: john_doe, student123, math_lover')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores. Example: john_doe ✓, john.doe ✗, john@doe ✗'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address. Example: student@example.com, john.doe@school.edu')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long. Example: math123, secure456')
    .matches(/\d/)
    .withMessage('Password must contain at least one number. Example: password1 ✓, password ✗')
];

const loginValidation = [
  body('emailOrUsername')
    .optional({ checkFalsy: true })
    .trim(),
  body('email')
    .optional({ checkFalsy: true })
    .trim(),
  body('username')
    .optional({ checkFalsy: true })
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required. Please enter your password.')
    .isLength({ min: 1 })
    .withMessage('Password cannot be empty'),
  body()
    .custom((value, { req }) => {
      // Check if at least one login identifier is provided
      const hasEmailOrUsername = req.body.emailOrUsername && req.body.emailOrUsername.trim().length > 0;
      const hasEmail = req.body.email && req.body.email.trim().length > 0;
      const hasUsername = req.body.username && req.body.username.trim().length > 0;
      
      if (!hasEmailOrUsername && !hasEmail && !hasUsername) {
        throw new Error('Please enter your email or username to login. Example: demo@zeyadmath.com or demo_student');
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