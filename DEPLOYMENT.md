# Deployment Guide for ZeyadMath Platform

This guide will walk you through publishing your project to GitHub and deploying it on Render.com.

## Step 1: Prepare for GitHub

### 1.1 Initialize Git (if not already done)
```bash
git init
```

### 1.2 Add remote repository
```bash
git remote add origin https://github.com/YOUR_USERNAME/Zeyadmath_siteV2_5.git
```

### 1.3 Commit your changes
```bash
git add .
git commit -m "Prepare for deployment"
```

### 1.4 Create repository on GitHub
1. Go to [GitHub](https://github.com)
2. Click "New repository"
3. Name it `Zeyadmath_siteV2_5`
4. Keep it public (or private if you prefer)
5. Don't initialize with README (you already have one)
6. Click "Create repository"

### 1.5 Push to GitHub
```bash
git branch -M main
git push -u origin main
```

## Step 2: Deploy on Render.com

### 2.1 Create Render Account
1. Sign up at [Render.com](https://render.com)
2. Verify your email
3. Connect your GitHub account when prompted

### 2.2 Deploy Using render.yaml (Recommended)
Since you have a `render.yaml` file, Render can automatically configure your services:

1. In Render Dashboard, click "New +"
2. Select "Blueprint"
3. Connect your GitHub repository
4. Select the `Zeyadmath_siteV2_5` repository
5. Render will detect your `render.yaml` and show:
   - Web Service: zeyadmath-platform
   - Database: zeyadmath-db
6. Click "Apply"

### 2.3 Manual Deployment (Alternative)
If you prefer manual setup:

#### Create PostgreSQL Database:
1. Click "New +" → "PostgreSQL"
2. Configure:
   - Name: `zeyadmath-db`
   - Database: `zeyadmath_production`
   - User: `zeyadmath`
   - Region: Choose closest to your users
   - Plan: Free
3. Click "Create Database"
4. Wait for database to be ready (takes a few minutes)

#### Create Web Service:
1. Click "New +" → "Web Service"
2. Connect your repository
3. Configure:
   - Name: `zeyadmath-platform`
   - Environment: `Node`
   - Region: Same as database
   - Branch: `main`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: Free
4. Add Environment Variables:
   - `DATABASE_URL`: Click "Internal Database URL" from your database
   - `JWT_SECRET`: Generate a secure random string
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
5. Click "Create Web Service"

### 2.4 Post-Deployment Steps

1. **Wait for deployment** (5-10 minutes for first deployment)
2. **Check deployment logs** for any errors
3. **Visit your app** at `https://zeyadmath-platform.onrender.com`
4. **Seed the database** (optional):
   - In Render dashboard, go to your web service
   - Click "Shell" tab
   - Run: `npm run seed`

## Step 3: Monitoring and Maintenance

### Check Application Health
- Visit: `https://zeyadmath-platform.onrender.com/api/health`
- Should return: `{"success":true,"message":"Zeyadmath Learning Platform API is running"}`

### View Logs
- In Render dashboard, click on your service
- Go to "Logs" tab
- Check for errors or warnings

### Database Backups
- Render Free tier doesn't include automatic backups
- For production, consider upgrading or implementing manual backups

## Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Check DATABASE_URL is correctly set
   - Ensure database is in same region as web service
   - Verify database is active (not suspended)

2. **Build Failed**
   - Check Node version compatibility
   - Ensure all dependencies are in package.json
   - Check build logs for specific errors

3. **Application Crashes**
   - Check JWT_SECRET is set
   - Verify all required environment variables
   - Check application logs

4. **Slow Performance on Free Tier**
   - Free services sleep after 15 minutes of inactivity
   - First request after sleep takes 30-60 seconds
   - Consider upgrading for production use

### Getting Help
- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com
- Your app's logs: Available in Render dashboard

## Updating Your Application

To deploy updates:
```bash
git add .
git commit -m "Your update message"
git push origin main
```

Render will automatically deploy changes when you push to the main branch.

## Security Reminders

1. Never commit `.env` file
2. Keep `JWT_SECRET` secure and unique
3. Use strong database passwords
4. Enable 2FA on GitHub and Render accounts
5. Regularly update dependencies

## Next Steps

1. Set up a custom domain (optional)
2. Configure monitoring (e.g., UptimeRobot)
3. Implement CI/CD with GitHub Actions
4. Set up error tracking (e.g., Sentry)
5. Plan for scaling as user base grows