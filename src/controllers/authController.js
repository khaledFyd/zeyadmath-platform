const { User } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Register new user
const register = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Format errors for better frontend display
      const formattedErrors = {};
      errors.array().forEach(error => {
        formattedErrors[error.path] = error.msg;
      });
      
      return res.status(400).json({ 
        success: false, 
        errors: errors.array(),
        fieldErrors: formattedErrors,
        message: 'Please correct the following errors' 
      });
    }

    const { username, email, password } = req.body;

    // Check if user already exists by email
    const existingUserByEmail = await User.findOne({ where: { email } });
    if (existingUserByEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email already registered'
      });
    }

    // Check if username already exists
    const existingUserByUsername = await User.findOne({ where: { username } });
    if (existingUserByUsername) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username already taken'
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password
    });

    // Generate token
    const token = user.generateAuthToken();

    // Send response
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        xp: user.xp,
        level: user.level,
        achievements: user.achievements
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific database errors
    if (error.name === 'SequelizeValidationError') {
      const fieldErrors = {};
      error.errors.forEach(err => {
        fieldErrors[err.path] = err.message;
      });
      
      return res.status(400).json({ 
        success: false, 
        fieldErrors,
        message: 'Validation failed',
        error: 'Please check your input and try again' 
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0].path;
      return res.status(400).json({ 
        success: false, 
        fieldErrors: {
          [field]: `This ${field} is already taken`
        },
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
      });
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error registering user. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    console.log('Login request body:', req.body); // Debug log
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array()); // Debug log
      
      // Format errors for better frontend display
      const formattedErrors = {};
      errors.array().forEach(error => {
        formattedErrors[error.path] = error.msg;
      });
      
      return res.status(400).json({ 
        success: false, 
        errors: errors.array(),
        fieldErrors: formattedErrors,
        message: 'Please correct the following errors' 
      });
    }

    const { email, username, emailOrUsername, password } = req.body;

    // Handle flexible login identifier
    let loginIdentifier = email || username || emailOrUsername;
    if (!loginIdentifier) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide your email or username to login' 
      });
    }

    // Auto-create demo user if trying to login with demo credentials
    const allowDemoAutoCreate = process.env.ALLOW_DEMO_AUTO_CREATE !== 'false'; // Default to true
    
    if (allowDemoAutoCreate && (loginIdentifier === 'demo@zeyadmath.com' || loginIdentifier === 'demo_student') && password === 'demo123') {
      let demoUser = await User.findOne({ 
        where: { email: 'demo@zeyadmath.com' } 
      });
      
      if (!demoUser) {
        console.log('Demo user not found, creating...');
        demoUser = await User.create({
          username: 'demo_student',
          email: 'demo@zeyadmath.com',
          password: 'demo123',
          xp: 100,
          level: 2
        });
        console.log('Demo user created successfully');
      }
    }

    // Check if loginIdentifier is an email or username
    const isEmail = loginIdentifier.includes('@');
    
    // Find user by email or username with password
    const user = await User.scope('withPassword').findOne({ 
      where: isEmail ? { email: loginIdentifier } : { username: loginIdentifier }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials. Please check your email/username and password.',
        fieldErrors: {
          emailOrUsername: 'No account found with this email or username'
        }
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials. Please check your email/username and password.',
        fieldErrors: {
          password: 'Incorrect password'
        }
      });
    }

    // Update last activity
    user.updateStreak();
    await user.save();

    // Generate token
    const token = user.generateAuthToken();

    // Send response
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        xp: user.xp,
        level: user.level,
        achievements: user.achievements,
        streakCount: user.streakCount
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error logging in. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        xp: user.xp,
        level: user.level,
        achievements: user.achievements,
        streakCount: user.streakCount,
        lastActivityDate: user.lastActivityDate,
        createdAt: user.createdAt,
        xpForNextLevel: user.getXPForNextLevel()
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching profile' 
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Format errors for better frontend display
      const formattedErrors = {};
      errors.array().forEach(error => {
        formattedErrors[error.path] = error.msg;
      });
      
      return res.status(400).json({ 
        success: false, 
        errors: errors.array(),
        fieldErrors: formattedErrors,
        message: 'Please correct the following errors' 
      });
    }

    const { username, email } = req.body;
    const updates = {};

    if (username) updates.username = username;
    if (email) updates.email = email;

    // Check if username/email already taken
    if (username) {
      const existingUser = await User.findOne({
        where: { 
          username,
          id: { [Op.ne]: req.userId }
        }
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          error: 'Username already taken'
        });
      }
    }
    
    if (email) {
      const existingUser = await User.findOne({
        where: { 
          email,
          id: { [Op.ne]: req.userId }
        }
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email already in use'
        });
      }
    }

    // Update user
    const user = await User.findByPk(req.userId);
    await user.update(updates);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        xp: user.xp,
        level: user.level
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error updating profile' 
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Format errors for better frontend display
      const formattedErrors = {};
      errors.array().forEach(error => {
        formattedErrors[error.path] = error.msg;
      });
      
      return res.status(400).json({ 
        success: false, 
        errors: errors.array(),
        fieldErrors: formattedErrors,
        message: 'Please correct the following errors' 
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.scope('withPassword').findByPk(req.userId);

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Current password is incorrect' 
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = user.generateAuthToken();

    res.json({
      success: true,
      message: 'Password changed successfully',
      token
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error changing password' 
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
};