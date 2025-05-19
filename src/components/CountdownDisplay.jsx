import React from 'react';
import { formatTime, getCountdownDisplay } from '../utils/timeUtils';

const CountdownDisplay = ({ timeRemaining }) => {
  const formattedTime = formatTime(timeRemaining, 'hh:mm:ss');
  const readableDisplay = getCountdownDisplay(timeRemaining);
  
  return (
    <div className="countdown-display">
      <div className="countdown-timer">
        {formattedTime}
      </div>
      <div className="countdown-readable">
        {readableDisplay}
      </div>
      <style jsx="true">{`
        .countdown-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 20px 0;
        }
        .countdown-timer {
          font-size: 3rem;
          font-weight: bold;
          background-color: #3498db;
          color: white;
          padding: 15px 30px;
          border-radius: 8px;
          margin-bottom: 10px;
          min-width: 240px;
          text-align: center;
        }
        .countdown-readable {
          font-size: 1.2rem;
          color: #555;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default CountdownDisplay;