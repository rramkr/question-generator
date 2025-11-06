import React, { useState } from 'react';
import axios from 'axios';
import API_URL from '../config';
import './ImageUpload.css';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function ImageUpload({ token, onUploadSuccess }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [processingPdf, setProcessingPdf] = useState(false);

  const convertPdfToImages = async (file) => {
    setProcessingPdf(true);
    const images = [];

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = Math.min(pdf.numPages, 10); // Limit to 10 pages

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        // Convert canvas to blob
        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/jpeg', 0.85);
        });

        // Create File object from blob
        const imageFile = new File(
          [blob],
          `${file.name.replace('.pdf', '')}_page${pageNum}.jpg`,
          { type: 'image/jpeg' }
        );

        images.push(imageFile);
      }

      setProcessingPdf(false);
      return images;
    } catch (err) {
      setProcessingPdf(false);
      console.error('PDF conversion error:', err);
      throw new Error('Failed to convert PDF to images');
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    setError('');
    setProcessingPdf(true);

    try {
      const processedFiles = [];

      for (const file of files) {
        if (file.type === 'application/pdf') {
          // Convert PDF to images
          const images = await convertPdfToImages(file);
          processedFiles.push(...images);
        } else {
          // Regular image file
          processedFiles.push(file);
        }
      }

      setSelectedFiles(processedFiles);
    } catch (err) {
      setError(err.message || 'Failed to process files');
    } finally {
      setProcessingPdf(false);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setUploading(true);
    setError('');
    setUploadMessage('');

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('images', file);
    });

    try {
      await axios.post(`${API_URL}/api/images/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 120000 // 2 minutes timeout for OCR processing
      });

      setSelectedFiles([]);
      setUploadMessage('Upload successful!');

      // Reset file input
      document.getElementById('file-input').value = '';

      // Call success callback to refresh gallery
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setUploadMessage(''), 3000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || err.message || 'Upload failed');
      setUploadMessage('');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-upload">
      <div className="upload-area">
        <input
          id="file-input"
          type="file"
          multiple
          accept="image/*,.heic,.heif,.pdf,application/pdf"
          onChange={handleFileSelect}
          className="file-input"
          disabled={processingPdf}
        />
        <label htmlFor="file-input" className="file-label">
          <div className="upload-icon">📁</div>
          <p>Click to select images or PDFs</p>
          <span className="file-hint">Supports: JPEG, PNG, GIF, WebP, BMP, TIFF, HEIC, SVG, PDF (up to 10MB each). PDFs will be converted to images automatically.</span>
        </label>
      </div>

      {processingPdf && (
        <div className="upload-message" style={{color: '#007bff', padding: '10px', marginTop: '10px'}}>
          ⏳ Converting PDF to images...
        </div>
      )}

      {selectedFiles.length > 0 && !processingPdf && (
        <div className="selected-files">
          <p><strong>{selectedFiles.length}</strong> file(s) selected:</p>
          <ul>
            {selectedFiles.map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}

      {uploadMessage && <div className="upload-message" style={{color: '#28a745', padding: '10px', marginTop: '10px'}}>{uploadMessage}</div>}
      {error && <div className="error-message">{error}</div>}

      <button
        onClick={handleUpload}
        disabled={selectedFiles.length === 0 || uploading || processingPdf}
        className="btn-upload"
      >
        {uploading ? 'Uploading...' : processingPdf ? 'Processing...' : 'Upload'}
      </button>
    </div>
  );
}

export default ImageUpload;
