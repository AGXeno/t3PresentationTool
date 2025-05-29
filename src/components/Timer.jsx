// Import React library for component creation
import React from 'react';
// Import utility function to format time values into readable strings
import { formatTime } from '../utils/timeUtils';

/**
 * Timer component for displaying countdown or elapsed time in presentations
 * Useful for timing slides, activities, or Q&A sessions
 * 
 * @param {number} timeRemaining - Time value in seconds to display
 * @param {string} format - Time format string (default: 'mm:ss' for minutes:seconds)
 * @param {boolean} warning - Whether to apply warning styling (e.g., when time is running low)
 */
const Timer = ({ timeRemaining, format = 'mm:ss', warning = false }) => {
  // Convert the raw time value into a formatted string using the utility function
  const formattedTime = formatTime(timeRemaining, format);
  
  return (
    // Main timer container with conditional CSS classes
    <div className={`timer ${warning ? 'timer-warning' : ''}`}>
      {/* Display the formatted time string */}
      <span className="timer-display">{formattedTime}</span>
    </div>
  );
};

// Export the component as the default export for use in other parts of the app
export default Timer;