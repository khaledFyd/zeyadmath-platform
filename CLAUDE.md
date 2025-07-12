# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zeyadmath_siteV2_5 is a Math Learning Platform designed to teach mathematics concepts through interactive HTML-based tutorials. The project is currently in the prototype/planning phase with standalone HTML teaching templates and a comprehensive specification document.

## Development Commands

```bash
# Install dependencies
npm install

# Start the server
npm start                # Production mode
npm run dev              # Development mode with auto-reload

# Testing and code quality
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run lint             # Run ESLint

# Database
npm run seed             # Seed database with sample data
```

## Environment Setup

1. Copy `.env.example` to `.env` and configure:
   - `DB_USERNAME`: PostgreSQL username
   - `DB_PASSWORD`: PostgreSQL password
   - `DB_NAME`: Database name (e.g., zeyadmath_dev)
   - `DB_HOST`: Database host (default localhost)
   - `DB_PORT`: Database port (default 5432)
   - `JWT_SECRET`: A secure random string for JWT signing
   - `PORT`: Server port (default 3000)

2. Ensure PostgreSQL is running locally or use Render's PostgreSQL service

## Architecture

### Current Structure
- **Standalone HTML Templates**: Self-contained educational modules in `Math_teaching_templets/`
- **Mascot Assets**: Character images in `Mascot/`
- **Specification Document**: Detailed implementation plan in `create_web.md`

### Current Architecture
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT-based authentication
- **Frontend**: Server-rendered HTML with vanilla JavaScript
- **Gamification**: XP system with levels and achievements

### Key Models
1. **User Model**: Tracks username, email, XP, level, and achievements
2. **Progress Model**: Records learning activities (practice, lessons, revisions, examples)
3. **Lesson Model**: Stores lesson content, difficulty, and prerequisites

### API Structure
- `/api/xp/*` - XP and achievement management
- `/api/user/*` - User statistics and profile
- `/api/progress/*` - Activity tracking and progress reports
- `/api/lessons/*` - Lesson content and completion tracking

## HTML Template Pattern

The existing HTML templates follow this pattern:
1. **Self-contained**: All CSS and JavaScript embedded in single HTML files
2. **Gamification**: Built-in XP tracking and visual feedback
3. **Interactive Elements**: Drag-and-drop, animations, and real-time validation
4. **Responsive Design**: Mobile-friendly with touch support
5. **Visual Learning**: Use of metaphors (donuts, balance scales) for abstract concepts

## Implementation Guidelines

When developing new features:
1. **Maintain the visual learning approach** - Use metaphors and interactive elements
2. **Follow the existing HTML template structure** - Keep templates self-contained until backend integration
3. **Implement XP tracking** - All activities should award XP based on performance
4. **Ensure mobile compatibility** - Test on various screen sizes
5. **Use the PostgreSQL/Sequelize models** when implementing backend features

## Security Considerations
- Server-side validation for all XP calculations
- Rate limiting for activity submissions
- Secure JWT implementation for authentication
- Never expose sensitive data in client-side code