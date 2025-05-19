import React from 'react';

const PresentationDisplay = ({ url }) => {
  return (
    <div className="presentation-display">
      <iframe 
        src={url} 
        title="Team Presentation" 
        className="presentation-iframe"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

export default PresentationDisplay;