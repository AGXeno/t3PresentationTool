// Import React library for component creation
import React from 'react';
// Import QRCode component from qrcode.react library for generating QR codes
import QRCode from 'qrcode.react';

/**
 * QRCodeDisplay component for showing a scannable QR code in presentations
 * Allows audience members to quickly join the presentation or access resources
 * by scanning the code with their mobile devices
 * 
 * @param {string} url - The URL to encode in the QR code (e.g., presentation join link)
 */
const QRCodeDisplay = ({ url }) => {
  return (
    // Main container for the QR code display section
    <div className="qrcode-display">
      {/* Heading to instruct users what to do with the QR code */}
      <h3>Scan to Participate</h3>
      
      {/* QR code component that encodes the provided URL */}
      <QRCode 
        value={url}     // The URL/text to encode in the QR code
        size={150}      // Size of the QR code in pixels (150x150)
      />
      
      {/* Display the actual URL as text for users who can't scan QR codes */}
      <p className="qrcode-url">{url}</p>
    </div>
  );
};

// Export the component as the default export for use in other parts of the app
export default QRCodeDisplay;