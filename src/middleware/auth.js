const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided, authorization denied' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by id from token
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token is not valid' 
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token has expired' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Server error during authentication' 
    });
  }
};

// Optional auth middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      
      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = { auth, optionalAuth };