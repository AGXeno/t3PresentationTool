import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import Timer from './components/Timer';
import PresentationDisplay from './components/PresentationDisplay';
import MQTTClient from './services/MQTTClient';
import PollingDisplay from './components/PollingDisplay';
import QRCodeDisplay from './components/QRCodeDisplay';
import CountdownDisplay from './components/CountdownDisplay';
import UrlUploadModal from './components/UrlUploadModal';
import { calculateTimeRemaining } from './utils/timeUtils';

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
  
  // Create dates based on demo mode - wrapped in useMemo to prevent recreation on every render
  const eventConfig = useMemo(() => {
    let startTime, endTime;
    
    if (demoMode) {
      // DEMO MODE: Use current time for testing
      startTime = new Date(initialTimeRef.current);
      // Start the event after 15 seconds
      startTime.setSeconds(startTime.getSeconds() + 15);
      
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
      endTime: endTime,
      teamCount: 6,
      presentationTime: demoMode ? (30 * 1000) : (12 * 60 * 1000), // 30 sec or 12 min
      gradingTime: demoMode ? (40 * 1000) : (3 * 60 * 1000),       // 40 sec or 3 min
      warningTime: demoMode ? (10 * 1000) : (60 * 1000)            // 10 sec or 1 min warning
    };
  }, [demoMode]);
  
  // URL upload modal state
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  
  // Convert teams array to state so we can update it
  const [teams, setTeams] = useState([
    { id: 1, name: 'Team 1', demoUrl: 'https://grading-tool-application.netlify.app/' },
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
  const [pollResponses, setPollResponses] = useState(0); // Track number of poll responses
  const [showGradingResults, setShowGradingResults] = useState(false); // Whether to show results
  
  // Manual override for skipping presentation
  const [manualSkipToGrading, setManualSkipToGrading] = useState(false);
  
  // Add state to track when current team's grading started
  const [currentTeamGradingStartTime, setCurrentTeamGradingStartTime] = useState(null);
  
  // Track when we've manually advanced beyond natural timing
  const [manuallyAdvancedTeam, setManuallyAdvancedTeam] = useState(null);
  
  // Track when the manually advanced team actually started
  const [manuallyAdvancedTeamStartTime, setManuallyAdvancedTeamStartTime] = useState(null);
  
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

  // Use refs to access current state values in MQTT handler (avoid closure issues)
  const currentStateRef = useRef(currentState);
  const currentTeamIndexRef = useRef(currentTeamIndex);
  const currentTeamGradingStartTimeRef = useRef(currentTeamGradingStartTime);
  const manualSkipToGradingRef = useRef(manualSkipToGrading);

  // Update refs when state changes
  useEffect(() => { currentStateRef.current = currentState; }, [currentState]);
  useEffect(() => { currentTeamIndexRef.current = currentTeamIndex; }, [currentTeamIndex]);
  useEffect(() => { currentTeamGradingStartTimeRef.current = currentTeamGradingStartTime; }, [currentTeamGradingStartTime]);
  useEffect(() => { manualSkipToGradingRef.current = manualSkipToGrading; }, [manualSkipToGrading]);

  const checkAndShowResults = useCallback((responseCount) => {
    // Use refs to get current state (avoid closure issues)
    const currentStateValue = currentStateRef.current;
    const currentTeamIndexValue = currentTeamIndexRef.current;
    
    // Only show results if we're currently in grading mode
    if (currentStateValue !== 'grading') {
      console.log('⚠️ Not in grading mode, ignoring result check');
      return;
    }
    
    console.log(`🔍 Checking results for Team ${currentTeamIndexValue + 1}: responseCount=${responseCount}, minRequired=${minPollResponses}, showGradingResults=${showGradingResults}`);
    
    if (responseCount >= minPollResponses && !showGradingResults) {
      setShowGradingResults(true);
      console.log(`🎉 Showing results for Team ${currentTeamIndexValue + 1}! Received ${responseCount} responses (minimum: ${minPollResponses})`);
    } else if (responseCount >= minPollResponses && showGradingResults) {
      console.log(`📊 Team ${currentTeamIndexValue + 1}: Already showing results with ${responseCount} responses`);
    } else if (responseCount < minPollResponses) {
      // Ensure results are hidden if we don't have enough responses
      if (showGradingResults) {
        console.log(`⚠️ Team ${currentTeamIndexValue + 1}: Hiding results - only ${responseCount}/${minPollResponses} responses`);
        setShowGradingResults(false);
      }
      console.log(`📊 Team ${currentTeamIndexValue + 1}: ${responseCount}/${minPollResponses} responses received - showing QR code`);
    }
  }, [minPollResponses, showGradingResults]);

  // Modified handleIndividualScore to filter by team grading period (with duplicate checking)
  const handleIndividualScore = useCallback((scoreData) => {
    // Use refs to get current state (avoid closure issues)
    const currentStateValue = currentStateRef.current;
    const currentTeamIndexValue = currentTeamIndexRef.current;
    const currentTeamGradingStartTimeValue = currentTeamGradingStartTimeRef.current;
    const manualSkipToGradingValue = manualSkipToGradingRef.current;
    
    console.log('📝 Processing individual score:', scoreData);
    console.log(`🎯 CURRENT STATE CHECK: currentState = "${currentStateValue}", currentTeamIndex = ${currentTeamIndexValue + 1}, manualSkip = ${manualSkipToGradingValue}`);
    console.log(`🕐 Current team grading start time: ${currentTeamGradingStartTimeValue?.toLocaleTimeString() || 'null'}`);
    
    // Only process scores when in grading mode
    if (currentStateValue !== 'grading') {
      console.error(`❌ REJECTING SCORE: Not in grading mode! Current state: "${currentStateValue}", Expected: "grading"`);
      console.error(`❌ Score data:`, scoreData);
      console.error(`❌ This suggests a timing issue - score arrived before/after grading mode`);
      console.error(`❌ Manual Skip Status: ${manualSkipToGradingValue}, Team: ${currentTeamIndexValue + 1}`);
      
      // If we're manually skipped but state hasn't updated yet, wait a moment and try again
      if (manualSkipToGradingValue && currentStateValue === 'presentation') {
        console.log('⏭️ Manual skip detected but state not updated yet - waiting for state sync...');
        setTimeout(() => {
          console.log(`⏭️ Retry: currentState = "${currentStateRef.current}", trying score again...`);
          if (currentStateRef.current === 'grading') {
            handleIndividualScore(scoreData);
          }
        }, 100);
      }
      return;
    }

    console.log(`✅ STATE CHECK PASSED: In grading mode for Team ${currentTeamIndexValue + 1}`);

    // If we don't have a grading start time yet, set it now (fallback for manual skip)
    if (!currentTeamGradingStartTimeValue) {
      console.log(`⚠️ No grading start time set yet, setting it now for Team ${currentTeamIndexValue + 1}`);
      const newStartTime = new Date();
      setCurrentTeamGradingStartTime(newStartTime);
      console.log(`🕐 FALLBACK: Set grading start time to ${newStartTime.toLocaleTimeString()}`);
      
      // Accept the score immediately since we just started grading
      console.log(`🎉 ACCEPTING SCORE for Team ${currentTeamIndexValue + 1} from student ${scoreData.studentId} (new grading session)`);
    } else {
      // Only accept scores submitted during the current team's grading period
      const scoreTimestamp = new Date(scoreData.timestamp);
      if (scoreTimestamp < currentTeamGradingStartTimeValue) {
        console.log(`⚠️ Ignoring old score from previous team: ${scoreData.studentId}, Score time: ${scoreData.timestamp}, Start time: ${currentTeamGradingStartTimeValue.toISOString()}`);
        return; // Skip scores from previous teams
      }
      
      console.log(`✅ TIMESTAMP CHECK PASSED: ${scoreData.timestamp} >= ${currentTeamGradingStartTimeValue.toISOString()}`);
      console.log(`🎉 ACCEPTING SCORE for Team ${currentTeamIndexValue + 1} from student ${scoreData.studentId}`);
    }
    
    // Check for duplicates before adding
    setIndividualScores(prev => {
      // Check if this exact score already exists (same studentId and timestamp)
      const isDuplicate = prev.some(existingScore => 
        existingScore.studentId === scoreData.studentId && 
        existingScore.timestamp === scoreData.timestamp
      );
      
      if (isDuplicate) {
        console.log(`⚠️ Duplicate score detected for student ${scoreData.studentId} at ${scoreData.timestamp} - ignoring`);
        return prev; // Don't add duplicate
      }
      
      const updated = [...prev, scoreData];
      console.log(`✅ Added new unique score for Team ${currentTeamIndexValue + 1}. Total unique scores:`, updated.length);
      
      // Update poll responses count to match actual unique scores
      setPollResponses(updated.length);
      console.log(`📊 [${currentStateValue}] Updated poll responses for Team ${currentTeamIndexValue + 1}: ${prev.length} → ${updated.length}`);
      
      // Check if we should show results based on actual count
      checkAndShowResults(updated.length);
      
      return updated;
    });
  }, [checkAndShowResults]);

  // Modified handleSummaryUpdate to filter by team grading period
  const handleSummaryUpdate = useCallback((summaryData) => {
    // Use refs to get current state (avoid closure issues)
    const currentStateValue = currentStateRef.current;
    const currentTeamIndexValue = currentTeamIndexRef.current;
    const currentTeamGradingStartTimeValue = currentTeamGradingStartTimeRef.current;
    
    console.log('📈 Processing summary update:', summaryData);
    console.log(`🕐 Current team grading start time: ${currentTeamGradingStartTimeValue}`);
    
    // Only process summary updates when in grading mode - EARLY RETURN
    if (currentStateValue !== 'grading') {
      console.log('⚠️ Not in grading mode, ignoring summary update completely');
      return; // Return early, don't process anything
    }

    // If we don't have a grading start time yet, ignore the summary
    if (!currentTeamGradingStartTimeValue) {
      console.log('⚠️ No grading start time set yet, ignoring summary update');
      return;
    }
    
    // Filter submissions to only include current team's grading period
    let filteredSummaryData = { ...summaryData };
    
    if (summaryData.submissions && summaryData.submissions.length > 0) {
      const filteredSubmissions = summaryData.submissions.filter(submission => {
        const submissionTime = new Date(submission.timestamp);
        const isAfterStart = submissionTime >= currentTeamGradingStartTimeValue;
        
        console.log(`🔍 Submission timestamp: ${submission.timestamp}, Start time: ${currentTeamGradingStartTimeValue.toISOString()}, Include: ${isAfterStart}`);
        
        return isAfterStart;
      });
      
      console.log(`🔍 Filtered submissions for Team ${currentTeamIndexValue + 1}: ${summaryData.submissions.length} → ${filteredSubmissions.length}`);
      
      // Recalculate averages based on filtered submissions
      if (filteredSubmissions.length > 0) {
        const totals = filteredSubmissions.reduce((acc, sub) => {
          acc.clarity += sub.clarity;
          acc.delivery += sub.delivery;
          acc.confidence += sub.confidence;
          return acc;
        }, { clarity: 0, delivery: 0, confidence: 0 });
        
        filteredSummaryData = {
          submittedCount: filteredSubmissions.length,
          averages: {
            clarity: totals.clarity / filteredSubmissions.length,
            delivery: totals.delivery / filteredSubmissions.length,
            confidence: totals.confidence / filteredSubmissions.length
          },
          submissions: filteredSubmissions
        };
      } else {
        // No submissions for current team yet
        filteredSummaryData = {
          submittedCount: 0,
          averages: { clarity: 0, delivery: 0, confidence: 0 },
          submissions: []
        };
      }
      
      console.log(`🔍 Final filtered summary for Team ${currentTeamIndexValue + 1}: ${summaryData.submittedCount} → ${filteredSummaryData.submittedCount} submissions`);
    } else {
      console.log('📈 No submissions in summary data');
    }
    
    // Use the summary data for display, but DON'T change poll responses count
    // Trust our local deduplication completely
    setPollingData(filteredSummaryData);
    
    // NEVER override poll responses with summary count - always trust local count
    console.log(`📊 [${currentStateValue}] Ignoring summary count for Team ${currentTeamIndexValue + 1}: keeping local count, summary claims ${filteredSummaryData.submittedCount}`);
  }, []);

  // Handle new peer detection (grading app connection)
  const handleNewPeer = useCallback((peerData) => {
    console.log('👋 New peer detected:', peerData);
    
    // Only track the peer connection, don't affect score counting
    setConnectedPeers(prev => {
      const existing = prev.find(p => p.peerId === peerData.peerId);
      if (!existing) {
        const updated = [...prev, peerData];
        console.log('✅ Added new peer. Total peers:', updated.length);
        return updated;
      }
      console.log('⚠️ Peer already exists:', peerData.peerId);
      return prev;
    });
    
    // Note: Do NOT increment poll responses here - peer connections are separate from scores
  }, []);

  // Team-aware state sync handler
  const handleStateSync = useCallback((syncData) => {
    // Use refs to get current state (avoid closure issues)
    const currentStateValue = currentStateRef.current;
    const currentTeamIndexValue = currentTeamIndexRef.current;
    const currentTeamGradingStartTimeValue = currentTeamGradingStartTimeRef.current;
    
    console.log('Processing state sync:', syncData);
    console.log(`🕐 Current team grading start time: ${currentTeamGradingStartTimeValue}`);
    
    // Only process state sync when in grading mode
    if (currentStateValue !== 'grading') {
      console.log('⚠️ Not in grading mode, ignoring state sync');
      return;
    }

    // If we don't have a grading start time yet, ignore the sync
    if (!currentTeamGradingStartTimeValue) {
      console.log('⚠️ No grading start time set yet, ignoring state sync');
      return;
    }
    
    if (syncData.scores && Array.isArray(syncData.scores)) {
      const scores = syncData.scores.map(([studentId, scoreData]) => scoreData);
      
      // Filter scores to only include those from the current team's grading period
      const filteredScores = scores.filter(score => {
        const scoreTime = new Date(score.timestamp);
        const isAfterStart = scoreTime >= currentTeamGradingStartTimeValue;
        
        console.log(`🔍 State sync score timestamp: ${score.timestamp}, Start time: ${currentTeamGradingStartTimeValue.toISOString()}, Include: ${isAfterStart}`);
        
        return isAfterStart;
      });
      
      console.log(`🔍 Filtered state sync for Team ${currentTeamIndexValue + 1}: ${scores.length} → ${filteredScores.length} scores`);
      
      // Only update if we don't already have scores AND we're just starting grading
      setIndividualScores(prevScores => {
        if (prevScores.length === 0 && filteredScores.length > 0) {
          // Deduplicate the synced scores before setting them
          const uniqueScores = [];
          const seenScores = new Set();
          
          filteredScores.forEach(score => {
            const scoreKey = `${score.studentId}-${score.timestamp}`;
            if (!seenScores.has(scoreKey)) {
              seenScores.add(scoreKey);
              uniqueScores.push(score);
            }
          });
          
          console.log(`✅ Synchronized ${uniqueScores.length} unique scores from peer (${filteredScores.length} total after filtering)`);
          
          // IMPORTANT: Only sync if this is the very beginning of grading (within first few seconds)
          const gradingDuration = new Date().getTime() - currentTeamGradingStartTimeValue.getTime();
          if (gradingDuration < 5000) { // Only within first 5 seconds of grading
            setPollResponses(uniqueScores.length);
            console.log(`📊 [${currentStateValue}] State sync set poll responses for Team ${currentTeamIndexValue + 1}: ${prevScores.length} → ${uniqueScores.length}`);
            checkAndShowResults(uniqueScores.length);
            return uniqueScores;
          } else {
            console.log(`⚠️ Ignoring state sync - grading has been active for ${gradingDuration}ms, too late for initial sync`);
          }
        } else {
          console.log('⚠️ Ignoring state sync - already have scores locally or no valid scores for current team');
        }
        return prevScores;
      });
    }
  }, [checkAndShowResults]);

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
          const currentTime = new Date().toLocaleTimeString();
          console.log(`📨 [${currentTime}] Received MQTT message on topic '${topic}':`, data);
          
          // Add state debugging for score messages using refs
          if (topic.startsWith('scores/') || topic === 'scores/broadcast' || topic === 'presentation/scores/broadcast') {
            console.log(`🔍 MQTT Handler State Check: currentState="${currentStateRef.current}", currentTeamIndex=${currentTeamIndexRef.current + 1}, gradingStartTime=${currentTeamGradingStartTimeRef.current?.toLocaleTimeString() || 'null'}`);
          }
          
          // 🔧 Handle broadcast scores (SHOULD ALREADY BE IN YOUR CODE)
          if (topic === 'scores/broadcast' || topic === 'presentation/scores/broadcast') {
            console.log('🔧 Processing broadcast score:', data);
            if (data.type === 'state_sync') {
              handleStateSync(data);
            } else {
              handleIndividualScore(data);
            }
            
          } else if (topic.startsWith('scores/')) {
            // Regular peer-to-peer scores
            if (data.type === 'state_sync') {
              handleStateSync(data);
            } else {
              handleIndividualScore(data);
            }
            
          } else if (topic.startsWith('summary/') || topic === 'summary/broadcast') {
            // 🔧 Handle both regular and broadcast summaries
            handleSummaryUpdate(data);
            
          } else if (topic === 'presence' || topic === 'presence/broadcast') {
            handleNewPeer(data);
            
          } else if (data.type === 'state_sync') {
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
  }, [handleIndividualScore, handleStateSync, handleSummaryUpdate, handleNewPeer]);

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

  // Enhanced team reset when team changes - handle manual advancement
  useEffect(() => {
    console.log(`🔄 Team changed to Team ${currentTeamIndex + 1}, resetting poll data`);
    
    setPollResponses(prev => {
      console.log(`📊 [TEAM_CHANGE] Resetting poll responses for Team ${currentTeamIndex + 1}: ${prev} → 0`);
      return 0;
    });
    setShowGradingResults(false);
    setIndividualScores([]);
    setPollingData({
      averages: { clarity: 0, delivery: 0, confidence: 0 },
      submittedCount: 0,
      submissions: []
    });
    
    // Clear the grading start time so it can be set fresh for the new team
    setCurrentTeamGradingStartTime(null);
    
    // If this is a manually advanced team, ensure it starts fresh (not in grading mode)
    if (manuallyAdvancedTeam === currentTeamIndex && currentState === 'grading') {
      console.log(`🔄 Manually advanced Team ${currentTeamIndex + 1} - forcing fresh start (will begin with presentation)`);
      // Don't set state here - let the timer logic handle it
    }
    
    console.log(`✅ Reset complete for Team ${currentTeamIndex + 1}`);
  }, [currentTeamIndex, manuallyAdvancedTeam, currentState]);

  // Reset grading state when entering grading mode (not just when team changes)
  useEffect(() => {
    console.log(`🔄 STATE TRANSITION: currentState changed to "${currentState}" for Team ${currentTeamIndex + 1}`);
    
    if (currentState === 'grading') {
      console.log(`🎯 ENTERING GRADING MODE for Team ${currentTeamIndex + 1}`);
      console.log(`🎯 Current time: ${new Date().toLocaleTimeString()}`);
      
      // Set grading start time if not already set (for manual skip case)
      setCurrentTeamGradingStartTime(prevStartTime => {
        if (!prevStartTime) {
          const newStartTime = new Date();
          console.log(`🕐 STATE_EFFECT: Set grading start time for Team ${currentTeamIndex + 1}: ${newStartTime.toLocaleTimeString()}`);
          return newStartTime;
        }
        return prevStartTime;
      });
      
      // FORCE reset grading results when entering grading mode
      setShowGradingResults(prev => {
        if (prev) {
          console.log(`⚠️ WARNING: showGradingResults was ${prev}, forcing to false for Team ${currentTeamIndex + 1}`);
        }
        return false;
      });
      
      // Reset poll data for this grading session
      setPollResponses(prev => {
        console.log(`📊 [GRADING] Resetting poll responses for Team ${currentTeamIndex + 1}: ${prev} → 0`);
        return 0;
      });
      setIndividualScores([]);
      setPollingData({
        averages: { clarity: 0, delivery: 0, confidence: 0 },
        submittedCount: 0,
        submissions: []
      });
      
      console.log(`✅ Grading mode reset complete for Team ${currentTeamIndex + 1} - READY TO ACCEPT SCORES`);
    } else if (currentState === 'presentation') {
      console.log(`🎬 ENTERING PRESENTATION MODE for Team ${currentTeamIndex + 1}`);
      console.log(`🎬 Current time: ${new Date().toLocaleTimeString()}`);
      
      // Reset poll responses when entering presentation (clears status bar)
      setPollResponses(prev => {
        console.log(`📊 [PRESENTATION] Resetting poll responses for Team ${currentTeamIndex + 1}: ${prev} → 0`);
        return 0;
      });
    } else if (currentState === 'countdown') {
      console.log(`⏰ IN COUNTDOWN MODE - waiting for event to start`);
    } else if (currentState === 'completed') {
      console.log(`🏁 EVENT COMPLETED - all teams finished`);
    }
  }, [currentState, currentTeamIndex]);

  // Function to manually skip to grading
  const skipToGrading = () => {
    console.log(`⏭️ Skip button clicked! Team ${currentTeamIndex + 1} - Current state: ${currentState}`);
    console.log(`⏭️ manualSkipToGrading before: ${manualSkipToGrading}`);
    setManualSkipToGrading(true);
    console.log(`⏭️ manualSkipToGrading set to: true`);
  };

  // Reset manual skip when team changes
  useEffect(() => {
    setManualSkipToGrading(false);
    // Don't reset manuallyAdvancedTeam here - it should persist until natural timing catches up
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

// FIXED: Timer logic with proper manual team completion
useEffect(() => {
  const timerInterval = setInterval(() => {
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
    
    // Calculate natural team progression based on elapsed time
    const elapsedTime = currentTime.getTime() - eventConfig.date.getTime();
    const teamTime = eventConfig.presentationTime + eventConfig.gradingTime;
    const naturalTeamIdx = Math.floor(elapsedTime / teamTime);
    
    let currentTeamIdx;
    
    // Handle manual skip completion - when manual skip grading time is up, advance to next team
    if (manualSkipToGrading && currentTeamGradingStartTime) {
      const gradingElapsed = currentTime.getTime() - currentTeamGradingStartTime.getTime();
      
      if (gradingElapsed >= eventConfig.gradingTime) {
        // Manual skip grading completed - advance to next team and reset manual skip
        console.log(`⏭️ Manual skip grading completed for Team ${currentTeamIndex + 1} - advancing to next team`);
        
        const nextTeamIdx = currentTeamIndex + 1;
        currentTeamIdx = nextTeamIdx;
        
        // Mark that we've manually advanced beyond natural timing
        setManuallyAdvancedTeam(nextTeamIdx);
        setManuallyAdvancedTeamStartTime(currentTime); // Track when this team started
        console.log(`🔒 Manually advanced to Team ${nextTeamIdx + 1} at ${currentTime.toLocaleTimeString()} - locking to prevent natural timing override`);
        
        // IMPORTANT: Clear manual skip state for the NEW team
        setManualSkipToGrading(false);
        setCurrentTeamGradingStartTime(null);
        
        console.log(`🔄 Reset manual skip state for new Team ${nextTeamIdx + 1} - will start with presentation`);
        
      } else {
        // Still in manual skip grading mode for current team
        currentTeamIdx = currentTeamIndex;
      }
    } 
    // FIXED: Handle completion of manually advanced teams that went through natural grading
    else if (manuallyAdvancedTeam === currentTeamIndex && currentTeamGradingStartTime && manuallyAdvancedTeamStartTime) {
      // Check if this manually advanced team's grading time is complete
      const gradingElapsed = currentTime.getTime() - currentTeamGradingStartTime.getTime();
      
      if (gradingElapsed >= eventConfig.gradingTime) {
        // Manually advanced team's grading completed - advance to next team
        console.log(`🔒 Manually advanced Team ${currentTeamIndex + 1} grading completed - advancing to next team`);
        
        const nextTeamIdx = currentTeamIndex + 1;
        currentTeamIdx = nextTeamIdx;
        
        // Mark the next team as manually advanced
        setManuallyAdvancedTeam(nextTeamIdx);
        setManuallyAdvancedTeamStartTime(currentTime); // Track when this team started
        console.log(`🔒 Manually advanced to Team ${nextTeamIdx + 1} at ${currentTime.toLocaleTimeString()}`);
        
        // Clear grading start time for the new team
        setCurrentTeamGradingStartTime(null);
        
        console.log(`🔄 Team ${nextTeamIdx + 1} will start with presentation`);
        
      } else {
        // Still in grading mode for current manually advanced team
        currentTeamIdx = currentTeamIndex;
      }
    }
    else {
      // Determine which team index to use
      if (manuallyAdvancedTeam !== null && manuallyAdvancedTeam > naturalTeamIdx) {
        // We've manually advanced beyond natural timing - stick with manual team
        currentTeamIdx = manuallyAdvancedTeam;
        console.log(`🔒 Using manually advanced team ${currentTeamIdx + 1} (natural would be ${naturalTeamIdx + 1})`);
        
        // Check if natural timing has caught up - if so, clear the manual advancement
        if (naturalTeamIdx >= manuallyAdvancedTeam) {
          console.log(`🔓 Natural timing caught up - releasing manual advancement lock`);
          setManuallyAdvancedTeam(null);
          setManuallyAdvancedTeamStartTime(null);
          currentTeamIdx = naturalTeamIdx;
        }
      } else {
        // Use natural team progression
        currentTeamIdx = naturalTeamIdx;
        
        // Clear manual advancement if natural timing has moved beyond it
        if (manuallyAdvancedTeam !== null && naturalTeamIdx > manuallyAdvancedTeam) {
          setManuallyAdvancedTeam(null);
          setManuallyAdvancedTeamStartTime(null);
        }
      }
    }
    
    // Check if we've finished all teams
    if (currentTeamIdx >= eventConfig.teamCount) {
      setCurrentState('completed');
      clearInterval(timerInterval);
      return;
    }
    
    // Handle team transitions
    if (currentTeamIdx !== currentTeamIndex) {
      // Send team reset notification before changing teams
      if (mqttClient && currentTeamIndex >= 0) {
        try {
          const resetInfo = {
            team: teams[currentTeamIdx].id,
            teamName: teams[currentTeamIdx].name,
            startTime: currentTime.toISOString()
          };
          
          mqttClient.notifyTeamReset(resetInfo);
          console.log('🔄 Sent team reset notification for Team', currentTeamIdx + 1);
        } catch (error) {
          console.error('❌ Error sending team reset:', error);
        }
      }
      
      setCurrentTeamIndex(currentTeamIdx);
    }
    
    // FIXED: Determine if we're in presentation or grading mode
    // Priority 1: Manual skip always forces grading mode
    if (manualSkipToGrading && currentTeamIdx === currentTeamIndex) {
      // ===== MANUAL SKIP GRADING MODE =====
      const wasNotInGradingMode = currentState !== 'grading';
      
      if (wasNotInGradingMode) {
        console.log(`🎯 TIMER: MANUAL SKIP - Switching to GRADING mode for Team ${currentTeamIdx + 1} at ${currentTime.toLocaleTimeString()}`);
      }
      setCurrentState('grading');
      
      // Set grading start time if not already set
      setCurrentTeamGradingStartTime(prevStartTime => {
        if (!prevStartTime) {
          const gradingStartTime = new Date();
          console.log(`🕐 MANUAL SKIP: Set grading start time for Team ${currentTeamIdx + 1}: ${gradingStartTime.toLocaleTimeString()}`);
          return gradingStartTime;
        }
        return prevStartTime;
      });
      
      // Calculate grading time remaining from when grading actually started
      let gradingTimeRemaining;
      if (currentTeamGradingStartTime) {
        const gradingElapsed = currentTime.getTime() - currentTeamGradingStartTime.getTime();
        gradingTimeRemaining = Math.max(0, eventConfig.gradingTime - gradingElapsed);
      } else {
        gradingTimeRemaining = eventConfig.gradingTime;
      }
      
      setTimeRemaining(gradingTimeRemaining);
      
      // Send MQTT notification when entering grading mode (only once)
      if (wasNotInGradingMode && mqttClient) {
        try {
          const gradingInfo = {
            team: teams[currentTeamIdx].id,
            teamName: teams[currentTeamIdx].name,
            startTime: currentTime.toISOString(),
            endTime: new Date(currentTime.getTime() + gradingTimeRemaining).toISOString()
          };
          
          mqttClient.notifyGradingWindow(gradingInfo);
          console.log('📢 TIMER: Sent grading window notification:', gradingInfo);
        } catch (error) {
          console.error('❌ Error publishing grading notification:', error);
        }
      }
      
      // Play warning sound if grading time is almost up
      if (gradingTimeRemaining <= eventConfig.warningTime && 
          gradingTimeRemaining > eventConfig.warningTime - 1000) {
        warning.play();
      }
      
    } else {
      // Priority 2: Calculate timing for current team slot
      let timeInCurrentTeamSlot;
      
      // FIXED: Manually advanced teams use their own timeline
      if (manuallyAdvancedTeam === currentTeamIdx && manuallyAdvancedTeamStartTime) {
        // This team was manually advanced - calculate time from when it actually started
        timeInCurrentTeamSlot = currentTime.getTime() - manuallyAdvancedTeamStartTime.getTime();
        
        // Debug logging
        if (timeInCurrentTeamSlot < 2000) { // First 2 seconds
          console.log(`🔒 Manual team ${currentTeamIdx + 1}: ${Math.floor(timeInCurrentTeamSlot/1000)}s elapsed since manual start`);
        }
      } else {
        // Natural timing calculation for non-manually-advanced teams
        timeInCurrentTeamSlot = elapsedTime % teamTime;
      }
      
      // Determine mode based on timing within the team's slot
      if (timeInCurrentTeamSlot < eventConfig.presentationTime) {
        // ===== PRESENTATION MODE =====
        if (currentState !== 'presentation') {
          console.log(`🎬 TIMER: Switching to PRESENTATION mode for Team ${currentTeamIdx + 1} at ${currentTime.toLocaleTimeString()}`);
          if (manuallyAdvancedTeam === currentTeamIdx) {
            console.log(`🔒 Manual team ${currentTeamIdx + 1}: Starting presentation phase`);
          }
        }
        setCurrentState('presentation');
        const presentationTimeRemaining = eventConfig.presentationTime - timeInCurrentTeamSlot;
        setTimeRemaining(presentationTimeRemaining);
        
        // Play warning sound if time is almost up
        if (presentationTimeRemaining <= eventConfig.warningTime && 
            presentationTimeRemaining > eventConfig.warningTime - 1000) {
          warning.play();
        }
        
      } else {
        // ===== GRADING MODE =====
        const wasNotInGradingMode = currentState !== 'grading';
        
        if (wasNotInGradingMode) {
          console.log(`🎯 TIMER: Switching to GRADING mode for Team ${currentTeamIdx + 1} at ${currentTime.toLocaleTimeString()}`);
          if (manuallyAdvancedTeam === currentTeamIdx) {
            console.log(`🔒 Manual team ${currentTeamIdx + 1}: Starting grading phase`);
          }
        }
        setCurrentState('grading');
        
        // Set grading start time if not already set
        setCurrentTeamGradingStartTime(prevStartTime => {
          if (!prevStartTime) {
            let gradingStartTime;
            
            if (manuallyAdvancedTeam === currentTeamIdx && manuallyAdvancedTeamStartTime) {
              // For manually advanced teams, grading starts after their presentation time
              gradingStartTime = new Date(manuallyAdvancedTeamStartTime.getTime() + eventConfig.presentationTime);
              console.log(`🕐 MANUAL TEAM: Set grading start time for Team ${currentTeamIdx + 1}: ${gradingStartTime.toLocaleTimeString()}`);
            } else {
              // Natural progression - grading starts after presentation time
              const teamStartTime = new Date(eventConfig.date.getTime() + (currentTeamIdx * teamTime));
              gradingStartTime = new Date(teamStartTime.getTime() + eventConfig.presentationTime);
              console.log(`🕐 NATURAL: Set grading start time for Team ${currentTeamIdx + 1}: ${gradingStartTime.toLocaleTimeString()}`);
            }
            
            return gradingStartTime;
          }
          return prevStartTime;
        });
        
        // Calculate grading time remaining
        let gradingTimeRemaining;
        
        if (currentTeamGradingStartTime) {
          const gradingElapsed = Math.max(0, currentTime.getTime() - currentTeamGradingStartTime.getTime());
          gradingTimeRemaining = Math.max(0, eventConfig.gradingTime - gradingElapsed);
        } else {
          // Fallback calculation
          gradingTimeRemaining = Math.max(0, eventConfig.gradingTime - (timeInCurrentTeamSlot - eventConfig.presentationTime));
        }
        
        setTimeRemaining(gradingTimeRemaining);
        
        // Send MQTT notification when entering grading mode (only once)
        if (wasNotInGradingMode && mqttClient) {
          try {
            const gradingInfo = {
              team: teams[currentTeamIdx].id,
              teamName: teams[currentTeamIdx].name,
              startTime: currentTime.toISOString(),
              endTime: new Date(currentTime.getTime() + gradingTimeRemaining).toISOString()
            };
            
            mqttClient.notifyGradingWindow(gradingInfo);
            console.log('📢 TIMER: Sent grading window notification:', gradingInfo);
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
    }
  }, 1000);
  
  return () => clearInterval(timerInterval);
}, [currentTeamIndex, mqttClient, teams, warning, currentTeamGradingStartTime, manualSkipToGrading, currentState, eventConfig, manuallyAdvancedTeam, manuallyAdvancedTeamStartTime]);
//here

  // Reset manual advancement when team changes naturally
  useEffect(() => {
    if (manuallyAdvancedTeam !== null) {
      const elapsedTime = new Date().getTime() - eventConfig.date.getTime();
      const teamTime = eventConfig.presentationTime + eventConfig.gradingTime;
      const naturalTeamIdx = Math.floor(elapsedTime / teamTime);
      
      if (naturalTeamIdx >= manuallyAdvancedTeam) {
        console.log(`🔓 Clearing manual advancement - natural timing has caught up`);
        setManuallyAdvancedTeam(null);
        setManuallyAdvancedTeamStartTime(null);
      }
    }
  }, [manuallyAdvancedTeam, manuallyAdvancedTeamStartTime, eventConfig]);

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
              <p><strong>Team {currentTeamIndex + 1} Presenting Application Demo</strong></p>
              <button 
                className="skip-to-grading-btn"
                onClick={skipToGrading}
                style={{
                  marginTop: '15px',
                  padding: '10px 20px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#c0392b'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#e74c3c'}
              >
                ⏭️ Skip to Grading Portion
              </button>
            </div>
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
            
            {/* Condition for showing QR code vs. results - EXPLICIT CHECK */}
            {(!showGradingResults || pollResponses < minPollResponses) ? (
              // Still waiting for enough responses - show QR code with counter
              <div className="qr-waiting-container">
                <h2>Please scan the QR code to submit your evaluation</h2>
                <QRCodeDisplay url="https://grading-tool-application.netlify.app/" />
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
                </div>

              </div>
            ) : (
              // Enough responses received - show poll results
              <div className="results-container">
                <PollingDisplay pollingData={pollingData} currentTeam={teams[currentTeamIndex]} />
                <div className="response-info">
                  <p>📊 Based on {pollResponses} evaluations from {connectedPeers.length} grading app(s)</p>
                </div>
              </div>
            )}
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
          {currentState === 'presentation' && pollResponses > 0 && (
            <span style={{ color: '#f39c12', marginLeft: '5px' }}>⚠️</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {renderContent()}
      {demoMode && renderSimulationStatus()}
    </div>
  );
};

export default App;