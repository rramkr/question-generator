const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const convert = require('heic-convert');
const tesseract = require('node-tesseract-ocr');
const { run, get, all } = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit to accommodate various formats
  fileFilter: (req, file, cb) => {
    // Accept a wide variety of image formats and PDFs
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
    const mimetype = allowedMimeTypes.includes(file.mimetype.toLowerCase()) || file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  }
});

// Helper function to convert HEIC to JPEG
async function convertHeicToJpeg(inputPath, outputPath) {
  try {
    const inputBuffer = await fs.promises.readFile(inputPath);
    const outputBuffer = await convert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.95
    });
    await fs.promises.writeFile(outputPath, outputBuffer);
    return true;
  } catch (error) {
    console.error('HEIC conversion error:', error);
    return false;
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


// Helper function to process and normalize images
async function processImage(filePath, originalExt) {
  const ext = originalExt.toLowerCase();
  console.log(`processImage called with: ${filePath}, ext: ${ext}`);

  // If it's a PDF, convert to images
  if (ext === '.pdf') {
    console.log(`Detected PDF file, converting pages to images...`);
    const imagePaths = await convertPdfToImages(filePath);

    if (imagePaths.length > 0) {
      // Delete original PDF
      try {
        await fs.promises.unlink(filePath);
        console.log(`Deleted original PDF file: ${filePath}`);
      } catch (err) {
        console.error('Error deleting PDF file:', err);
      }
      // Return the JSON file path
      return { path: imagePaths[0], filename: path.basename(imagePaths[0]), converted: true };
    }
    console.log(`PDF conversion failed`);
    return { path: filePath, filename: path.basename(filePath), converted: false };
  }

  // If it's HEIC/HEIF, convert to JPEG
  if (ext === '.heic' || ext === '.heif') {
    console.log(`Detected HEIC/HEIF file, converting...`);
    // Replace the extension regardless of case
    const jpegPath = filePath.replace(/\.(heic|heif)$/i, '.jpg');
    console.log(`Target JPEG path: ${jpegPath}`);

    const converted = await convertHeicToJpeg(filePath, jpegPath);
    console.log(`Conversion result: ${converted}`);

    if (converted) {
      // Delete original HEIC file
      try {
        await fs.promises.unlink(filePath);
        console.log(`Deleted original HEIC file: ${filePath}`);
      } catch (err) {
        console.error('Error deleting HEIC file:', err);
      }
      return { path: jpegPath, filename: path.basename(jpegPath), converted: true };
    }
    console.log(`Conversion failed, keeping original file`);
    return { path: filePath, filename: path.basename(filePath), converted: false };
  }

  // For other formats, optionally normalize with sharp (except SVG)
  if (ext !== '.svg') {
    try {
      // Always optimize images to reduce file size for Claude API
      const image = sharp(filePath);
      const metadata = await image.metadata();

      // Resize to max 2000px width and compress to reduce API payload
      // This is crucial for sending multiple images to Claude API
      const shouldOptimize = metadata.width > 2000 || metadata.height > 2000;

      if (shouldOptimize) {
        console.log(`Optimizing image: ${filePath} (${metadata.width}x${metadata.height})`);
        const optimizedPath = filePath.replace(ext, '_optimized' + ext);

        await image
          .resize(2000, 2000, {
            fit: 'inside',
            withoutEnlargement: false
          })
          .jpeg({ quality: 85 }) // Convert to JPEG with good quality
          .toFile(optimizedPath);

        // Replace original with optimized
        await fs.promises.unlink(filePath);
        await fs.promises.rename(optimizedPath, filePath);
        console.log(`Image optimized successfully`);
      }
    } catch (error) {
      console.error('Image optimization error:', error);
      // Continue with original file if optimization fails
    }
  }

  return { path: filePath, filename: path.basename(filePath), converted: false };
}

// Upload images
router.post('/upload', authMiddleware, upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      console.log(`Processing file: ${file.originalname}, path: ${file.path}`);

      // Process the image (convert HEIC if needed, optimize if needed)
      const processedImage = await processImage(file.path, path.extname(file.originalname));

      console.log(`Processed result - filename: ${processedImage.filename}, path: ${processedImage.path}, converted: ${processedImage.converted}`);

      // Save to database
      const result = await run(
        'INSERT INTO images (user_id, filename, original_name, path) VALUES (?, ?, ?, ?)',
        [req.userId, processedImage.filename, file.originalname, processedImage.path]
      );

      uploadedImages.push({
        id: result.lastID,
        filename: processedImage.filename,
        originalName: file.originalname,
        converted: processedImage.converted
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
router.get('/', authMiddleware, async (req, res) => {
  try {
    const images = await all(
      'SELECT id, filename, original_name, uploaded_at FROM images WHERE user_id = ? ORDER BY uploaded_at DESC',
      [req.userId]
    );
    res.json({ images });
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({ error: 'Server error fetching images' });
  }
});

// Delete image
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const image = await get(
      'SELECT * FROM images WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete file
    if (fs.existsSync(image.path)) {
      fs.unlinkSync(image.path);
    }

    // Delete from database
    await run('DELETE FROM images WHERE id = ?', [req.params.id]);

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Server error during deletion' });
  }
});

module.exports = router;
