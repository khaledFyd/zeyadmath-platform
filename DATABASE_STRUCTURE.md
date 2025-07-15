# Database Structure - Zeyadmath Learning Platform

## Overview
The platform uses PostgreSQL with Sequelize ORM. The database is designed to track user progress, XP, achievements, and game sessions.

## Tables

### 1. Users
Stores user account information and progress metrics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| username | VARCHAR(255) | NOT NULL, UNIQUE | User's display name |
| email | VARCHAR(255) | NOT NULL, UNIQUE | User's email address |
| password | VARCHAR(255) | NOT NULL | Hashed password (bcrypt) |
| xp | INTEGER | DEFAULT 0 | Total XP earned |
| level | INTEGER | DEFAULT 1 | Current level (calculated from XP) |
| achievements | JSON | DEFAULT [] | Array of achievement objects |
| streakCount | INTEGER | DEFAULT 0 | Current learning streak in days |
| lastActivityDate | DATE | NULL | Last activity date for streak tracking |
| createdAt | TIMESTAMP | NOT NULL | Account creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:**
- UNIQUE index on `username`
- UNIQUE index on `email`

**Level Calculation:**
- Level 1: 0-99 XP
- Level 2: 100-249 XP  
- Level 3: 250-449 XP
- Level 4: 450-699 XP
- Level 5: 700-999 XP
- Level 6+: +300 XP per level

### 2. Progresses
Tracks individual learning activities and XP earned.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique progress record ID |
| userId | INTEGER | FOREIGN KEY → Users.id | User who completed the activity |
| activityType | ENUM | NOT NULL | Type: 'practice', 'lesson', 'revision', 'example', 'bonus' |
| topic | VARCHAR(255) | NOT NULL | Math topic (e.g., 'algebra', 'fractions') |
| difficulty | ENUM | DEFAULT 'intermediate' | 'beginner', 'intermediate', 'advanced' |
| score | FLOAT | DEFAULT 0 | Score achieved (0-100) |
| xpEarned | INTEGER | DEFAULT 0 | XP earned for this activity |
| timeSpent | INTEGER | DEFAULT 0 | Time spent in seconds |
| metadata | JSON | NULL | Additional activity-specific data |
| completedAt | TIMESTAMP | DEFAULT NOW() | When the activity was completed |
| createdAt | TIMESTAMP | NOT NULL | Record creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:**
- Index on `userId`
- Index on `activityType`
- Index on `completedAt`

**Relationships:**
- Many-to-One with Users (a user can have many progress records)

### 3. Lessons
Stores lesson content and metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique lesson ID |
| title | VARCHAR(255) | NOT NULL | Lesson title |
| description | TEXT | NULL | Lesson description |
| topic | VARCHAR(255) | NOT NULL | Math topic category |
| difficulty | ENUM | DEFAULT 'intermediate' | 'beginner', 'intermediate', 'advanced' |
| contentUrl | VARCHAR(255) | NULL | URL to lesson content |
| prerequisites | JSON | DEFAULT [] | Array of prerequisite lesson IDs |
| estimatedTime | INTEGER | DEFAULT 30 | Estimated completion time in minutes |
| xpReward | INTEGER | DEFAULT 50 | Base XP reward for completion |
| isActive | BOOLEAN | DEFAULT true | Whether lesson is available |
| orderIndex | INTEGER | DEFAULT 0 | Display order in lesson list |
| createdAt | TIMESTAMP | NOT NULL | Lesson creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:**
- Index on `topic`
- Index on `difficulty`
- Index on `isActive`

### 4. GameSessions (game_sessions)
Tracks tower defense game sessions and XP snapshots.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique session ID |
| userId | INTEGER | FOREIGN KEY → Users.id | Player's user ID |
| gameType | VARCHAR(255) | DEFAULT 'tower-defense' | Type of game |
| lastPlayedAt | TIMESTAMP | NOT NULL | When the game was last played |
| lastXPSnapshot | INTEGER | DEFAULT 0 | User's XP when they last lost the game |
| totalCoinsUsed | INTEGER | DEFAULT 0 | Total coins spent across all sessions |
| createdAt | TIMESTAMP | NOT NULL | First play timestamp |
| updatedAt | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:**
- UNIQUE composite index on (`userId`, `gameType`)

**Relationships:**
- Many-to-One with Users

**Game Logic:**
- XP snapshot only updates when player loses (lives reach 0)
- Coins = 100 base + (XP earned since lastXPSnapshot) ÷ 5
- Players keep unspent coins if they exit without losing

### 5. DiagnosticTests (diagnostic_tests)
Used for system health checks.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Test record ID |
| testData | VARCHAR(255) | NOT NULL | Test data string |
| createdAt | TIMESTAMP | NOT NULL | Test creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL | Last update timestamp |

**Purpose:**
- Database health monitoring
- Write/Read/Delete operation testing
- Automatically cleaned up after 1 minute

## Relationships

```
Users (1) ──────< (N) Progresses
  │
  └────────< (N) GameSessions
```

## Key Features

### XP System
- Base XP rewards vary by activity type and difficulty
- Bonus XP for high scores (>90%)
- Time-based bonuses for quick completion
- XP corruption detection (warns if >10,000 XP for single activity)

### Achievement System
Achievements stored as JSON array in Users table:
```json
{
  "id": "first_lesson",
  "name": "First Steps",
  "description": "Complete your first lesson",
  "unlockedAt": "2024-01-15T10:30:00Z",
  "icon": "🎯"
}
```

### Game Coin System
- Base: 100 coins for all players
- Bonus: 1 coin per 5 XP earned since last game loss
- XP snapshot updates only on game loss
- Coins persist between sessions unless lost

## Database Configuration

### Environment Variables
```env
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_NAME=zeyadmath_dev
DB_HOST=localhost
DB_PORT=5432
```

### Sequelize Configuration
- Development: Local PostgreSQL
- Production: Render PostgreSQL (uses DATABASE_URL)
- Auto-sync enabled (creates tables if not exist)

## Migrations
Currently using Sequelize sync for development. For production, consider using migrations:

```bash
npx sequelize-cli migration:generate --name create-users
npx sequelize-cli db:migrate
```

## Indexes and Performance
- All foreign keys are indexed
- Composite indexes for frequent queries
- JSON columns for flexible data storage
- Timestamp indexes for time-based queries

## Data Retention
- User data: Retained indefinitely
- Progress records: Retained indefinitely
- Game sessions: Updated on each play
- Diagnostic tests: Auto-deleted after 1 minute