import React from 'react';

const PollingDisplay = ({ pollingData, currentTeam }) => {
  if (!pollingData || !pollingData.averages) {
    return <div className="polling-display">Waiting for evaluation data...</div>;
  }

  const { averages, submittedCount, submissions } = pollingData;

  // Convert the grading app format to display format
  const displayData = [
    { category: 'Clarity', value: averages.clarity || 0 },
    { category: 'Delivery', value: averages.delivery || 0 },
    { category: 'Confidence', value: averages.confidence || 0 }
  ];

  return (
    <div className="polling-display">
      <h2>Team {currentTeam?.id || 'X'} Evaluation Results</h2>
      
      {/* Summary Stats */}
      <div className="polling-summary">
        <div className="summary-item">
          <span className="summary-label">Total Responses:</span>
          <span className="summary-value">{submittedCount}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Overall Average:</span>
          <span className="summary-value">
            {averages.clarity && averages.delivery && averages.confidence 
              ? ((averages.clarity + averages.delivery + averages.confidence) / 3).toFixed(1)
              : '--'}
          </span>
        </div>
      </div>

      {/* Individual Category Results */}
      <div className="polling-results">
        {displayData.map((item) => (
          <div key={item.category} className="polling-item">
            <span className="polling-category">{item.category}</span>
            <div className="polling-bar-container">
              <div 
                className="polling-bar" 
                style={{ width: `${(item.value / 10) * 100}%` }}
              />
              <span className="polling-value">{item.value.toFixed(1)}/10</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Feedback (if available) */}
      {submissions && submissions.length > 0 && (
        <div className="recent-feedback">
          <h3>Recent Feedback</h3>
          <div className="feedback-list">
            {submissions
              .filter(submission => submission.feedback && submission.feedback.trim())
              .slice(-3) // Show last 3 feedback comments
              .map((submission, index) => (
                <div key={index} className="feedback-item">
                  <div className="feedback-text">"{submission.feedback}"</div>
                  <div className="feedback-meta">
                    {submission.isAnonymous ? 'Anonymous' : submission.studentName}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PollingDisplay;