const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const convert = require('heic-convert');
const tesseract = require('node-tesseract-ocr');
const { run, get, all } = require('../database');
// Authentication bypassed - using default user
// const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Default user ID for all operations (auth bypassed)
const DEFAULT_USER_ID = 1;

// Configure multer for file upload (use memory storage)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10 // Max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      'image/svg+xml',
      'image/heic',
      'image/heif',
      'image/heic-sequence',
      'image/heif-sequence',
      'application/pdf'
    ];

    const allowedExtensions = /jpeg|jpg|png|gif|webp|bmp|tiff|tif|svg|heic|heif|pdf/i;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype.toLowerCase()) || file.mimetype.startsWith('image/');

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed.'));
    }
  }
});

// Helper function to convert HEIC to JPEG (works with buffers)
async function convertHeicToJpeg(inputBuffer) {
  try {
    const outputBuffer = await convert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.95
    });
    return outputBuffer;
  } catch (error) {
    console.error('HEIC conversion error:', error);
    return null;
  }
}

// Helper function to extract text from PDF buffer
async function extractTextFromPdf(pdfBuffer) {
  try {
    console.log('Extracting text from PDF buffer');

    // Dynamically import pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    // Load PDF to extract text only (no rendering)
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    console.log(`PDF has ${numPages} pages`);

    // Extract text from all pages (limit to 20 pages)
    let allText = '';
    const maxPages = Math.min(numPages, 20);

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      allText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
    }

    if (!allText || allText.trim().length === 0) {
      console.log('No text found in PDF - this may be an image-based/scanned PDF');
      throw new Error('No text could be extracted from the PDF. This may be a scanned PDF. Please convert it to images or use OCR.');
    }

    console.log(`Extracted ${allText.length} characters from PDF (${maxPages} pages)`);
    console.log('Sample text:', allText.substring(0, 200));

    return {
      text: allText,
      pages: maxPages,
      totalPages: numPages
    };
  } catch (error) {
    console.error('PDF text extraction error:', error);
    throw error;
  }
}

// Helper function to extract text from PDF and create a simple text image
async function convertPdfToImages(pdfPath) {
  try {
    console.log(`Extracting text from PDF: ${pdfPath}`);

    // Dynamically import pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    // Read the PDF file
    const pdfData = new Uint8Array(fs.readFileSync(pdfPath));

    // Load PDF to extract text only (no rendering)
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      useSystemFonts: true
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    console.log(`PDF has ${numPages} pages`);

    // Extract text from all pages
    let allText = '';
    const maxPages = Math.min(numPages, 10);

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      allText += pageText + '\n\n';
    }

    if (!allText || allText.trim().length === 0) {
      console.log('No text found in PDF - this appears to be an image-based/scanned PDF');
      console.log('Attempting OCR to extract text from scanned PDF...');

      // Use poppler's pdftoppm to convert PDF pages to images, then OCR
      const { execSync } = require('child_process');
      const uploadDir = path.dirname(pdfPath);
      const baseFilename = path.basename(pdfPath, '.pdf');
      const tempImagePrefix = path.join(uploadDir, `${baseFilename}_temp`);

      try {
        // Convert PDF to PNG images (one per page)
        execSync(`pdftoppm -png -r 300 "${pdfPath}" "${tempImagePrefix}"`, {
          stdio: 'inherit'
        });

        // Find generated PNG files
        const tempImages = fs.readdirSync(uploadDir)
          .filter(f => f.startsWith(`${baseFilename}_temp`) && f.endsWith('.png'))
          .map(f => path.join(uploadDir, f))
          .sort();

        console.log(`Generated ${tempImages.length} image(s) from PDF`);

        // OCR each image
        let ocrText = '';
        for (let i = 0; i < Math.min(tempImages.length, 10); i++) {
          const imgPath = tempImages[i];
          console.log(`OCR processing page ${i + 1}...`);

          try {
            const pageText = await tesseract.recognize(imgPath, {
              lang: 'eng',
              oem: 1,
              psm: 3
            });
            ocrText += pageText + '\n\n';
            console.log(`OCR extracted ${pageText.length} characters from page ${i + 1}`);
          } catch (ocrError) {
            console.error(`OCR failed for page ${i + 1}:`, ocrError.message);
          }

          // Clean up temp image
          fs.unlinkSync(imgPath);
        }

        // Clean up any remaining temp images
        tempImages.forEach(img => {
          if (fs.existsSync(img)) {
            fs.unlinkSync(img);
          }
        });

        if (!ocrText || ocrText.trim().length === 0) {
          console.log('OCR failed to extract text from PDF');
          return [];
        }

        console.log(`OCR extracted ${ocrText.length} total characters`);
        allText = ocrText;

      } catch (ocrError) {
        console.error('OCR processing error:', ocrError.message);
        return [];
      }
    }

    console.log('Sample text:', allText.substring(0, 200));

    console.log(`Extracted ${allText.length} characters from PDF`);

    // Save the OCR text to a file for direct use in question generation
    const baseFilename = path.basename(pdfPath, '.pdf');
    const uploadDir = path.dirname(pdfPath);
    const textFilePath = path.join(uploadDir, `${baseFilename}_text.json`);

    // Store the extracted text
    await fs.promises.writeFile(textFilePath, JSON.stringify({
      text: allText,
      source: 'ocr',
      pages: Math.min(numPages, 10)
    }));

    console.log(`Saved OCR text to: ${textFilePath}`);

    // Don't create images - just return the text file path
    return [textFilePath];
  } catch (error) {
    console.error('PDF text extraction error:', error);
    return [];
  }
}


// Helper function to process and normalize images (works with buffers)
async function processImageBuffer(buffer, originalExt, originalName) {
  const ext = originalExt.toLowerCase();
  console.log(`processImageBuffer called for: ${originalName}, ext: ${ext}`);

  let processedBuffer = buffer;
  let finalFilename = originalName;
  let mimeType = 'image/jpeg';

  // Handle PDFs by extracting text
  if (ext === '.pdf') {
    console.log('Processing PDF file');
    const pdfData = await extractTextFromPdf(buffer);

    // Store the extracted text as a JSON buffer
    const textData = JSON.stringify({
      text: pdfData.text,
      source: 'pdf',
      pages: pdfData.pages,
      totalPages: pdfData.totalPages,
      originalName: originalName
    });

    processedBuffer = Buffer.from(textData, 'utf-8');
    mimeType = 'application/json';
    finalFilename = originalName.replace(/\.pdf$/i, '_text.json');

    console.log(`PDF processed: extracted ${pdfData.text.length} characters from ${pdfData.pages} pages`);
    return { buffer: processedBuffer, filename: finalFilename, mimeType };
  }

  // If it's HEIC/HEIF, convert to JPEG
  if (ext === '.heic' || ext === '.heif') {
    console.log(`Detected HEIC/HEIF file, converting...`);
    const convertedBuffer = await convertHeicToJpeg(buffer);

    if (convertedBuffer) {
      processedBuffer = convertedBuffer;
      finalFilename = originalName.replace(/\.(heic|heif)$/i, '.jpg');
      console.log(`HEIC converted successfully`);
    } else {
      console.log(`HEIC conversion failed, keeping original`);
    }
  }

  // For images (except SVG), optimize with sharp
  if (ext !== '.svg') {
    try {
      const image = sharp(processedBuffer);
      const metadata = await image.metadata();

      // Extremely aggressive resize for Vercel limits
      // Max 600px and 60% quality keeps images under 50KB
      console.log(`Optimizing image: ${finalFilename} (${metadata.width}x${metadata.height})`);

      processedBuffer = await image
        .resize(600, 600, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 60 })
        .toBuffer();

      // Update filename to .jpg since we converted to JPEG
      if (!finalFilename.endsWith('.jpg') && !finalFilename.endsWith('.jpeg')) {
        finalFilename = finalFilename.replace(/\.[^.]+$/, '.jpg');
      }

      console.log(`Image optimized successfully`);
    } catch (error) {
      console.error('Image optimization error:', error);
      // Continue with original buffer if optimization fails
    }
  }

  return { buffer: processedBuffer, filename: finalFilename, mimeType };
}

// Upload images
router.post('/upload', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      console.log(`Processing file: ${file.originalname}, size: ${file.size} bytes`);

      // Process the image (convert HEIC if needed, optimize)
      const processedImage = await processImageBuffer(
        file.buffer,
        path.extname(file.originalname),
        file.originalname
      );

      console.log(`Processed result - filename: ${processedImage.filename}`);

      // Store image as base64 data URL for simplicity (works on all platforms)
      const base64Data = processedImage.buffer.toString('base64');
      const dataUrl = `data:${processedImage.mimeType};base64,${base64Data}`;

      console.log(`Converted to base64 (${Math.round(base64Data.length / 1024)}KB)`);

      // Save to database with data URL
      const result = await run(
        'INSERT INTO images (user_id, filename, original_name, path) VALUES (?, ?, ?, ?)',
        [DEFAULT_USER_ID, processedImage.filename, file.originalname, dataUrl]
      );

      uploadedImages.push({
        id: result.lastID,
        filename: processedImage.filename,
        originalName: file.originalname
      });
    }

    res.json({
      message: 'Images uploaded successfully',
      images: uploadedImages
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Server error during upload', details: error.message });
  }
});

// Get user's images
router.get('/', async (req, res) => {
  try {
    const images = await all(
      'SELECT id, filename, original_name, uploaded_at FROM images WHERE user_id = ? ORDER BY uploaded_at DESC',
      [DEFAULT_USER_ID]
    );
    res.json({ images });
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({ error: 'Server error fetching images' });
  }
});

// Delete image
router.delete('/:id', async (req, res) => {
  try {
    const image = await get(
      'SELECT * FROM images WHERE id = ? AND user_id = ?',
      [req.params.id, DEFAULT_USER_ID]
    );

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete local file if it exists (backward compatibility)
    if (image.path && !image.path.startsWith('data:') && !image.path.startsWith('http') && fs.existsSync(image.path)) {
      fs.unlinkSync(image.path);
      console.log(`Deleted local file: ${image.path}`);
    }

    // Delete from database (data URL is stored in path column, no external cleanup needed)
    await run('DELETE FROM images WHERE id = ?', [req.params.id]);

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Server error during deletion' });
  }
});

module.exports = router;
