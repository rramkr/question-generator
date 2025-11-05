import React, { useState } from 'react';
import './QuestionDisplay.css';

function QuestionDisplay({ questions }) {
  const [showAnswers, setShowAnswers] = useState({});

  const toggleAnswer = (index) => {
    setShowAnswers(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleAllAnswers = () => {
    const allShown = Object.keys(showAnswers).length === questions.length &&
                     Object.values(showAnswers).every(v => v);

    const newState = {};
    questions.forEach((_, index) => {
      newState[index] = !allShown;
    });
    setShowAnswers(newState);
  };

  const getTypeLabel = (type) => {
    const labels = {
      'true_false': 'True/False',
      'fill_in_the_blanks': 'Fill in the Blanks',
      'match_the_following': 'Match the Following',
      'short_answer': 'Short Answer',
      'long_answer': 'Long Answer',
      'higher_order_thinking': 'Higher Order Thinking'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      'true_false': '#2196f3',
      'fill_in_the_blanks': '#ff9800',
      'match_the_following': '#9c27b0',
      'short_answer': '#4caf50',
      'long_answer': '#f44336',
      'higher_order_thinking': '#673ab7'
    };
    return colors[type] || '#757575';
  };

  return (
    <div className="question-display">
      <div className="display-header">
        <button onClick={toggleAllAnswers} className="btn-toggle-all">
          {Object.values(showAnswers).every(v => v) ? 'Hide All Answers' : 'Show All Answers'}
        </button>
      </div>

      <div className="questions-list">
        {questions.map((q, index) => (
          <div key={index} className="question-item">
            <div className="question-header">
              <span
                className="question-type-badge"
                style={{ backgroundColor: getTypeColor(q.type) }}
              >
                {getTypeLabel(q.type)}
              </span>
              <span className="question-number">Question {index + 1}</span>
            </div>

            <div className="question-content">
              <p className="question-text">{q.question}</p>

              {q.columnA && q.columnB && (
                <div className="match-columns">
                  <div className="column">
                    <h4>Column A</h4>
                    <ol>
                      {q.columnA.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ol>
                  </div>
                  <div className="column">
                    <h4>Column B</h4>
                    <ol type="A">
                      {q.columnB.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              <button
                onClick={() => toggleAnswer(index)}
                className="btn-toggle-answer"
              >
                {showAnswers[index] ? 'Hide Answer' : 'Show Answer'}
              </button>

              {showAnswers[index] && (
                <div className="answer-section">
                  <strong>Answer:</strong>
                  <p>{q.answer}</p>
                  {q.explanation && (
                    <>
                      <strong>Explanation:</strong>
                      <p>{q.explanation}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default QuestionDisplay;
