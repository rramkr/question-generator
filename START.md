# Quick Start - Run Your Application

## ✅ What's Already Done

- ✅ Python virtual environment created
- ✅ Python dependencies installed
- ✅ Backend configured (axios installed, Anthropic removed)
- ✅ Environment variables updated

## 🔧 What You Need To Do (5 minutes)

### Step 1: Install Ollama (2 minutes)

Ollama must be installed manually on macOS:

1. **Download**:
   I already downloaded it to `/tmp/Ollama.app`

2. **Install**:
   ```bash
   open /tmp
   ```
   - Drag `Ollama.app` to your Applications folder
   - Open Ollama from Applications
   - It will appear in your menu bar (top-right)

3. **Download the AI model** (4.7GB - one time):
   ```bash
   /Applications/Ollama.app/Contents/MacOS/ollama pull llava
   ```
   This takes 5-10 minutes depending on your internet speed.

### Step 2: Start All Services (3 terminals)

**Terminal 1 - AI Service:**
```bash
cd /Users/ramsabode/vibe-coding/edu/ai-service
source venv/bin/activate
python app.py
```
Wait for: "Starting AI Service on port 5002"

**Terminal 2 - Backend:**
```bash
cd /Users/ramsabode/vibe-coding/edu/backend
npm run dev
```
Wait for: "Server running on http://localhost:5001"

**Terminal 3 - Frontend:**
```bash
cd /Users/ramsabode/vibe-coding/edu/frontend
npm start
```
Browser opens automatically to http://localhost:3000

### Step 3: Test It

1. Register a new account
2. Upload 1-2 small textbook images
3. Select 2-3 question types
4. Click "Generate Questions"
5. **First time takes 30-60 seconds** (model loading)
6. Subsequent generations are faster!

## 🆘 If Something Goes Wrong

### "AI service is not running"
- Make sure Terminal 1 is running with no errors
- Check http://localhost:5002/health in your browser

### "Cannot connect to Ollama"
- Make sure Ollama app is running (check menu bar)
- Or manually start: `/Applications/Ollama.app/Contents/MacOS/ollama serve`

### "Model not found: llava"
- Download it: `/Applications/Ollama.app/Contents/MacOS/ollama pull llava`

## 📝 One-Command Start (After Ollama is installed)

Create a file `start.sh`:
```bash
#!/bin/bash

# Start Ollama in background
/Applications/Ollama.app/Contents/MacOS/ollama serve &

# Start AI Service
cd /Users/ramsabode/vibe-coding/edu/ai-service
source venv/bin/activate
python app.py &

# Wait a bit
sleep 5

# Start Backend
cd /Users/ramsabode/vibe-coding/edu/backend
npm run dev &

# Start Frontend
cd /Users/ramsabode/vibe-coding/edu/frontend
npm start
```

Then: `chmod +x start.sh && ./start.sh`

## 🎉 You're All Set!

Once Ollama is installed and the model downloaded, you can generate unlimited questions for free!

No API costs, complete privacy, runs entirely on your machine.
