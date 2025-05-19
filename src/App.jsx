import React, { useState, useEffect, useRef } from 'react';
import Timer from './components/Timer';
import PresentationDisplay from './components/PresentationDisplay';
import MQTTClient from './services/MQTTClient';
import PollingDisplay from './components/PollingDisplay';
import QRCodeDisplay from './components/QRCodeDisplay';
import { calculateTimeRemaining, formatTime } from './utils/timeUtils';
import CountdownDisplay from './components/CountdownDisplay';


const App = () => {
  // Use ref for the initial time to ensure consistent starting point
const initialTimeRef = useRef(new Date());
  
const demoMode = true;

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
  presentationTime: demoMode ? (30 * 1000 + 10) : (12 * 60 * 1000), // 30 sec or 12 min
  gradingTime: demoMode ? (15 * 1000) : (3 * 60 * 1000),       // 15 sec or 3 min
};

  if (demoMode) {
    eventConfig.presentationTime = 30 * 1000; // 30 seconds
    eventConfig.gradingTime = 15 * 1000; // 15 seconds
  }


  // We will change th is to the correct links once we get them
const teams = [
  { id: 1, name: 'Team 1', demoUrl: 'https://example.com/' },
  { id: 2, name: 'Team 2', demoUrl: 'https://httpbin.org/' },
  { id: 3, name: 'Team 3', demoUrl: 'https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/demo/line-basic/' },
  { id: 4, name: 'Team 4', demoUrl: 'https://codepen.io/pen/' },
  { id: 5, name: 'Team 5', demoUrl: 'https://en.m.wikipedia.org/wiki/Main_Page' },
  { id: 6, name: 'Team 6', demoUrl: 'https://www.w3schools.com/html/tryit.asp?filename=tryhtml_basic' },
];

  // Application state
  const [currentState, setCurrentState] = useState('countdown'); // countdown, presentation, grading
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [counter, setCounter] = useState(0); // Add a counter to force re-renders
  const [pollingData, setPollingData] = useState({
    'Content Quality': 4.5,
    'Technical Implementation': 4.2,
    'Presentation Skills': 3.8,
    'User Experience': 4.7,
    'Innovation': 4.0
  });
  const [mqttClient, setMqttClient] = useState(null);
  

  // Initialize MQTT client
  useEffect(() => {
    try {

      // This will be changed to the UVU MQTT: const client = new MQTTClient('mqtt://mqtt.uvu.cs:1883');
      // If there is security: const client = new MQTTClient('mqtt://mqtt.uvu.cs:1883', {
      //                         username: 'your_username',
      //                         password: 'your_password'
      //                        });

      const client = new MQTTClient('mqtt://localhost:1883');
      
      client.onConnect(() => {
        console.log('Connected to MQTT broker');
        client.subscribe('polling/results');
      });
      
      client.onMessage((topic, message) => {
        if (topic === 'polling/results') {
          try {
            setPollingData(JSON.parse(message.toString()));
          } catch (error) {
            console.error('Error parsing polling data:', error);
          }
        }
      });
      
      setMqttClient(client);
      
      return () => {
        if (client) {
          client.disconnect();
        }
      };
    } catch (error) {
      console.error('MQTT client initialization failed:', error);
      // Continue without MQTT for demonstration
    }
  }, []);

  // Display debug info on mount
  useEffect(() => {
    console.log(`[EVENT INFO] Start: ${eventConfig.date.toLocaleTimeString()}, End: ${eventConfig.endTime.toLocaleTimeString()}`);
    console.log(`[PRESENTATION] Team time: ${eventConfig.presentationTime / 60000} minutes, Grading time: ${eventConfig.gradingTime / 60000} minutes`);
  }, [eventConfig]);

  // Main timer logic - now using a different approach
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
        console.log('Countdown:', formatTime(remaining, 'mm:ss'));
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
        
        console.log('Presentation time remaining:', formatTime(presentationTimeRemaining, 'mm:ss'));
        
      } else {
        // In grading mode
        setCurrentState('grading');
        const gradingTimeRemaining = teamTime - timeInCurrentTeamSlot;
        setTimeRemaining(gradingTimeRemaining);
        
        console.log('Grading time remaining:', formatTime(gradingTimeRemaining, 'mm:ss'));
        
        // Notify grading app through MQTT
        if (mqttClient && Math.abs(timeInCurrentTeamSlot - eventConfig.presentationTime) < 1000) {
          try {
            mqttClient.publish('presentation/grading', JSON.stringify({
              team: teams[currentTeamIdx].id,
              startTime: currentTime.toISOString(),
              endTime: new Date(currentTime.getTime() + eventConfig.gradingTime).toISOString()
            }));
          } catch (error) {
            console.error('Error publishing to MQTT:', error);
          }
        }
      }
    }, 1000);
    
    return () => clearInterval(timerInterval);
  }, [currentTeamIndex]); // Reduced dependencies to avoid recreation issues

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
            />
          </div>
          <PresentationDisplay url={teams[currentTeamIndex].demoUrl} />
          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', textAlign: 'center', marginTop: '20px' }}>
            <p><strong>Note:</strong> In the actual application, the iframe above would load the team's demo. 
            For this simulation, we're showing a placeholder URL: {teams[currentTeamIndex].demoUrl}</p>
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
              />
            </div>
            <PollingDisplay pollingData={pollingData} />
            <p>Please submit your evaluation before time runs out</p>
          </div>
        );
      
      case 'completed':
        return (
          <div className="completed-container">
            <h1>Presentations Completed</h1>
            <p>Thank you for participating!</p>
          </div>
        );
      
      default:
        return <div>Loading...</div>;
    }
  };

  // Status bar that shows the simulation information
  const renderSimulationStatus = () => {
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#333',
        color: 'white',
        padding: '10px',
        textAlign: 'center',
        fontSize: '14px'
      }}>
        <div>
          <strong>SIMULATION MODE</strong> | 
          Current State: <span style={{ color: '#4ade80' }}>{currentState}</span> | 
          Team: <span style={{ color: '#4ade80' }}>{currentTeamIndex + 1}</span> | 
          Actual Time: <span style={{ color: '#4ade80' }}>{new Date().toLocaleTimeString()}</span>
        </div>
        <div style={{ fontSize: '12px', marginTop: '5px' }}>
          {demoMode ? 
            '⚡ DEMO MODE: Fast transitions (30s presentation, 15s grading)' : 
            'Normal timing: 12min presentation, 3min grading'}
        </div>
        <div style={{ fontSize: '11px', marginTop: '5px', fontFamily: 'monospace' }}>
          Timer: {timeRemaining ? Math.floor(timeRemaining/1000) + 's' : '--'} | 
          Tick: {counter} | 
          Format: {formatTime(timeRemaining, 'mm:ss')}
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