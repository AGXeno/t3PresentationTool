export const calculateTimeRemaining = (startTime, endTime) => {
  return Math.max(0, endTime - startTime);
};

export const formatTime = (milliseconds, format = 'mm:ss') => {
  if (!milliseconds && milliseconds !== 0) return '--:--';
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  
  // Calculate days, hours, minutes, seconds
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  switch (format) {
    case 'dd:hh:mm:ss':
      // Format with days
      return `${padZero(days)}:${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
    case 'hh:mm:ss':
      // Convert days to hours if needed
      const totalHours = days * 24 + hours;
      return `${padZero(totalHours)}:${padZero(minutes)}:${padZero(seconds)}`;
    case 'mm:ss':
      return `${padZero(minutes)}:${padZero(seconds)}`;
    case 'ss':
      return `${padZero(seconds)}`;
    default:
      return `${padZero(minutes)}:${padZero(seconds)}`;
  }
};

// Ensure zero-padding works correctly
const padZero = (num) => {
  return num.toString().padStart(2, '0');
};

// For long countdowns, get a more readable display
export const getCountdownDisplay = (milliseconds) => {
  if (!milliseconds) return 'Time remaining: --';
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (days > 0) {
    return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
  } else if (hours > 0) {
    return `${hours} hours, ${minutes} minutes, ${seconds} seconds`;
  } else {
    return `${minutes} minutes, ${seconds} seconds`;
  }
};