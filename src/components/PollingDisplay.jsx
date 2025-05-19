import React from 'react';
import { Bar } from 'recharts';

const PollingDisplay = ({ pollingData }) => {
  if (!pollingData) {
    return <div className="polling-display">Waiting for polling data...</div>;
  }

  return (
    <div className="polling-display">
      <h2>Live Polling Results</h2>
      <div className="polling-results">
        {Object.entries(pollingData).map(([category, value]) => (
          <div key={category} className="polling-item">
            <span className="polling-category">{category}</span>
            <div className="polling-bar-container">
              <div 
                className="polling-bar" 
                style={{ width: `${(value / 5) * 100}%` }}
              />
              <span className="polling-value">{value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PollingDisplay;
