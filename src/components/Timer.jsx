import React from 'react';
import { formatTime } from '../utils/timeUtils';

const Timer = ({ timeRemaining, format = 'mm:ss', warning = false }) => {
  const formattedTime = formatTime(timeRemaining, format);
  
  return (
    <div className={`timer ${warning ? 'timer-warning' : ''}`}>
      <span className="timer-display">{formattedTime}</span>
    </div>
  );
};

export default Timer;
