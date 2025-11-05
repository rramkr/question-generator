from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import base64
import json
import os

app = Flask(__name__)
CORS(app)

# Ollama API endpoint (runs locally or can be configured for remote)
OLLAMA_API = os.getenv('OLLAMA_API', 'http://localhost:11434')

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        response = requests.get(f'{OLLAMA_API}/api/tags')
        if response.status_code == 200:
            return jsonify({'status': 'healthy', 'ollama': 'connected'}), 200
        return jsonify({'status': 'unhealthy', 'error': 'Ollama not responding'}), 503
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 503

@app.route('/generate-questions', methods=['POST'])
def generate_questions():
    """Generate questions from images using LLaVA model"""
    try:
        data = request.json
        images_base64 = data.get('images', [])
        ocr_text = data.get('ocrText', None)
        question_types = data.get('questionTypes', {})
        counts = data.get('counts', {})

        if not images_base64 and not ocr_text:
            return jsonify({'error': 'No images or text provided'}), 400

        # Build prompt for question generation and track allowed types
        question_requests = []
        allowed_types = []

        if question_types.get('trueFalse'):
            count = counts.get('trueFalse', 5)
            question_requests.append(f"- {count} True/False questions")
            allowed_types.append('true_false')
        if question_types.get('fillInTheBlanks'):
            count = counts.get('fillInTheBlanks', 5)
            question_requests.append(f"- {count} Fill in the Blanks questions")
            allowed_types.append('fill_in_the_blanks')
        if question_types.get('matchTheFollowing'):
            count = counts.get('matchTheFollowing', 5)
            question_requests.append(f"- {count} Match the Following questions")
            allowed_types.append('match_the_following')
        if question_types.get('shortAnswer'):
            count = counts.get('shortAnswer', 5)
            question_requests.append(f"- {count} Short Answer questions")
            allowed_types.append('short_answer')
        if question_types.get('longAnswer'):
            count = counts.get('longAnswer', 3)
            question_requests.append(f"- {count} Long Answer questions")
            allowed_types.append('long_answer')
        if question_types.get('higherOrderThinking'):
            count = counts.get('higherOrderThinking', 3)
            question_requests.append(f"- {count} Higher Order Thinking questions")
            allowed_types.append('higher_order_thinking')

        prompt = f"""You are an expert educator. Analyze the provided textbook images and generate educational questions based ONLY on the content visible in these images.

Generate the following questions:
{chr(10).join(question_requests)}

Requirements:
- Questions must be sourced ONLY from the content in the provided images
- Each question must be unique (no repetition)
- For Fill in the Blanks, use _____ to indicate blanks
- For Match the Following, provide two columns (Column A and Column B) with items to match
- For all questions, provide complete and accurate answers
- Ensure questions are educationally valuable and test understanding

Format your response as a JSON array with this structure:
[
  {{
    "type": "true_false",
    "question": "Question text here",
    "answer": "True" or "False",
    "explanation": "Brief explanation"
  }},
  {{
    "type": "fill_in_the_blanks",
    "question": "Question with _____ for blanks",
    "answer": "The word(s) that fill the blank(s)"
  }},
  {{
    "type": "match_the_following",
    "question": "Match the following:",
    "columnA": ["Item 1", "Item 2", "Item 3"],
    "columnB": ["Match A", "Match B", "Match C"],
    "answer": "Correct matches: 1-B, 2-A, 3-C"
  }},
  {{
    "type": "short_answer",
    "question": "Question text here",
    "answer": "Complete answer in 2-3 sentences"
  }},
  {{
    "type": "long_answer",
    "question": "Question text here",
    "answer": "Detailed answer in paragraph form"
  }},
  {{
    "type": "higher_order_thinking",
    "question": "Question requiring analysis/evaluation/creation",
    "answer": "Comprehensive answer with reasoning"
  }}
]

Return ONLY the JSON array, no additional text."""

        # If OCR text is provided, use it directly instead of processing images
        if ocr_text:
            print(f"Using provided OCR text ({len(ocr_text)} characters)")
            combined_content = f"--- OCR-Extracted Content ---\n{ocr_text}\n"
        else:
            # Call Ollama API with LLaVA model
            # Note: LLaVA currently processes one image at a time
            # For multiple images, we'll concatenate the analysis

            print(f"Processing {len(images_base64)} images with Ollama LLaVA...")

            # Process images one at a time to avoid resource limitations
            # Collect all the content from all images first
            all_content = []

            for idx, img_base64 in enumerate(images_base64):
                print(f"Processing image {idx + 1}/{len(images_base64)}...")

                # Simple prompt to extract content from each image
                content_prompt = """You are reading a textbook page. Extract ONLY the text that is actually visible and readable on this page.

CRITICAL INSTRUCTIONS:
- Read and transcribe ALL visible text exactly as it appears on the page
- Include headings, paragraphs, bullet points, captions - everything you can read
- Do NOT make up or invent any content
- Do NOT add explanations or interpretations
- Do NOT reference content that is not visible on this specific page
- If you cannot read the text clearly, transcribe what you can see

Format: Plain text transcription of everything readable on this page."""

                ollama_payload = {
                    "model": "llava:7b",
                    "prompt": content_prompt,
                    "images": [img_base64],  # Process one image at a time
                    "stream": False
                }

                try:
                    response = requests.post(
                        f'{OLLAMA_API}/api/generate',
                        json=ollama_payload,
                        timeout=120  # 2 minutes per image
                    )

                    if response.status_code == 200:
                        result = response.json()
                        content = result.get('response', '')
                        all_content.append(f"--- Content from Image {idx + 1} ---\n{content}\n")
                        print(f"Successfully processed image {idx + 1}")
                        print(f"Extracted content preview (first 500 chars):\n{content[:500]}\n")
                    else:
                        print(f"Failed to process image {idx + 1}: {response.text}")

                except Exception as e:
                    print(f"Error processing image {idx + 1}: {str(e)}")
                    continue

            # Combine all extracted content
            combined_content = "\n\n".join(all_content)

        # Now generate questions based on the extracted content using a text-only model
        print("Generating questions from extracted content...")
        print(f"Combined content length: {len(combined_content)} characters")
        print(f"Combined content preview (first 1000 chars):\n{combined_content[:1000]}\n")

        # Extract the JSON format instructions from the original prompt
        format_instructions = """
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

Return ONLY the JSON array, no additional text."""

        question_prompt = f"""Based on the following educational content extracted from textbook images, generate questions.

Content:
{combined_content}

Generate EXACTLY the following questions (DO NOT generate any other types):
{chr(10).join(question_requests)}

CRITICAL REQUIREMENTS:
- Questions must be sourced ONLY from the text content provided above
- DO NOT reference diagrams, images, charts, or visual elements (the content above is text-only)
- Only generate the question types listed above - no other types allowed
- Each question must be unique (no repetition)
- Questions should be challenging and educationally valuable for high school or college level students
- Avoid overly simple or childish questions
- For Fill in the Blanks, use _____ to indicate blanks
- For Match the Following, provide two columns (Column A and Column B) with items to match
- For all questions, provide complete and accurate answers

ALLOWED QUESTION TYPES FOR THIS REQUEST: {', '.join(allowed_types)}

{format_instructions}"""

        ollama_payload = {
            "model": "gemma3:4b",  # Use lighter model for question generation
            "prompt": question_prompt,
            "stream": False,
            "format": "json"
        }

        response = requests.post(
            f'{OLLAMA_API}/api/generate',
            json=ollama_payload,
            timeout=180  # 3 minutes for question generation
        )

        if response.status_code != 200:
            error_msg = response.text
            print(f"Ollama API error: {error_msg}")
            return jsonify({
                'error': 'Failed to generate questions',
                'details': error_msg
            }), 500

        result = response.json()

        # Extract the generated text
        generated_text = result.get('response', '')

        # Try to parse as JSON
        try:
            # Try to extract JSON array from response
            import re
            json_match = re.search(r'\[[\s\S]*\]', generated_text)
            if json_match:
                questions = json.loads(json_match.group(0))
            else:
                questions = json.loads(generated_text)
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON response: {e}")
            print(f"Raw response: {generated_text}")
            return jsonify({
                'error': 'Failed to parse AI response',
                'details': 'The model did not return valid JSON',
                'raw_response': generated_text
            }), 500

        # Filter questions to only include requested types
        filtered_questions = [q for q in questions if q.get('type') in allowed_types]

        print(f"Generated {len(questions)} questions, filtered to {len(filtered_questions)} matching requested types")

        if len(filtered_questions) == 0 and len(questions) > 0:
            print(f"Warning: AI generated questions but none match requested types. Requested: {allowed_types}, Got: {[q.get('type') for q in questions]}")

        return jsonify({
            'questions': filtered_questions,
            'model': 'ocr-direct' if ocr_text else 'llava',
            'image_count': len(images_base64) if not ocr_text else 0,
            'ocr_length': len(ocr_text) if ocr_text else 0
        }), 200

    except requests.exceptions.Timeout:
        return jsonify({
            'error': 'Request timeout',
            'details': 'The AI model took too long to respond. Try with fewer images.'
        }), 504
    except requests.exceptions.ConnectionError:
        return jsonify({
            'error': 'Cannot connect to Ollama',
            'details': 'Make sure Ollama is running. Install from https://ollama.com and run: ollama serve'
        }), 503
    except Exception as e:
        print(f"Error generating questions: {str(e)}")
        return jsonify({
            'error': 'Failed to generate questions',
            'details': str(e)
        }), 500

@app.route('/models', methods=['GET'])
def list_models():
    """List available models in Ollama"""
    try:
        response = requests.get(f'{OLLAMA_API}/api/tags')
        if response.status_code == 200:
            return jsonify(response.json()), 200
        return jsonify({'error': 'Failed to fetch models'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5002))
    print(f"Starting AI Service on port {port}")
    print(f"Ollama API: {OLLAMA_API}")
    print("Make sure Ollama is running and llava model is installed:")
    print("  brew install ollama")
    print("  ollama serve")
    print("  ollama pull llava")
    app.run(host='0.0.0.0', port=port, debug=True)
