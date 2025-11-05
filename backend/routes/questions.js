const express = require('express');
const axios = require('axios');
const fs = require('fs');
const { run, get, all } = require('../database');
const authMiddleware = require('../middleware/auth');
const { generateQuestionsFromImages } = require('../services/gemini');

const router = express.Router();

// Generate questions from images
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { imageIds, questionTypes, counts } = req.body;

    if (!imageIds || imageIds.length === 0) {
      return res.status(400).json({ error: 'No images selected' });
    }

    if (!questionTypes || Object.keys(questionTypes).length === 0) {
      return res.status(400).json({ error: 'No question types selected' });
    }

    // Get images (remove access control check since /tmp database gets wiped)
    const placeholders = imageIds.map(() => '?').join(',');
    const images = await all(
      `SELECT * FROM images WHERE id IN (${placeholders})`,
      imageIds
    );

    if (images.length === 0) {
      return res.status(404).json({ error: 'Images not found. Please re-upload your images.' });
    }

    // Create question session
    const sessionResult = await run('INSERT INTO question_sessions (user_id) VALUES (?)', [req.userId]);
    const sessionId = sessionResult.lastID;

    // Link images to session
    for (const imageId of imageIds) {
      await run('INSERT INTO session_images (session_id, image_id) VALUES (?, ?)', [sessionId, imageId]);
    }

    // Prepare images as base64 for AI service OR collect OCR text
    // Optimize images to reduce payload size
    const sharp = require('sharp');
    const path = require('path');
    const imagesBase64 = [];
    const missingFiles = [];
    let ocrText = '';

    for (const img of images) {
      // Check if this is a JSON file (text from PDF or OCR)
      if (img.path.startsWith('data:application/json')) {
        try {
          // Extract JSON from data URL
          const base64Match = img.path.match(/^data:application\/json;base64,(.+)$/);
          if (base64Match) {
            const jsonString = Buffer.from(base64Match[1], 'base64').toString('utf8');
            const textData = JSON.parse(jsonString);
            if ((textData.source === 'pdf' || textData.source === 'ocr') && textData.text) {
              ocrText += textData.text + '\n\n';
              console.log(`Using text from ${img.filename} (${textData.text.length} characters)`);
              continue; // Skip to next image
            }
          }
        } catch (err) {
          console.error(`Error reading text file: ${err.message}`);
          missingFiles.push(img.original_name || img.filename);
          continue;
        }
      }

      try {
        let imageBuffer;

        // Check if this is a data URL, external URL, or local file
        if (img.path.startsWith('data:')) {
          // Extract base64 data from data URL
          console.log(`Extracting base64 from data URL for ${img.filename}`);
          const base64Match = img.path.match(/^data:image\/\w+;base64,(.+)$/);
          if (base64Match) {
            imageBuffer = Buffer.from(base64Match[1], 'base64');
          } else {
            console.error(`Invalid data URL format: ${img.path.substring(0, 50)}...`);
            missingFiles.push(img.original_name || img.filename);
            continue;
          }
        } else if (img.path.startsWith('https://') || img.path.startsWith('http://')) {
          // Fetch image from external URL
          console.log(`Fetching image from URL: ${img.path}`);
          const response = await axios.get(img.path, { responseType: 'arraybuffer' });
          imageBuffer = Buffer.from(response.data);
        } else if (fs.existsSync(img.path)) {
          // Read from local filesystem (backward compatibility)
          imageBuffer = fs.readFileSync(img.path);
        } else {
          missingFiles.push(img.original_name || img.filename);
          console.error(`Image not found: ${img.path}`);
          continue;
        }

        // Resize and compress image for AI service to reduce payload
        // Max 800px width, 85% quality JPEG
        const optimizedBuffer = await sharp(imageBuffer)
          .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85 })
          .toBuffer();

        const base64Image = optimizedBuffer.toString('base64');
        imagesBase64.push(base64Image);
        console.log(`Optimized image ${img.filename} for AI service (reduced to ${Math.round(base64Image.length / 1024)}KB)`);
      } catch (error) {
        console.error(`Error processing image ${img.path}:`, error);
        missingFiles.push(img.original_name || img.filename);
      }
    }

    // If no valid images or OCR text were found
    if (imagesBase64.length === 0 && !ocrText) {
      return res.status(400).json({
        error: 'No valid images found. Please delete and re-upload your images.',
        missingFiles
      });
    }

    // Warn if some files were missing
    if (missingFiles.length > 0) {
      console.warn(`Some image files were not found: ${missingFiles.join(', ')}`);
    }

    if (ocrText) {
      console.log(`Using OCR text (${ocrText.length} characters) instead of images`);
    } else {
      console.log(`Calling Gemini API with ${imagesBase64.length} images`);
    }

    // Call Gemini service
    let aiResponse;
    try {
      aiResponse = await generateQuestionsFromImages(
        imagesBase64,
        ocrText,
        questionTypes,
        counts
      );
    } catch (aiError) {
      console.error('Gemini API error:', aiError.message);

      if (aiError.message && aiError.message.includes('API key')) {
        return res.status(503).json({
          error: 'Gemini API key not configured',
          details: 'Please set GEMINI_API_KEY environment variable. Get a free key from https://ai.google.dev/'
        });
      }

      return res.status(500).json({
        error: 'AI service error',
        details: aiError.message
      });
    }

    console.log('Gemini Response:', JSON.stringify(aiResponse).substring(0, 500));

    const questionsData = aiResponse.questions;

    // Validate response
    if (!questionsData) {
      console.error('No questions in AI response:', aiResponse);
      return res.status(500).json({
        error: 'AI service returned invalid response',
        details: 'No questions array found in response'
      });
    }

    if (!Array.isArray(questionsData)) {
      console.error('Questions data is not an array:', typeof questionsData, questionsData);
      return res.status(500).json({
        error: 'AI service returned invalid response',
        details: `Expected array of questions, got ${typeof questionsData}`
      });
    }

    if (questionsData.length === 0) {
      return res.status(400).json({
        error: 'No questions generated',
        details: 'The AI service did not generate any questions from the images'
      });
    }

    // Save questions to database
    const savedQuestions = [];

    for (const q of questionsData) {
      const options = q.columnA && q.columnB ? JSON.stringify({ columnA: q.columnA, columnB: q.columnB, explanation: q.explanation }) : (q.explanation ? JSON.stringify({ explanation: q.explanation }) : null);

      const result = await run(
        'INSERT INTO questions (session_id, type, question_text, answer, options) VALUES (?, ?, ?, ?, ?)',
        [sessionId, q.type, q.question, q.answer, options]
      );

      savedQuestions.push({
        id: result.lastID,
        type: q.type,
        question: q.question,
        answer: q.answer,
        columnA: q.columnA,
        columnB: q.columnB,
        explanation: q.explanation
      });
    }

    res.json({
      sessionId,
      questions: savedQuestions
    });

  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ error: 'Failed to generate questions', details: error.message });
  }
});

// Get questions from a session
router.get('/session/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session belongs to user
    const session = await get(
      'SELECT * FROM question_sessions WHERE id = ? AND user_id = ?',
      [sessionId, req.userId]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get questions
    const questions = await all(
      'SELECT * FROM questions WHERE session_id = ? ORDER BY created_at',
      [sessionId]
    );

    // Parse options for each question
    const parsedQuestions = questions.map(q => {
      const parsed = {
        id: q.id,
        type: q.type,
        question: q.question_text,
        answer: q.answer,
        createdAt: q.created_at
      };

      if (q.options) {
        try {
          const options = JSON.parse(q.options);
          Object.assign(parsed, options);
        } catch (e) {
          console.error('Failed to parse options:', e);
        }
      }

      return parsed;
    });

    res.json({ questions: parsedQuestions });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Get all sessions for user
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const sessions = await all(`
      SELECT
        qs.id,
        qs.created_at,
        COUNT(q.id) as question_count
      FROM question_sessions qs
      LEFT JOIN questions q ON qs.id = q.session_id
      WHERE qs.user_id = ?
      GROUP BY qs.id
      ORDER BY qs.created_at DESC
    `, [req.userId]);

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

module.exports = router;
