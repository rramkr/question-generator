import React, { useState } from 'react';
import axios from 'axios';
import API_URL from '../config';
import './ImageUpload.css';

function ImageUpload({ token, onUploadSuccess }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setError('');
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
        />
        <label htmlFor="file-input" className="file-label">
          <div className="upload-icon">📁</div>
          <p>Click to select images or PDFs</p>
          <span className="file-hint">Supports: JPEG, PNG, GIF, WebP, BMP, TIFF, HEIC, SVG, PDF (up to 10MB each)</span>
        </label>
      </div>

      {selectedFiles.length > 0 && (
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
        disabled={selectedFiles.length === 0 || uploading}
        className="btn-upload"
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
}

export default ImageUpload;
