# ZeyadMath Learning Platform

An interactive mathematics learning platform designed to teach math concepts through gamified experiences and visual learning.

## Features

- 🎮 **Gamified Learning**: Earn XP and level up as you complete lessons
- 🍩 **Visual Teaching**: Learn algebra through interactive donut metaphors
- 🏰 **Tower Defense Game**: Play educational games unlocked with XP
- 📊 **Progress Tracking**: Monitor your learning journey with detailed statistics
- 🏆 **Achievement System**: Unlock badges and rewards for milestones
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🔒 **Prerequisites System**: Structured learning paths
- 📈 **Smart XP System**: Questions award XP only on first correct solve

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT-based authentication
- **Frontend**: Server-rendered HTML with vanilla JavaScript
- **Deployment**: Render.com (Node.js + PostgreSQL database)
- **Charts**: Chart.js for data visualization

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- PostgreSQL (v12 or higher)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Zeyadmath_siteV2_5.git
   cd Zeyadmath_siteV2_5
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create PostgreSQL database**
   ```bash
   createdb zeyadmath_dev
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your configuration:
   ```
   DB_USERNAME=your_postgres_username
   DB_PASSWORD=your_postgres_password
   DB_NAME=zeyadmath_dev
   DB_HOST=localhost
   DB_PORT=5432
   JWT_SECRET=your-secret-key-here
   PORT=3000
   NODE_ENV=development
   ```

5. **Demo Account**
   The demo account is automatically created when the server starts:
   - Email: `demo@zeyadmath.com`
   - Password: `demo123`
   
   You can also manually seed the database with sample lessons:
   ```bash
   npm run seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` to see the app running.

## PostgreSQL Setup

### Local PostgreSQL (macOS)
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create database
createdb zeyadmath_dev
```

### Local PostgreSQL (Ubuntu/Debian)
```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb zeyadmath_dev
```

### Production Database (Render PostgreSQL)
When deploying to Render, you can create a PostgreSQL database directly in the Render dashboard. Render will provide a `DATABASE_URL` environment variable automatically.

## Deployment on Render.com

1. **Prepare your repository**
   - Ensure all changes are committed to GitHub
   - Make sure `.env` is in `.gitignore`

2. **Create a Render Account**
   - Sign up at [Render.com](https://render.com)
   - Connect your GitHub account

3. **Create a New Web Service**
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository
   - Configure the service:
     - **Name**: zeyadmath-platform
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: Free tier is fine to start

4. **Create PostgreSQL Database on Render**
   - In Render dashboard, click "New +" and select "PostgreSQL"
   - Create a database with your preferred name
   - Note the internal database URL

5. **Add Environment Variables**
   - In your Web Service settings, go to "Environment"
   - Add the following variables:
     ```
     DATABASE_URL=your-render-postgresql-internal-url
     JWT_SECRET=your-production-secret-key
     NODE_ENV=production
     ```

6. **Deploy**
   - Render will automatically deploy when you push to your main branch
   - Monitor the deploy logs for any issues

## Project Structure

```
zeyadmath-platform/
├── public/              # Static files (CSS, JS, images)
├── src/
│   ├── config/         # Database and app configuration
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Express middleware
│   ├── models/         # Sequelize models
│   ├── routes/         # API routes
│   └── games/          # Game files
├── Math_teaching_templates/  # Educational HTML templates
├── Mascot/             # Character assets
├── scripts/            # Utility scripts
├── server.js           # Express server entry point
├── package.json        # Dependencies and scripts
└── .env.example        # Environment variables template
```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run seed` - Seed database with sample data

## API Documentation

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Progress
- `GET /api/progress/stats` - Get user statistics
- `POST /api/progress/activity` - Record learning activity
- `GET /api/progress/detailed` - Get detailed progress
- `GET /api/progress/leaderboard` - View leaderboard

### Lessons
- `GET /api/lessons` - List all lessons
- `GET /api/lessons/:id` - Get specific lesson
- `POST /api/lessons/:id/complete` - Mark lesson as complete
- `GET /api/lessons/recommendations` - Get recommended lessons

### Games
- `GET /api/games/tower-defense/access` - Check game access eligibility
- `POST /api/games/tower-defense/session` - Record game session

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Security Notes

- Never commit `.env` file
- Keep your JWT_SECRET secure and complex
- Use different secrets for development and production
- Regularly update dependencies

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Support

For questions or support, please open an issue in the GitHub repository.
