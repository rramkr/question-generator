# Educational Question Generator

An AI-powered application that generates various types of educational questions from textbook images using Claude AI.

## Features

- **User Authentication**: Secure email/password registration and login
- **Multi-Format Image Upload**: Upload multiple textbook images in various formats
  - Supports: JPEG, PNG, GIF, WebP, BMP, TIFF, HEIC/HEIF, SVG
  - Automatic HEIC to JPEG conversion for Apple device photos
  - Automatic image optimization for large files
  - Up to 50MB per image
- **AI-Powered Analysis**: Uses Claude AI to analyze and understand textbook content
- **Multiple Question Types**:
  - True/False questions
  - Fill in the Blanks
  - Match the Following
  - Short Answer questions
  - Long Answer questions
  - Higher Order Thinking questions
- **Customizable Generation**: Select question types and specify quantity for each
- **Answer Key**: View answers for all generated questions
- **No Repetition**: Ensures unique, non-repetitive questions

## Tech Stack

- **Frontend**: React 18
- **Backend**: Node.js + Express
- **Database**: SQLite (sqlite3)
- **AI**: Ollama + LLaVA (Free, Open-Source, Runs Locally)
- **AI Service**: Python Flask + Ollama API
- **Authentication**: JWT + bcrypt
- **Image Processing**: Sharp (optimization) + heic-convert (HEIC support)

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Python 3.9+ (for AI service)
- Ollama ([Download here](https://ollama.com))

## Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd edu
   ```

2. **Install all dependencies**:
   ```bash
   npm run install-all
   ```
   This will install dependencies for the root, backend, and frontend.

3. **Set up environment variables**:

   Create a `.env` file in the `backend` directory:
   ```bash
   cd backend
   cp .env.example .env
   ```

   Edit `backend/.env` (default values should work for local development):
   ```
   PORT=5001
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   AI_SERVICE_URL=http://localhost:5002
   ```

4. **Set up AI Service** (Ollama + LLaVA):

   a. **Install Ollama**:
   - Download from [ollama.com](https://ollama.com)
   - Open the downloaded file and install
   - Ollama will run in your menu bar

   b. **Download LLaVA model**:
   ```bash
   ollama pull llava
   ```
   This downloads a 4.7GB vision model (one-time download)

   c. **Start Ollama** (if not already running):
   ```bash
   ollama serve
   ```

   d. **Install AI Service dependencies**:
   ```bash
   cd ai-service
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cd ..
   ```

## Running the Application

You need to run 3 services: Backend, Frontend, and AI Service.

### Option 1: Run with Three Terminals

**Terminal 1 - AI Service** (must be started first):
```bash
cd ai-service
source venv/bin/activate  # On Windows: venv\Scripts\activate
python app.py
```
AI service will start on `http://localhost:5002`

**Terminal 2 - Backend**:
```bash
cd backend
npm run dev
```
Backend will start on `http://localhost:5001`

**Terminal 3 - Frontend**:
```bash
cd frontend
npm start
```
Frontend will start on `http://localhost:3000`

### Option 2: Use Screen or Tmux (Advanced)

If you're comfortable with terminal multiplexers, you can run all services in one terminal window.

## Usage

1. **Access the Application**:
   Open your browser and go to `http://localhost:3000`

2. **Register an Account**:
   - Click "Register here" on the login page
   - Enter your email and password
   - Click "Register"

3. **Upload Textbook Images**:
   - Click on the upload area or drag and drop images
   - Select one or more images of textbook pages
   - Click "Upload Images"

4. **Generate Questions**:
   - Select the images you want to use (click on them)
   - Choose the question types you want
   - Specify how many questions of each type
   - Click "Generate Questions"

5. **View Results**:
   - Questions will appear below once generated
   - Click "Show Answer" to reveal answers for each question
   - Use "Show All Answers" to reveal all answers at once

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login

### Images
- `GET /api/images` - Get all user images
- `POST /api/images/upload` - Upload images (multipart/form-data)
- `DELETE /api/images/:id` - Delete an image

### Questions
- `POST /api/questions/generate` - Generate questions from images
- `GET /api/questions/session/:sessionId` - Get questions from a session
- `GET /api/questions/sessions` - Get all user sessions

## Project Structure

```
edu/
├── ai-service/              # NEW: AI service with Ollama
│   ├── app.py              # Flask API server
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile          # Docker configuration
│   └── README.md           # AI service docs
├── backend/
│   ├── routes/
│   │   ├── auth.js         # Authentication routes
│   │   ├── images.js       # Image upload/management
│   │   └── questions.js    # Question generation (updated)
│   ├── middleware/
│   │   └── auth.js         # JWT authentication middleware
│   ├── uploads/            # Uploaded images storage
│   ├── database.js         # SQLite database setup
│   ├── server.js           # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Dashboard.js
│   │   │   ├── ImageUpload.js
│   │   │   ├── QuestionGenerator.js
│   │   │   └── QuestionDisplay.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── package.json            # Root package with scripts
```

## Database Schema

The application uses SQLite with the following tables:
- **users**: User accounts
- **images**: Uploaded textbook images
- **question_sessions**: Question generation sessions
- **questions**: Generated questions
- **session_images**: Links sessions to images

## Question Types Explained

1. **True/False**: Statements that require true or false answers
2. **Fill in the Blanks**: Sentences with missing words (marked with _____)
3. **Match the Following**: Two columns of items to be matched
4. **Short Answer**: Questions requiring 2-3 sentence answers
5. **Long Answer**: Questions requiring detailed paragraph answers
6. **Higher Order Thinking**: Questions that test analysis, evaluation, and creation skills

## Troubleshooting

### AI Service won't start

**Error: "Cannot connect to Ollama"**
- Make sure Ollama is installed and running:
  ```bash
  ollama serve
  ```
- Check if Ollama is accessible:
  ```bash
  curl http://localhost:11434/api/tags
  ```

**Error: "Model not found: llava"**
- Download the LLaVA model:
  ```bash
  ollama pull llava
  ```

### Backend won't start
- Ensure port 5001 is not in use (changed from 5000 due to macOS AirPlay)
- Check that `.env` file exists in `backend/` directory
- Verify AI_SERVICE_URL is correct in `.env`

### Frontend won't start
- Ensure port 3000 is not in use
- Check that all dependencies are installed: `cd frontend && npm install`

### Image upload fails
- Check file size (max 50MB per image)
- Supported formats: JPEG, PNG, GIF, WebP, BMP, TIFF, HEIC/HEIF, SVG
- HEIC files from iPhones are automatically converted to JPEG
- Verify `backend/uploads/` directory exists
- Check backend console for conversion errors if HEIC files fail

### Question generation fails

**Error: "AI service is not running"**
- Start the AI service first (Terminal 1 in the setup instructions)
- Check that port 5002 is not blocked

**Slow generation (30+ seconds)**
- This is normal for local AI models
- First request is slowest (model loading)
- Subsequent requests are faster
- Consider using fewer images (5-7 works well)

**Out of memory errors**
- Close other applications
- Ensure you have at least 8GB RAM available
- Try with fewer/smaller images

## Deployment

### Frontend + Backend → Vercel

The Node.js backend and React frontend can be deployed to Vercel:

1. Push your code to GitHub
2. Import project to Vercel
3. Set environment variables in Vercel dashboard:
   - `JWT_SECRET`
   - `AI_SERVICE_URL` (point to your hosted AI service)

### AI Service → Options

Since Vercel can't run AI models, deploy the AI service separately:

**Option 1: Your Own Computer (Free)**
- Keep it running on your computer
- Expose via ngrok or Cloudflare Tunnel:
  ```bash
  ngrok http 5002
  # Update AI_SERVICE_URL in Vercel to the ngrok URL
  ```

**Option 2: Railway (Free Tier)**
- Deploy ai-service to Railway
- Railway provides 500 free hours/month
- Update AI_SERVICE_URL to Railway URL

**Option 3: Self-Hosted Server**
- Deploy to any VPS (DigitalOcean, Linode, AWS EC2)
- Requires 8GB+ RAM
- See `ai-service/README.md` for Docker deployment

## Security Notes

- Change the `JWT_SECRET` in production
- Never commit `.env` files to version control
- Images are stored locally in `backend/uploads/`
- Passwords are hashed using bcrypt
- JWT tokens expire after 7 days
- AI runs locally - no data sent to external APIs

## Future Enhancements

- Export questions to PDF or DOCX
- Question history and favorites
- Collaborative question banks
- Multiple choice questions
- Image annotation for context
- Question difficulty levels
- Custom question templates

## License

MIT

## Support

For issues or questions, please create an issue in the project repository.
