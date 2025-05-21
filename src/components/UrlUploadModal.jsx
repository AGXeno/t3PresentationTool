import React, { useState } from 'react';

const UrlUploadModal = ({ isOpen, onClose, teams, onUpdateTeamUrl }) => {
  const [selectedTeam, setSelectedTeam] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!selectedTeam) {
      setError('Please select a team');
      return;
    }
    
    if (!url) {
      setError('Please enter a URL');
      return;
    }
    
    // URL validation
    try {
      // Check if URL is valid
      new URL(url);
      
      // Clear errors and show success message
      setError('');
      setSuccess(`URL updated for ${teams.find(t => t.id === parseInt(selectedTeam)).name}`);
      
      // Update the team URL
      onUpdateTeamUrl(parseInt(selectedTeam), url);
      
      // Reset form
      setTimeout(() => {
        setUrl('');
        setSelectedTeam('');
        setSuccess('');
        onClose();
      }, 1500);
      
    } catch (e) {
      setError('Please enter a valid URL (must include http:// or https://)');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Upload Team URL</h2>
        <button className="close-button" onClick={onClose}>×</button>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="team-select">Select Team:</label>
            <select 
              id="team-select"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="team-select"
            >
              <option value="">-- Select a team --</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="url-input">Team URL:</label>
            <input
              id="url-input"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="url-input"
            />
            <small className="hint">Enter the full URL including https://</small>
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Update URL
            </button>
          </div>
        </form>
      </div>
      
      <style jsx="true">{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          position: relative;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .close-button {
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: bold;
          color: #333;
        }
        
        .team-select, .url-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .hint {
          display: block;
          margin-top: 5px;
          color: #777;
          font-size: 0.8em;
        }
        
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 30px;
        }
        
        .cancel-button, .submit-button {
          padding: 10px 20px;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
        }
        
        .cancel-button {
          background-color: #f1f1f1;
          border: 1px solid #ddd;
          color: #333;
        }
        
        .submit-button {
          background-color: #3498db;
          border: none;
          color: white;
        }
        
        .error-message {
          background-color: #ffebee;
          color: #c62828;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        
        .success-message {
          background-color: #e8f5e9;
          color: #2e7d32;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
};

export default UrlUploadModal;