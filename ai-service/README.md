# AI Service for Question Generation

This is a standalone Flask service that uses **Ollama with LLaVA** (vision-language model) to generate educational questions from textbook images.

## Features

- 🆓 **100% Free & Open Source** - No API costs
- 🏠 **Runs Locally** - Complete privacy, no data leaves your machine
- 🚀 **Easy Deployment** - Can be deployed to various platforms
- 🧠 **Powerful AI** - Uses LLaVA vision-language model

## Local Development Setup

### Prerequisites

1. **Install Python 3.9+**
   ```bash
   python3 --version
   ```

2. **Install Ollama** (macOS)
   ```bash
   # Download from https://ollama.com/download/mac
   # Or if you have Homebrew:
   brew install ollama
   ```

3. **Start Ollama service**
   ```bash
   ollama serve
   ```

4. **Download LLaVA model** (in a new terminal)
   ```bash
   ollama pull llava
   ```
   This downloads a 4.7GB model (one-time download)

### Running the AI Service

1. **Install Python dependencies**:
   ```bash
   cd ai-service
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Start the service**:
   ```bash
   python app.py
   ```

   The service will start on `http://localhost:5002`

3. **Test the service**:
   ```bash
   curl http://localhost:5002/health
   ```

## Environment Variables

- `PORT` - Service port (default: 5002)
- `OLLAMA_API` - Ollama API endpoint (default: http://localhost:11434)

## API Endpoints

### POST /generate-questions

Generate questions from base64-encoded images.

**Request:**
```json
{
  "images": ["base64_image_1", "base64_image_2"],
  "questionTypes": {
    "trueFalse": true,
    "shortAnswer": true
  },
  "counts": {
    "trueFalse": 5,
    "shortAnswer": 3
  }
}
```

**Response:**
```json
{
  "questions": [
    {
      "type": "true_false",
      "question": "The Earth orbits the Sun.",
      "answer": "True",
      "explanation": "The Earth takes approximately 365.25 days to complete one orbit."
    }
  ],
  "model": "llava",
  "image_count": 2
}
```

### GET /health

Check service health and Ollama connection.

### GET /models

List available models in Ollama.

## Deployment Options

### Option 1: Run on Your Computer (Easiest)

Just keep the service running locally and expose it:

```bash
# Using ngrok (free)
ngrok http 5002

# Or using Cloudflare Tunnel (free)
cloudflare tunnel --url localhost:5002
```

### Option 2: Deploy to Railway (Free Tier)

1. Create a `Dockerfile` (already included)
2. Push to GitHub
3. Connect Railway to your repo
4. Railway will auto-deploy

**Important**: Add `OLLAMA_API` environment variable pointing to your Ollama instance

### Option 3: Deploy to Hugging Face Spaces (Free GPU)

1. Create a Space on huggingface.co
2. Upload these files
3. Set Space type to "Gradio" or "Streamlit"

### Option 4: Docker (Any Platform)

```bash
docker build -t question-ai-service .
docker run -p 5002:5002 -e OLLAMA_API=http://host.docker.internal:11434 question-ai-service
```

## Performance Notes

- **First request**: Slow (30-60 seconds) - model loading
- **Subsequent requests**: Faster (10-30 seconds per image)
- **Memory usage**: ~4-6GB RAM
- **Recommended**: 8GB+ RAM, GPU optional but helps

## Troubleshooting

### "Cannot connect to Ollama"

Make sure Ollama is running:
```bash
ollama serve
```

### "Model not found: llava"

Download the model:
```bash
ollama pull llava
```

### Service is slow

- Ensure you have enough RAM (8GB+)
- Close other applications
- Consider using a smaller model: `ollama pull llava:7b`

## Alternative Models

You can use other vision models with Ollama:

```bash
# Smaller, faster (recommended for testing)
ollama pull llava:7b

# Larger, more accurate (recommended for production)
ollama pull llava:13b

# Latest version
ollama pull llava:latest
```

Update `app.py` line 90 to change the model name.

## Integration with Main App

Update your `backend/.env`:
```
AI_SERVICE_URL=http://localhost:5002
```

The backend will automatically use this service instead of Anthropic API.
