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
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication
- **Frontend**: Server-rendered HTML with vanilla JavaScript
- **Deployment**: Render.com (Node.js) + MongoDB Atlas (Database)
- **Charts**: Chart.js for data visualization

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local instance or Atlas account)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/zeyadmath-platform.git
   cd zeyadmath-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your configuration:
   ```
   MONGODB_URI=mongodb://localhost:27017/zeyadmath
   JWT_SECRET=your-secret-key-here
   PORT=3000
   NODE_ENV=development
   ```

4. **Seed the database (optional)**
   ```bash
   npm run seed
   ```
   
   This creates sample lessons and a demo user:
   - Email: `demo@zeyadmath.com`
   - Password: `demo123`

5. **Start the development server**
   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` to see the app running.

## MongoDB Atlas Setup

1. **Create an Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for a free account

2. **Create a Cluster**
   - Click "Build a Cluster"
   - Choose the free tier (M0)
   - Select your preferred region

3. **Configure Database Access**
   - Go to "Database Access" in the sidebar
   - Add a new database user with username and password
   - Note these credentials for later

4. **Configure Network Access**
   - Go to "Network Access" in the sidebar
   - Click "Add IP Address"
   - For development: Add your current IP
   - For production: Add `0.0.0.0/0` (allows access from anywhere)

5. **Get Connection String**
   - Go to "Clusters" and click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

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

4. **Add Environment Variables**
   - In Render dashboard, go to "Environment"
   - Add the following variables:
     ```
     MONGODB_URI=your-mongodb-atlas-connection-string
     JWT_SECRET=your-production-secret-key
     NODE_ENV=production
     ```

5. **Deploy**
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
│   ├── models/         # Mongoose models
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