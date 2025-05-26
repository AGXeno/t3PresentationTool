import React, { useState, useEffect, useRef, memo } from 'react';
import Timer from './components/Timer';
import PresentationDisplay from './components/PresentationDisplay';
import MQTTClient from './services/MQTTClient';
import PollingDisplay from './components/PollingDisplay';
import QRCodeDisplay from './components/QRCodeDisplay';
import CountdownDisplay from './components/CountdownDisplay';
import UrlUploadModal from './components/UrlUploadModal';
import { calculateTimeRemaining, formatTime, getCountdownDisplay } from './utils/timeUtils';

// Memoized TeamUrlsSection component to prevent flashing
const MemoizedTeamUrlsSection = memo(({ teams }) => {
  // Local state for toggle, stored in localStorage to persist between renders
  const [showTeamUrls, setShowTeamUrls] = useState(() => {
    try {
      // Try to get persisted state from localStorage
      const stored = localStorage.getItem('showTeamUrls');
      return stored ? JSON.parse(stored) : false;
    } catch (error) {
      return false;
    }
  });
  
  // Persist the toggle state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('showTeamUrls', JSON.stringify(showTeamUrls));
    } catch (error) {
      console.error('Error storing toggle state:', error);
    }
  }, [showTeamUrls]);
  
  return (
    <div className="team-urls-section">
      <button 
        className="toggle-urls-button"
        onClick={() => setShowTeamUrls(prev => !prev)}
      >
        <svg 
          className="toggle-icon" 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          {showTeamUrls ? (
            // Eye-slash icon when URLs are shown (click to hide)
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
          ) : (
            // Eye icon when URLs are hidden (click to show)
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          )}
          {!showTeamUrls && <circle cx="12" cy="12" r="3"></circle>}
        </svg>
        {showTeamUrls ? 'Hide Team URLs' : 'Show Team URLs'}
      </button>
      
      {/* Show the list of team URLs only when toggle is on */}
      {showTeamUrls && (
        <div className="team-urls-list">
          <h3>Team URLs</h3>
          {teams.map(team => (
            <div key={team.id} className="team-url-item">
              <span className="team-name">{team.name}</span>
              {team.demoUrl ? (
                <span className="team-url" title={team.demoUrl}>
                  {team.demoUrl}
                </span>
              ) : (
                <span className="no-url">No URL set</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

const App = () => {
  // Use ref for the initial time to ensure consistent starting point
  const initialTimeRef = useRef(new Date());
  
  // Change demoMode to true for testing with current time and short durations
  // Set to false for real presentation settings (May 28, 2025 at 2:00 PM with full durations)
  const demoMode = true;
  
  // Create dates based on demo mode
  const createEventDates = () => {
    let startTime, endTime;
    
    if (demoMode) {
      // DEMO MODE: Use current time for testing
      startTime = new Date(initialTimeRef.current);
      // Start the event immediately
      startTime.setSeconds(startTime.getSeconds() + 0);
      
      endTime = new Date(startTime);
      // Total event duration: 6 teams × (team presentation + grading time)
      endTime.setMinutes(endTime.getMinutes() + 90);
      
      console.log('DEMO MODE: Using current time for testing');
    } else {
      // REAL MODE: Use the actual presentation date - May 28, 2025 at 2:00 PM
      startTime = new Date('May 28, 2025 14:00:00');
      
      endTime = new Date(startTime);
      // Total event duration: 6 teams × (team presentation + grading time)
      endTime.setMinutes(endTime.getMinutes() + 90); // End time will be 3:30 PM
      
      console.log('REAL MODE: Using scheduled presentation date: May 28, 2025 at 2:00 PM');
    }
    
    console.log(`Event start: ${startTime.toLocaleString()}`);
    console.log(`Event end: ${endTime.toLocaleString()}`);
    
    return {
      date: startTime,
      endTime: endTime
    };
  };
  
  // Event configuration with dates based on mode
  const eventConfig = {
    ...createEventDates(),
    teamCount: 6,
    presentationTime: demoMode ? (30 * 1000) : (12 * 60 * 1000), // 30 sec or 12 min
    gradingTime: demoMode ? (40 * 1000) : (3 * 60 * 1000),       // 15 sec or 3 min
    warningTime: demoMode ? (10 * 1000) : (60 * 1000)            // 10 sec or 1 min warning
  };
  
  // URL upload modal state
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  
  // Convert teams array to state so we can update it
  const [teams, setTeams] = useState([
    { id: 1, name: 'Team 1', demoUrl: 'https://example.com/' },
    { id: 2, name: 'Team 2', demoUrl: 'https://httpbin.org/' },
    { id: 3, name: 'Team 3', demoUrl: 'https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/demo/line-basic/' },
    { id: 4, name: 'Team 4', demoUrl: 'https://codepen.io/pen/' },
    { id: 5, name: 'Team 5', demoUrl: 'https://en.m.wikipedia.org/wiki/Main_Page' },
    { id: 6, name: 'Team 6', demoUrl: 'https://www.w3schools.com/html/tryit.asp?filename=tryhtml_basic' },
  ]);

  // Application state
  const [currentState, setCurrentState] = useState('countdown'); // countdown, presentation, grading
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [counter, setCounter] = useState(0); // Add a counter to force re-renders
  const [pollResponses, setPollResponses] = useState(0); // Track number of poll responses
  const [showGradingResults, setShowGradingResults] = useState(false); // Whether to show results
  
  // Updated polling data structure to match grading app format
  const [pollingData, setPollingData] = useState({
    averages: {
      clarity: 0,
      delivery: 0,
      confidence: 0
    },
    submittedCount: 0,
    submissions: []
  });
  
  // Individual scores from grading app
  const [individualScores, setIndividualScores] = useState([]);
  
  // Connected peers (grading apps)
  const [connectedPeers, setConnectedPeers] = useState([]);
  
  // MQTT client connection status
  const [mqttConnected, setMqttConnected] = useState(false);
  
  const [mqttClient, setMqttClient] = useState(null);
  
  // Minimum responses needed to show results (adjust as needed)
  const minPollResponses = 5;
  
  // Create a built-in warning sound
  const createWarningSound = () => {
    return {
      play: () => {
        console.log('Warning: Time is running out!');
        try {
          // Create a beep sound
          const context = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(context.destination);
          
          oscillator.type = 'sine';
          oscillator.frequency.value = 800;
          gainNode.gain.value = 0.5;
          
          oscillator.start();
          setTimeout(() => {
            oscillator.stop();
          }, 500);
        } catch (error) {
          console.log('Audio warning failed:', error);
        }
      }
    };
  };
  
  // Warning sound
  const [warning] = useState(createWarningSound);

const checkAndShowResults = (responseCount) => {
  if (responseCount >= minPollResponses && !showGradingResults) {
    setShowGradingResults(true);
    console.log(`🎉 Showing results! Received ${responseCount} responses (minimum: ${minPollResponses})`);
  }
};

  // Handle individual score submission from grading app
const handleIndividualScore = (scoreData) => {
  console.log('📝 Processing individual score:', scoreData);
  
  setIndividualScores(prev => {
    // Check if this score already exists to avoid duplicates
    const existingIndex = prev.findIndex(score => 
      score.studentId === scoreData.studentId && 
      score.timestamp === scoreData.timestamp
    );
    
    if (existingIndex === -1) {
      const updated = [...prev, scoreData];
      console.log('✅ Added new score. Total scores:', updated.length);
      return updated;
    }
    
    console.log('⚠️ Duplicate score detected, skipping');
    return prev;
  });
  
  // Update poll responses count and check if we should show results
  setPollResponses(prev => {
    const newCount = prev + 1;
    console.log('📊 Updated poll responses count:', newCount);
    
    // Check if we should show results now
    checkAndShowResults(newCount);
    
    return newCount;
  });
};

  // Handle summary update from grading app
const handleSummaryUpdate = (summaryData) => {
  console.log('📈 Processing summary update:', summaryData);
  
  setPollingData(summaryData);
  setPollResponses(summaryData.submittedCount);
  
  // Check if we should show results
  checkAndShowResults(summaryData.submittedCount);
};

  // Handle new peer detection (grading app connection)
  const handleNewPeer = (peerData) => {
    console.log('New peer detected:', peerData);
    
    setConnectedPeers(prev => {
      const existing = prev.find(p => p.peerId === peerData.peerId);
      if (!existing) {
        const updated = [...prev, peerData];
        console.log('Added new peer. Total peers:', updated.length);
        return updated;
      }
      return prev;
    });
  };

  // Handle state synchronization from other peers
  const handleStateSync = (syncData) => {
    console.log('Processing state sync:', syncData);
    
    if (syncData.scores && Array.isArray(syncData.scores)) {
      const scores = syncData.scores.map(([studentId, scoreData]) => scoreData);
      setIndividualScores(scores);
      console.log('Synchronized scores from peer:', scores.length);
    }
  };

  // Initialize MQTT client with grading app integration
  useEffect(() => {
    try {
      // Use WebSocket connection as specified by grading app team
      // Update with your actual class broker address
      //const client = new MQTTClient('ws://mqtt.uvu.cs:9001');

      // Testing broker client of my own
      const client = new MQTTClient('wss://broker.emqx.io:8084/mqtt');
      
      client.onConnect(() => {
        console.log('✅ Connected to grading app MQTT broker');
        setMqttConnected(true);
      });
      
      client.onMessage((topic, message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log(`📨 Received MQTT message on topic '${topic}':`, data);
          
          if (topic.startsWith('scores/')) {
            // Individual score submission
            handleIndividualScore(data);
            
          } else if (topic.startsWith('summary/')) {
            // Summary update
            handleSummaryUpdate(data);
            
          } else if (topic === 'presence') {
            // New peer announcement
            handleNewPeer(data);
            
          } else if (data.type === 'state_sync') {
            // State synchronization from another peer
            handleStateSync(data);
          }
        } catch (error) {
          console.error('❌ Error parsing MQTT message:', error);
        }
      });
      
      setMqttClient(client);
      
      return () => {
        if (client) {
          console.log('🔌 Disconnecting MQTT client');
          client.disconnect();
          setMqttConnected(false);
        }
      };
    } catch (error) {
      console.error('❌ MQTT client initialization failed:', error);
      setMqttConnected(false);
      // Continue without MQTT for demonstration
    }
  }, []);

  // Load saved team URLs when the app starts
  useEffect(() => {
    try {
      const savedTeams = localStorage.getItem('presentationToolTeams');
      if (savedTeams) {
        setTeams(JSON.parse(savedTeams));
        console.log('📂 Loaded saved team URLs from localStorage');
      }
    } catch (error) {
      console.error('❌ Error loading teams from localStorage:', error);
    }
  }, []);

  // Reset poll counters when team changes
  useEffect(() => {
    console.log(`🔄 Team changed to Team ${currentTeamIndex + 1}, resetting poll data`);
    
    setPollResponses(0);
    setShowGradingResults(false);
    setIndividualScores([]);
    setPollingData({
      averages: { clarity: 0, delivery: 0, confidence: 0 },
      submittedCount: 0,
      submissions: []
    });
  }, [currentTeamIndex]);

  // Display debug info on mount
  useEffect(() => {
    console.log(`[EVENT INFO] Start: ${eventConfig.date.toLocaleTimeString()}, End: ${eventConfig.endTime.toLocaleTimeString()}`);
    console.log(`[PRESENTATION] Team time: ${eventConfig.presentationTime / 60000} minutes, Grading time: ${eventConfig.gradingTime / 60000} minutes`);
  }, [eventConfig]);

  // Update team URL function
  const handleUpdateTeamUrl = (teamId, newUrl) => {
    const updatedTeams = teams.map(team => 
      team.id === teamId ? { ...team, demoUrl: newUrl } : team
    );
    
    setTeams(updatedTeams);
    
    // Log the update
    console.log(`🔗 Updated URL for Team ${teamId} to: ${newUrl}`);
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('presentationToolTeams', JSON.stringify(updatedTeams));
    } catch (error) {
      console.error('❌ Error saving teams to localStorage:', error);
    }
  };

  // Main timer logic
  useEffect(() => {
    const timerInterval = setInterval(() => {
      // Increment counter to force component update
      setCounter(prev => prev + 1);
      
      // Get a fresh timestamp every tick
      const currentTime = new Date();
      
      // Before event starts
      if (currentTime < eventConfig.date) {
        setCurrentState('countdown');
        const remaining = calculateTimeRemaining(currentTime, eventConfig.date);
        setTimeRemaining(remaining);
        return;
      }
      
      // After event ends
      if (currentTime > eventConfig.endTime) {
        setCurrentState('completed');
        clearInterval(timerInterval);
        return;
      }
      
      // Calculate which team should be presenting based on elapsed time
      const elapsedTime = currentTime.getTime() - eventConfig.date.getTime();
      const teamTime = eventConfig.presentationTime + eventConfig.gradingTime;
      const currentTeamIdx = Math.floor(elapsedTime / teamTime);
      
      if (currentTeamIdx >= eventConfig.teamCount) {
        setCurrentState('completed');
        clearInterval(timerInterval);
        return;
      }
      
      if (currentTeamIdx !== currentTeamIndex) {
        setCurrentTeamIndex(currentTeamIdx);
      }
      
      // Calculate time within current team's slot
      const timeInCurrentTeamSlot = elapsedTime % teamTime;
      
      // Determine if we're in presentation or grading mode
      if (timeInCurrentTeamSlot < eventConfig.presentationTime) {
        // In presentation mode
        setCurrentState('presentation');
        const presentationTimeRemaining = eventConfig.presentationTime - timeInCurrentTeamSlot;
        setTimeRemaining(presentationTimeRemaining);
        
        // Play warning sound if time is almost up
        if (presentationTimeRemaining <= eventConfig.warningTime && 
            presentationTimeRemaining > eventConfig.warningTime - 1000) {
          warning.play();
        }
      } else {
        // In grading mode
        setCurrentState('grading');
        const gradingTimeRemaining = teamTime - timeInCurrentTeamSlot;
        setTimeRemaining(gradingTimeRemaining);
        
        // Notify grading app through MQTT when entering grading mode
        if (mqttClient && Math.abs(timeInCurrentTeamSlot - eventConfig.presentationTime) < 1000) {
          try {
            const gradingInfo = {
              team: teams[currentTeamIdx].id,
              teamName: teams[currentTeamIdx].name,
              startTime: currentTime.toISOString(),
              endTime: new Date(currentTime.getTime() + eventConfig.gradingTime).toISOString()
            };
            
            mqttClient.notifyGradingWindow(gradingInfo);
            console.log('📢 Sent grading window notification:', gradingInfo);
          } catch (error) {
            console.error('❌ Error publishing grading notification:', error);
          }
        }
        
        // Play warning sound if grading time is almost up
        if (gradingTimeRemaining <= eventConfig.warningTime && 
            gradingTimeRemaining > eventConfig.warningTime - 1000) {
          warning.play();
        }
      }
    }, 1000);
    
    return () => clearInterval(timerInterval);
  }, [currentTeamIndex, mqttClient, teams, warning]); // Added missing dependencies

  // Upload URL button component with icon
  const UploadUrlButton = () => (
    <button className="upload-url-button" onClick={() => setIsUrlModalOpen(true)}>
      <svg className="upload-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
      Upload Team URL
    </button>
  );

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="connection-status">
      <div className={`connection-dot ${mqttConnected ? '' : 'disconnected'}`}></div>
      <span>{mqttConnected ? 'Connected' : 'Disconnected'}</span>
    </div>
  );

  // Render different views based on current state
  const renderContent = () => {
    switch (currentState) {
      case 'countdown':
        return (
          <div className="countdown-container">
            <h1>Presentation Day Countdown</h1>
            <h2>May 28, 2025 at 2:00 PM</h2>
            
            {/* Use the enhanced countdown component for long durations */}
            {!demoMode && timeRemaining > 24 * 60 * 60 * 1000 ? (
              // If more than 24 hours remaining and not in demo mode, use the enhanced display
              <CountdownDisplay timeRemaining={timeRemaining} />
            ) : (
              // Otherwise use the regular timer
              <Timer timeRemaining={timeRemaining} format="hh:mm:ss" />
            )}
            
            <p>First team presents at {eventConfig.date.toLocaleString()}</p>
            
            {/* Connection Status */}
            <div className="mqtt-status">
              <ConnectionStatus />
            </div>
            
            {/* Add the Upload Team URL button */}
            <UploadUrlButton />
            
            {/* Use the memoized team URLs section component */}
            <MemoizedTeamUrlsSection teams={teams} />
            
            {/* Show connected peers info */}
            {connectedPeers.length > 0 && (
              <div className="connected-peers">
                <p>🟢 Connected grading apps: {connectedPeers.length}</p>
              </div>
            )}
            
            {/* URL Upload Modal */}
            <UrlUploadModal 
              isOpen={isUrlModalOpen}
              onClose={() => setIsUrlModalOpen(false)}
              teams={teams}
              onUpdateTeamUrl={handleUpdateTeamUrl}
            />
          </div>
        );
      
      case 'presentation':
        return (
          <div className="presentation-container">
            <div className="header">
              <h1>{teams[currentTeamIndex].name} Presentation</h1>
              <Timer 
                timeRemaining={timeRemaining} 
                format="mm:ss" 
                warning={timeRemaining <= eventConfig.warningTime}
              />
            </div>
            <PresentationDisplay url={teams[currentTeamIndex].demoUrl} />
            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', textAlign: 'center', marginTop: '20px' }}>
              <p><strong>Note:</strong> The iframe above displays the team's demo application. 
              URL: {teams[currentTeamIndex].demoUrl}</p>
            </div>
            <QRCodeDisplay url={window.location.origin + '/poll?team=' + teams[currentTeamIndex].id} />
          </div>
        );
      
case 'grading':
  return (
    <div className="grading-container">
      <div className="header">
        <h1>Grade {teams[currentTeamIndex].name}</h1>
        <Timer 
          timeRemaining={timeRemaining} 
          format="mm:ss"
          warning={timeRemaining <= eventConfig.warningTime}
        />
      </div>
      
      {/* Condition for showing QR code vs. results */}
      {!showGradingResults ? (
        // Still waiting for enough responses - show QR code with counter
        <div className="qr-waiting-container">
          <h2>Please scan the QR code to submit your evaluation</h2>
          <QRCodeDisplay url={window.location.origin + '/poll?team=' + teams[currentTeamIndex].id} />
          <div className="response-counter">
            <p>Responses received: <span className="response-count">{pollResponses}</span> / {minPollResponses} needed</p>
            {pollResponses > 0 && (
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${Math.min(100, (pollResponses / minPollResponses) * 100)}%` }}
                ></div>
              </div>
            )}
            <p>Results will display once {minPollResponses} evaluations are received</p>
            
            {/* Show connection status */}
            <div className="grading-status">
              <ConnectionStatus />
              {connectedPeers.length > 0 && (
                <span style={{ marginLeft: '15px' }}>
                  📱 {connectedPeers.length} grading app(s) connected
                </span>
              )}
            </div>
          </div>
          
          {/* For testing - button to manually show results */}
          {demoMode && (
            <button 
              onClick={() => setShowGradingResults(true)}
              className="test-button"
            >
              Show Results (Test)
            </button>
          )}
        </div>
      ) : (
        // Enough responses received - show poll results
        <div className="results-container">
          {/* REMOVED: <h2>Evaluation Results</h2> */}
          <PollingDisplay pollingData={pollingData} currentTeam={teams[currentTeamIndex]} />
          <div className="response-info">
            <p>📊 Based on {pollResponses} evaluations from {connectedPeers.length} grading app(s)</p>
          </div>
        </div>
      )}
      
      <p className="grading-footer">Grading period ends in <strong>{formatTime(timeRemaining, 'mm:ss')}</strong></p>
    </div>
  );
      
      case 'completed':
        return (
          <div className="completed-container">
            <h1>Presentations Completed</h1>
            <p>Thank you for participating!</p>
            <div className="final-stats">
              <p>Total evaluations received: {individualScores.length}</p>
              <p>Connected grading apps: {connectedPeers.length}</p>
            </div>
          </div>
        );
      
      default:
        return <div>Loading...</div>;
    }
  };

  // Enhanced status bar with MQTT connection info
  const renderSimulationStatus = () => {
    return (
      <div className="status-bar-extended" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#333',
        color: 'white',
        padding: '8px 15px',
        fontSize: '13px'
      }}>
        <div className="status-left">
          <strong>{demoMode ? '⚡ DEMO MODE' : '🎯 LIVE MODE'}</strong>
        </div>
        <div className="status-center">
          State: <span style={{ color: '#4ade80' }}>{currentState}</span> | 
          Team: <span style={{ color: '#4ade80' }}>{currentTeamIndex + 1}</span> | 
          Time: <span style={{ color: '#4ade80' }}>{new Date().toLocaleTimeString()}</span>
        </div>
        <div className="status-right">
          <ConnectionStatus /> | 
          Peers: <span style={{ color: '#4ade80' }}>{connectedPeers.length}</span> | 
          Scores: <span style={{ color: '#4ade80' }}>{pollResponses}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {renderContent()}
      {renderSimulationStatus()}
    </div>
  );
};

export default App;