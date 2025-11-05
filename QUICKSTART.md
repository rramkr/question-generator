# Quick Start Guide - Open Source AI Version

This guide will help you set up the completely **free, open-source** version of the Educational Question Generator that runs **100% locally** with no API costs.

## What Changed?

✅ **Removed**: Anthropic Claude API (paid service)
✅ **Added**: Ollama + LLaVA (free, open-source, local AI)
✅ **Benefit**: No API costs, complete privacy, runs offline

## Setup Steps (15 minutes)

### Step 1: Install Ollama (5 minutes)

1. Go to [ollama.com](https://ollama.com)
2. Click "Download for Mac"
3. Open the downloaded file
4. Drag Ollama to Applications
5. Open Ollama from Applications (it will run in your menu bar)

### Step 2: Download AI Model (5 minutes)

Open Terminal and run:

```bash
ollama pull llava
```

This downloads a 4.7GB vision model. It only needs to be done once.

### Step 3: Set Up Python AI Service (5 minutes)

```bash
cd /Users/ramsabode/vibe-coding/edu/ai-service

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 4: Update Backend Dependencies

```bash
cd /Users/ramsabode/vibe-coding/edu/backend

# axios is already installed from previous command
# Just verify .env has AI_SERVICE_URL=http://localhost:5002
cat .env
```

## Running the Application

You need **3 terminals** open:

### Terminal 1: AI Service (Port 5002)

```bash
cd /Users/ramsabode/vibe-coding/edu/ai-service
source venv/bin/activate
python app.py
```

**Wait for**: `Starting AI Service on port 5002`

### Terminal 2: Backend (Port 5001)

```bash
cd /Users/ramsabode/vibe-coding/edu/backend
npm run dev
```

**Wait for**: `Server running on http://localhost:5001`

### Terminal 3: Frontend (Port 3000)

```bash
cd /Users/ramsabode/vibe-coding/edu/frontend
npm start
```

**Wait for**: Browser opens automatically to `http://localhost:3000`

## Testing It Works

1. Open browser to `http://localhost:3000`
2. Register a new account
3. Upload 1-2 textbook images
4. Select question types (start with just 2-3 questions)
5. Click "Generate Questions"
6. **First request takes 30-60 seconds** (model loading)
7. Subsequent requests are faster (10-30 seconds)

## Performance Tips

- **First generation**: Slow (30-60s) - model is loading
- **Subsequent generations**: Faster (10-30s)
- **Recommended**: 5-7 images maximum per request
- **Memory**: Needs 4-8GB RAM free
- **Speed**: GPU helps but not required

## Troubleshooting

### "AI service is not running"

Make sure Terminal 1 (AI Service) is running and shows:
```
Starting AI Service on port 5002
Ollama API: http://localhost:11434
```

### "Cannot connect to Ollama"

In a new terminal, run:
```bash
ollama serve
```

### "Model not found: llava"

Download the model:
```bash
ollama pull llava
```

### Out of Memory

- Close other applications
- Try with fewer images (2-3 instead of 10)
- Restart Ollama: `killall ollama && ollama serve`

## Deployment (Vercel + Railway/Your Computer)

### Frontend + Backend → Vercel

1. Deploy to Vercel normally
2. Set `AI_SERVICE_URL` to your AI service URL (see below)

### AI Service → Option 1: Your Computer (Free)

Keep the AI service running on your computer and expose it:

```bash
# Install ngrok
brew install ngrok

# Expose AI service
ngrok http 5002
```

Copy the `https://xxxx.ngrok.io` URL and set it as `AI_SERVICE_URL` in Vercel.

### AI Service → Option 2: Railway (Free Tier)

1. Create account on [railway.app](https://railway.app)
2. Deploy the `ai-service` folder
3. Add environment variable: `OLLAMA_API=<your-ollama-url>`
4. Copy Railway URL and set as `AI_SERVICE_URL` in Vercel

## Cost Comparison

| Component | Old (Anthropic) | New (Ollama) |
|-----------|----------------|--------------|
| AI API | $15-30/month | **FREE** |
| Hosting | Vercel Free | Vercel Free + Your Computer |
| Setup Time | 5 minutes | 15 minutes |
| Privacy | Data sent to API | **100% Local** |
| Speed | 5-10 seconds | 10-30 seconds |

## Next Steps

- Everything is working? Great! Start generating questions.
- Want to deploy? See deployment section above.
- Want to use a different model? Run `ollama pull llava:13b` for higher quality.

## Questions?

Check the main README.md or ai-service/README.md for detailed docs.
