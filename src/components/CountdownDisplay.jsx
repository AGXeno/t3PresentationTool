// Import React library for component creation
import React from 'react';
// Import utility functions for time formatting and readable countdown text
import { formatTime, getCountdownDisplay } from '../utils/timeUtils';

// Component that displays a large, prominent countdown timer for presentations
// Shows both precise time format and human-readable description of time remaining
const CountdownDisplay = ({ timeRemaining }) => {
  // Format the time remaining into hours:minutes:seconds format (e.g., "01:23:45")
  const formattedTime = formatTime(timeRemaining, 'hh:mm:ss');
  // Get a human-readable description of the time (e.g., "1 hour and 23 minutes remaining")
  const readableDisplay = getCountdownDisplay(timeRemaining);
  
  return (
    <div className="countdown-display">
      {/* Main countdown timer display - large, bold numerical format */}
      <div className="countdown-timer">
        {formattedTime}
      </div>
      {/* Secondary display - human-readable time description */}
      <div className="countdown-readable">
        {readableDisplay}
      </div>
      {/* Inline CSS-in-JS styling for the countdown component */}
      <style jsx="true">{`
        /* Main container - centers the countdown elements vertically */
        .countdown-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 20px 0;
        }
        /* Primary timer display - large blue box with white text */
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
        /* Secondary readable text - smaller, gray descriptive text */
        .countdown-readable {
          font-size: 1.2rem;
          color: #555;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

// Export the component for use in other parts of the presentation tool
export default CountdownDisplay;