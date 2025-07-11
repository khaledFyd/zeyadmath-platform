require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./src/config/database');
const authRoutes = require('./src/routes/authRoutes');
const progressRoutes = require('./src/routes/progressRoutes');
const lessonRoutes = require('./src/routes/lessonRoutes');
const templateRoutes = require('./src/routes/templateRoutes');
const dynamicLessonRoutes = require('./src/routes/dynamicLessonRoutes');
const gameRoutes = require('./src/routes/gameRoutes');
const lessonTemplateRoutes = require('./src/routes/lessonTemplateRoutes');

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Security middleware - relaxed for development
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
    },
  },
}));

// CORS configuration - simplified for development
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Static files
app.use(express.static(path.join(__dirname, 'public')));
// Remove direct template serving - will use route instead
// app.use('/templates', express.static(path.join(__dirname, 'Math_teaching_templates')));
app.use('/mascot', express.static(path.join(__dirname, 'Mascot')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/dynamic-lessons', dynamicLessonRoutes);
app.use('/api/games', gameRoutes);

// Lesson templates with integration
app.use('/lessons', lessonTemplateRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Zeyadmath Learning Platform API is running',
    timestamp: new Date().toISOString()
  });
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve games - tower defense
app.get('/games/tower-defense', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'games', 'tower-defense-xp.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      success: false, 
      error: 'CORS policy violation' 
    });
  }
  
  // MongoDB validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ 
      success: false, 
      error: 'Validation error', 
      details: errors 
    });
  }
  
  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({ 
      success: false, 
      error: `${field} already exists` 
    });
  }
  
  // Default error
  res.status(err.status || 500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`
    🚀 Zeyadmath Learning Platform Server is running!
    📡 API: http://localhost:${PORT}
    🌍 Environment: ${process.env.NODE_ENV || 'development'}
  `);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('\n📴 Shutting down gracefully...');
  server.close(() => {
    console.log('💤 Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app; // For testing