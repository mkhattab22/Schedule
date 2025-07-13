# Deployment Checklist

## Prerequisites
- [ ] Node.js (v18+ recommended)
- [ ] npm (v9+ recommended)
- [ ] Database server (PostgreSQL/MySQL recommended for production)

## Configuration
1. Create `.env` file from `.env.example`
2. Set production database connection in DATABASE_URL
3. Configure BASE_URL with your production domain
4. Set a strong SESSION_SECRET

## Deployment Steps
1. Install dependencies:
   ```bash
   npm install --production
   ```
2. Run database migrations:
   ```bash
   npm run migrate
   ```
3. Start production server:
   ```bash
   npm run prod
   ```

## Heroku Deployment Guide

1. Create a Heroku account (free tier available)
2. Install Heroku CLI
3. Create new app:
   ```bash
   heroku create
   ```
4. Add PostgreSQL database:
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```
5. Set config vars (equivalent to .env):
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set SESSION_SECRET=your-secret-key
   ```
6. Deploy:
   ```bash
   git push heroku main
   ```
7. Open app:
   ```bash
   heroku open
   ```

## Alternative Providers
- AWS Elastic Beanstalk
- DigitalOcean App Platform
- Railway.app

## Frontend Deployment
1. Build frontend assets (if applicable)
2. Configure BASE_URL to match backend
3. Deploy to web server or hosting service

## Maintenance
- Regularly backup database
- Monitor server resources
- Keep dependencies updated
