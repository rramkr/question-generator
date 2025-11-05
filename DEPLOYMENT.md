# Deployment Guide for Vercel

This guide will help you deploy your Question Generator app to Vercel for free.

## Prerequisites

1. A GitHub account
2. A Vercel account (sign up at https://vercel.com - free for hobby projects)
3. A Google Gemini API key (free tier available)

## Step 1: Get Your Google Gemini API Key

1. Visit https://ai.google.dev/
2. Click "Get API key in Google AI Studio"
3. Sign in with your Google account
4. Click "Create API Key"
5. Copy the API key - you'll need this for Vercel

The free tier includes:
- 15 requests per minute
- 1,500 requests per day
- Rate limit of 1 million tokens per minute

## Step 2: Push Your Code to GitHub

1. Initialize git repository (if not already done):
   ```bash
   cd /Users/ramsabode/vibe-coding/edu
   git init
   git add .
   git commit -m "Initial commit - Question Generator with Gemini AI"
   ```

2. Create a new repository on GitHub:
   - Go to https://github.com/new
   - Name it "question-generator" or similar
   - Don't add README, .gitignore, or license (we already have these)
   - Click "Create repository"

3. Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/question-generator.git
   git branch -M main
   git push -u origin main
   ```

## Step 3: Deploy Backend to Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: Leave empty (not needed for Node.js)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

5. Add Environment Variables:
   Click "Environment Variables" and add:
   - `GEMINI_API_KEY` = Your Gemini API key from Step 1
   - `JWT_SECRET` = Generate a random string (e.g., run `openssl rand -base64 32`)
   - `NODE_ENV` = `production`

6. Click "Deploy"

7. Once deployed, copy your backend URL (e.g., `https://your-backend.vercel.app`)

## Step 4: Deploy Frontend to Vercel

1. In Vercel dashboard, click "Add New..." → "Project"
2. Import the same GitHub repository
3. Configure the project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

4. Add Environment Variables:
   Click "Environment Variables" and add:
   - `REACT_APP_API_URL` = Your backend URL from Step 3 (e.g., `https://your-backend.vercel.app`)

5. Click "Deploy"

6. Once deployed, you'll get your frontend URL (e.g., `https://your-app.vercel.app`)

## Step 5: Update Backend CORS Settings (if needed)

If you get CORS errors, you may need to update your backend's CORS configuration to allow your frontend domain.

1. Go to your backend deployment in Vercel
2. Go to Settings → Environment Variables
3. Add a new variable:
   - `FRONTEND_URL` = Your frontend URL (e.g., `https://your-app.vercel.app`)

4. Update your backend code to use this in CORS settings (if not already configured)

## Step 6: Share Your App!

Your app is now live! Share the frontend URL with anyone:
- Frontend: `https://your-app.vercel.app`
- They can create an account, upload images/PDFs, and generate questions

## Important Notes

### Free Tier Limitations

**Vercel Free Tier:**
- 100 GB bandwidth per month
- 6,000 build minutes per month
- Hobby projects only (no commercial use)

**Google Gemini Free Tier:**
- 15 requests per minute
- 1,500 requests per day
- Perfect for hobby projects and testing

### Storage Limitations

The current setup uses file storage for uploaded images. On Vercel, the filesystem is ephemeral (files are deleted between deployments). For a production app, consider:

1. Using cloud storage (AWS S3, Cloudflare R2, etc.)
2. Storing images as base64 in the database (not recommended for large files)
3. Using a service like Vercel Blob Storage

### Database Limitations

The current setup uses SQLite, which works on Vercel but data will be lost between deployments. For persistent data, consider:

1. Vercel Postgres (free tier available)
2. Supabase (free tier available)
3. PlanetScale (free tier available)

## Troubleshooting

### Backend Won't Start

Check the logs in Vercel dashboard:
1. Go to your backend deployment
2. Click on the latest deployment
3. Click "Functions" → Check logs

Common issues:
- Missing environment variables
- Invalid Gemini API key

### Frontend Can't Connect to Backend

1. Check that `REACT_APP_API_URL` is set correctly in frontend environment variables
2. Make sure it points to your backend URL (without trailing slash)
3. Redeploy frontend after changing environment variables

### Gemini API Errors

1. Verify your API key is correct
2. Check you haven't exceeded the free tier limits
3. Check the Gemini API status at https://status.cloud.google.com/

## Updating Your Deployment

To update your app after making changes:

1. Commit and push changes to GitHub:
   ```bash
   git add .
   git commit -m "Your changes description"
   git push
   ```

2. Vercel will automatically redeploy both frontend and backend!

## Cost Monitoring

Both Vercel and Google Gemini offer generous free tiers. Monitor your usage:

- Vercel Usage: https://vercel.com/dashboard/usage
- Google AI Studio: https://console.cloud.google.com/

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Gemini API Docs: https://ai.google.dev/docs
- GitHub Issues: Create an issue in your repository
