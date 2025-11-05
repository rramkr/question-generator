const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyDemoKeyPleaseReplace');

async function generateQuestionsFromImages(images, ocrText, questionTypes, counts) {
  try {
    // Use Gemini 2.5 Flash (free tier, supports vision)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Build question requests
    const questionRequests = [];
    const allowedTypes = [];

    if (questionTypes.trueFalse) {
      questionRequests.push(`- ${counts.trueFalse || 5} True/False questions`);
      allowedTypes.push('true_false');
    }
    if (questionTypes.fillInTheBlanks) {
      questionRequests.push(`- ${counts.fillInTheBlanks || 5} Fill in the Blanks questions`);
      allowedTypes.push('fill_in_the_blanks');
    }
    if (questionTypes.matchTheFollowing) {
      questionRequests.push(`- ${counts.matchTheFollowing || 5} Match the Following questions`);
      allowedTypes.push('match_the_following');
    }
    if (questionTypes.shortAnswer) {
      questionRequests.push(`- ${counts.shortAnswer || 5} Short Answer questions`);
      allowedTypes.push('short_answer');
    }
    if (questionTypes.longAnswer) {
      questionRequests.push(`- ${counts.longAnswer || 3} Long Answer questions`);
      allowedTypes.push('long_answer');
    }
    if (questionTypes.higherOrderThinking) {
      questionRequests.push(`- ${counts.higherOrderThinking || 3} Higher Order Thinking questions`);
      allowedTypes.push('higher_order_thinking');
    }

    let prompt;
    let parts = [];

    if (ocrText) {
      // Use OCR text directly
      prompt = `Based on the following educational content extracted from textbook images, generate questions.

Content:
${ocrText}

Generate EXACTLY the following questions (DO NOT generate any other types):
${questionRequests.join('\n')}

CRITICAL REQUIREMENTS:
- Questions must be sourced ONLY from the text content provided above
- DO NOT reference diagrams, images, charts, or visual elements
- Only generate the question types listed above - no other types allowed
- Each question must be unique (no repetition)
- Questions should be challenging and educationally valuable for high school or college level students
- Avoid overly simple or childish questions
- For Fill in the Blanks, use _____ to indicate blanks
- For Match the Following, provide two columns (Column A and Column B) with items to match
- For all questions, provide complete and accurate answers

ALLOWED QUESTION TYPES FOR THIS REQUEST: ${allowedTypes.join(', ')}

Format your response as a JSON array with this structure:
[
  {
    "type": "true_false",
    "question": "Question text here",
    "answer": "True" or "False",
    "explanation": "Brief explanation"
  },
  {
    "type": "fill_in_the_blanks",
    "question": "Question with _____ for blanks",
    "answer": "The word(s) that fill the blank(s)"
  },
  {
    "type": "match_the_following",
    "question": "Match the following:",
    "columnA": ["Item 1", "Item 2", "Item 3"],
    "columnB": ["Match A", "Match B", "Match C"],
    "answer": "Correct matches: 1-B, 2-A, 3-C"
  },
  {
    "type": "short_answer",
    "question": "Question text here",
    "answer": "Complete answer in 2-3 sentences"
  },
  {
    "type": "long_answer",
    "question": "Question text here",
    "answer": "Detailed answer in paragraph form"
  },
  {
    "type": "higher_order_thinking",
    "question": "Question requiring analysis/evaluation/creation",
    "answer": "Comprehensive answer with reasoning"
  }
]

Return ONLY the JSON array, no additional text.`;

      parts = [{ text: prompt }];
    } else {
      // Use images with vision model
      prompt = `You are an expert educator. Analyze the provided textbook images and generate educational questions based ONLY on the content visible in these images.

Generate EXACTLY the following questions (DO NOT generate any other types):
${questionRequests.join('\n')}

CRITICAL REQUIREMENTS:
- Questions must be sourced ONLY from the content visible in the images
- DO NOT reference content that is not visible in the provided images
- Only generate the question types listed above - no other types allowed
- Each question must be unique (no repetition)
- Questions should be challenging and educationally valuable for high school or college level students
- Avoid overly simple or childish questions
- For Fill in the Blanks, use _____ to indicate blanks
- For Match the Following, provide two columns (Column A and Column B) with items to match
- For all questions, provide complete and accurate answers

ALLOWED QUESTION TYPES FOR THIS REQUEST: ${allowedTypes.join(', ')}

Format your response as a JSON array with this structure:
[
  {
    "type": "true_false",
    "question": "Question text here",
    "answer": "True" or "False",
    "explanation": "Brief explanation"
  },
  {
    "type": "fill_in_the_blanks",
    "question": "Question with _____ for blanks",
    "answer": "The word(s) that fill the blank(s)"
  },
  {
    "type": "match_the_following",
    "question": "Match the following:",
    "columnA": ["Item 1", "Item 2", "Item 3"],
    "columnB": ["Match A", "Match B", "Match C"],
    "answer": "Correct matches: 1-B, 2-A, 3-C"
  },
  {
    "type": "short_answer",
    "question": "Question text here",
    "answer": "Complete answer in 2-3 sentences"
  },
  {
    "type": "long_answer",
    "question": "Question text here",
    "answer": "Detailed answer in paragraph form"
  },
  {
    "type": "higher_order_thinking",
    "question": "Question requiring analysis/evaluation/creation",
    "answer": "Comprehensive answer with reasoning"
  }
]

Return ONLY the JSON array, no additional text.`;

      parts = [{ text: prompt }];

      // Add images
      for (const imageBase64 of images) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64
          }
        });
      }
    }

    console.log(`Generating questions with Gemini (${ocrText ? 'text-only' : images.length + ' images'})...`);

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();

    console.log('Gemini response received, parsing JSON...');

    // Parse JSON from response
    let questions;
    try {
      // Try to extract JSON array from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(text);
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      console.log('Raw response:', text.substring(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }

    // Filter questions to only include requested types
    const filteredQuestions = questions.filter(q => allowedTypes.includes(q.type));

    console.log(`Generated ${questions.length} questions, filtered to ${filteredQuestions.length} matching requested types`);

    return {
      questions: filteredQuestions,
      model: 'gemini-2.5-flash',
      source: ocrText ? 'ocr-text' : 'vision'
    };

  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

module.exports = { generateQuestionsFromImages };
