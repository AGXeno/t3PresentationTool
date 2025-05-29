// Import React library for component creation
import React from 'react';

// Component that displays real-time evaluation results for team presentations
// Shows scoring averages, response counts, and recent feedback from audience/evaluators
const PollingDisplay = ({ pollingData, currentTeam }) => {
  // Early return if no polling data is available yet - shows loading message
  if (!pollingData || !pollingData.averages) {
    return <div className="polling-display">Waiting for evaluation data...</div>;
  }

  // Destructure the polling data to extract averages, count, and individual submissions
  const { averages, submittedCount, submissions } = pollingData;

  // Convert the grading app format to display format
  // Transform the raw averages into an array of objects for easier rendering
  const displayData = [
    { category: 'Clarity', value: averages.clarity || 0 },
    { category: 'Delivery', value: averages.delivery || 0 },
    { category: 'Confidence', value: averages.confidence || 0 }
  ];

  return (
    <div className="polling-display">
      {/* Display which team is currently being evaluated */}
      <h2>Team {currentTeam?.id || 'X'} Evaluation Results</h2>
      
      {/* Summary Stats */}
      {/* Section showing high-level statistics about the evaluation responses */}
      <div className="polling-summary">
        {/* Display total number of people who have submitted evaluations */}
        <div className="summary-item">
          <span className="summary-label">Total Responses:</span>
          <span className="summary-value">{submittedCount}</span>
        </div>
        {/* Calculate and display overall average score across all categories */}
        <div className="summary-item">
          <span className="summary-label">Overall Average:</span>
          <span className="summary-value">
            {/* Only calculate average if all three categories have scores */}
            {averages.clarity && averages.delivery && averages.confidence 
              ? ((averages.clarity + averages.delivery + averages.confidence) / 3).toFixed(1)
              : '--'}
          </span>
        </div>
      </div>

      {/* Individual Category Results */}
      {/* Section displaying detailed scores for each evaluation category */}
      <div className="polling-results">
        {/* Loop through each category and render a visual bar chart */}
        {displayData.map((item) => (
          <div key={item.category} className="polling-item">
            {/* Category name (Clarity, Delivery, Confidence) */}
            <span className="polling-category">{item.category}</span>
            {/* Visual progress bar container */}
            <div className="polling-bar-container">
              {/* Colored bar representing the score visually (width based on score/10) */}
              <div 
                className="polling-bar" 
                style={{ width: `${(item.value / 10) * 100}%` }}
              />
              {/* Numerical score display (e.g., "7.5/10") */}
              <span className="polling-value">{item.value.toFixed(1)}/10</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Feedback (if available) */}
      {/* Section showing written comments from evaluators, only renders if feedback exists */}
      {submissions && submissions.length > 0 && (
        <div className="recent-feedback">
          <h3>Recent Feedback</h3>
          <div className="feedback-list">
            {/* Filter out empty feedback, take only the last 3 comments, and display them */}
            {submissions
              .filter(submission => submission.feedback && submission.feedback.trim()) // Only include non-empty feedback
              .slice(-3) // Show last 3 feedback comments
              .map((submission, index) => (
                <div key={index} className="feedback-item">
                  {/* The actual feedback text in quotes */}
                  <div className="feedback-text">"{submission.feedback}"</div>
                  {/* Attribution - either student name or "Anonymous" */}
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

// Export the component for use in other parts of the presentation tool
export default PollingDisplay;