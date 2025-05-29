// Import React library for component creation
import React from 'react';

/**
 * PresentationDisplay component for embedding external presentations
 * Renders presentations from external sources (like Google Slides, PowerPoint Online, etc.)
 * within an iframe for seamless integration into the presentation tool
 * 
 * @param {string} url - The URL of the presentation to embed (e.g., Google Slides share link)
 */
const PresentationDisplay = ({ url }) => {
  return (
    // Main container for the embedded presentation
    <div className="presentation-display">
      {/* Iframe element to embed the external presentation */}
      <iframe 
        src={url}                              // Source URL of the presentation to embed
        title="Team Presentation"              // Accessible title for screen readers
        className="presentation-iframe"        // CSS class for styling the iframe
        
        // Permissions policy allowing specific browser features for rich presentation content
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        
        allowFullScreen                        // Enables fullscreen mode for the embedded content
      />
    </div>
  );
};

// Export the component as the default export for use in other parts of the app
export default PresentationDisplay;