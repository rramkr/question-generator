import React, { useState } from 'react';
import './QuestionGenerator.css';

function QuestionGenerator({ onGenerate, disabled, loading }) {
  const [questionTypes, setQuestionTypes] = useState({
    trueFalse: false,
    fillInTheBlanks: false,
    matchTheFollowing: false,
    shortAnswer: false,
    longAnswer: false,
    higherOrderThinking: false
  });

  const [counts, setCounts] = useState({
    trueFalse: 5,
    fillInTheBlanks: 5,
    matchTheFollowing: 5,
    shortAnswer: 5,
    longAnswer: 3,
    higherOrderThinking: 3
  });

  const handleTypeChange = (type) => {
    setQuestionTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleCountChange = (type, value) => {
    const numValue = parseInt(value) || 1;
    setCounts(prev => ({
      ...prev,
      [type]: Math.max(1, Math.min(20, numValue))
    }));
  };

  const handleGenerate = () => {
    const selectedTypes = Object.keys(questionTypes).filter(key => questionTypes[key]);

    if (selectedTypes.length === 0) {
      alert('Please select at least one question type');
      return;
    }

    const selectedCounts = {};
    selectedTypes.forEach(type => {
      selectedCounts[type] = counts[type];
    });

    onGenerate(questionTypes, selectedCounts);
  };

  const questionTypeLabels = {
    trueFalse: 'True/False',
    fillInTheBlanks: 'Fill in the Blanks',
    matchTheFollowing: 'Match the Following',
    shortAnswer: 'Short Answer',
    longAnswer: 'Long Answer',
    higherOrderThinking: 'Higher Order Thinking'
  };

  return (
    <div className="question-generator">
      <div className="question-types">
        {Object.keys(questionTypes).map(type => (
          <div key={type} className="question-type-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={questionTypes[type]}
                onChange={() => handleTypeChange(type)}
                disabled={disabled}
              />
              <span>{questionTypeLabels[type]}</span>
            </label>
            {questionTypes[type] && (
              <div className="count-input">
                <label>Number of questions:</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={counts[type]}
                  onChange={(e) => handleCountChange(type, e.target.value)}
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleGenerate}
        disabled={disabled || loading}
        className="btn-generate"
      >
        {loading ? 'Generating Questions...' : 'Generate Questions'}
      </button>
    </div>
  );
}

export default QuestionGenerator;
