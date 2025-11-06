import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config';
import ImageUpload from './ImageUpload';
import QuestionGenerator from './QuestionGenerator';
import QuestionDisplay from './QuestionDisplay';
import './Dashboard.css';

// Authentication bypassed - no token needed
function Dashboard() {
  const [images, setImages] = useState([]);
  const [generatedQuestions, setGeneratedQuestions] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchImages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/images`);
      setImages(response.data.images);
    } catch (error) {
      console.error('Failed to fetch images:', error);
    }
  };

  const handleImageUpload = () => {
    fetchImages();
  };

  const handleDeleteImage = async (imageId) => {
    try {
      await axios.delete(`${API_URL}/api/images/${imageId}`);
      setImages(images.filter(img => img.id !== imageId));
    } catch (error) {
      console.error('Failed to delete image:', error);
      alert('Failed to delete image');
    }
  };

  const handleGenerateQuestions = async (questionTypes, counts) => {
    if (images.length === 0) {
      alert('Please upload at least one image first');
      return;
    }

    setLoading(true);
    setGeneratedQuestions(null);

    // Use all uploaded images
    const allImageIds = images.map(img => img.id);

    try {
      const response = await axios.post(
        `${API_URL}/api/questions/generate`,
        {
          imageIds: allImageIds,
          questionTypes,
          counts
        }
      );

      setGeneratedQuestions(response.data.questions);
    } catch (error) {
      console.error('Failed to generate questions:', error);
      alert(error.response?.data?.error || 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Question Generator</h1>
      </header>

      <div className="dashboard-content">
        <section className="section">
          <h2>Upload Textbook Images</h2>
          <ImageUpload onUploadSuccess={handleImageUpload} />
        </section>

        <section className="section">
          <h2>Your Images ({images.length})</h2>
          {images.length === 0 ? (
            <p className="empty-state">No images uploaded yet. Upload some textbook images to get started.</p>
          ) : (
            <div className="image-grid">
              {images.map(image => (
                <div
                  key={image.id}
                  className="image-card"
                >
                  <img
                    src={`${API_URL}/uploads/${image.filename}`}
                    alt={image.original_name}
                  />
                  <div className="image-info">
                    <span className="image-name">{image.original_name}</span>
                    <button
                      onClick={() => handleDeleteImage(image.id)}
                      className="btn-delete"
                      title="Delete image"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {images.length > 0 && (
          <section className="section">
            <h2>Generate Questions</h2>
            <p className="section-hint">
              Questions will be generated from all {images.length} uploaded image{images.length !== 1 ? 's' : ''}
            </p>
            <QuestionGenerator
              onGenerate={handleGenerateQuestions}
              disabled={loading}
              loading={loading}
            />
          </section>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Analyzing images and generating questions... This may take a minute.</p>
          </div>
        )}

        {generatedQuestions && generatedQuestions.length > 0 && (
          <section className="section">
            <h2>Generated Questions ({generatedQuestions.length})</h2>
            <QuestionDisplay questions={generatedQuestions} />
          </section>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
