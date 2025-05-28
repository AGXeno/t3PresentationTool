import mqtt from 'mqtt';

class MQTTClient {
  constructor(brokerUrl, options = {}) {
    this.client = null;
    this.brokerUrl = brokerUrl;
    this.options = options;
    this.peerId = `presentation_tool_${Math.random().toString(16).substr(2, 8)}`;
    this.connect();
  }

  connect() {
    // Use WebSocket connection as specified by the grading app team
    this.client = mqtt.connect(this.brokerUrl, {
      clientId: this.peerId,
      clean: true,
      ...this.options
    });
    
    this.client.on('error', (err) => {
      console.error('MQTT Connection Error:', err);
      this.client.end();
    });
    
    this.client.on('reconnect', () => {
      console.log('MQTT Client Reconnecting');
    });
    
    this.client.on('close', () => {
      console.log('MQTT Client Disconnected');
    });
  }

  onConnect(callback) {
    this.client.on('connect', () => {
      console.log('Connected to MQTT broker with peer ID:', this.peerId);
      
      // Subscribe to grading app topics using wildcards
      this.subscribe('scores/#');
      this.subscribe('summary/#');
      this.subscribe('presence');
      
      // 🔧 Subscribe to broadcast topics for peer discovery issues
      this.subscribe('scores/broadcast');
      this.subscribe('presentation/scores/broadcast');
      this.subscribe('scores/all'); // 🔧 NEW: Additional broadcast topic
      this.subscribe('summary/broadcast'); // 🔧 NEW: Summary broadcast topic
      
      console.log('🔧 Added broadcast topic subscriptions for peer discovery fallback');
      
      // Announce our presence
      this.announcePresence();
      
      callback();
    });
  }

  onMessage(callback) {
    this.client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // 🔧 Handle broadcast scores (UPDATED to include 'scores/all')
        if (topic === 'scores/broadcast' || topic === 'presentation/scores/broadcast' || topic === 'scores/all') {
          console.log('🔧 Received broadcast score:', data);
          // Convert broadcast to standard format
          callback('scores/broadcast', message);
          return;
        }
        
        // 🔧 Handle broadcast summaries
        if (topic === 'summary/broadcast') {
          console.log('🔧 Received broadcast summary:', data);
          callback('summary/broadcast', message);
          return;
        }
        
        // Handle regular messages
        callback(topic, message);
      } catch (error) {
        console.error('Error parsing MQTT message:', error);
        callback(topic, message);
      }
    });
  }

  subscribe(topic) {
    if (this.client && this.client.connected) {
      this.client.subscribe(topic, (err) => {
        if (!err) {
          console.log(`Subscribed to ${topic}`);
        } else {
          console.error(`Subscribe error: ${err}`);
        }
      });
    } else {
      console.warn('Cannot subscribe, client not connected');
    }
  }

  publish(topic, message) {
    if (this.client && this.client.connected) {
      this.client.publish(topic, message, { qos: 1 }, (err) => {
        if (err) {
          console.error(`Publish error: ${err}`);
        }
      });
    } else {
      console.warn('Cannot publish, client not connected');
    }
  }

  // Announce our presence to the grading app
  announcePresence() {
    const presenceData = {
      peerId: this.peerId,
      timestamp: new Date().toISOString(),
      type: 'presentation_tool'
    };
    
    this.publish('presence', JSON.stringify(presenceData));
    
    // 🔧 Also announce on broadcast channel
    this.publish('presence/broadcast', JSON.stringify(presenceData));
    console.log('🔧 Announced presence on both regular and broadcast channels');
  }

  // Send grading window notification to peers
  notifyGradingWindow(teamInfo) {
    const gradingNotification = {
      type: 'grading_window',
      team: teamInfo.team,
      teamName: teamInfo.teamName,
      startTime: teamInfo.startTime,
      endTime: teamInfo.endTime,
      source: this.peerId,
      timestamp: new Date().toISOString()
    };
    
    // Send to a presentation-specific topic
    this.publish(`presentation/grading/${this.peerId}`, JSON.stringify(gradingNotification));
  }

  // Send team reset notification to all grading apps
  notifyTeamReset(teamInfo) {
    const resetNotification = {
      type: 'team_reset',
      team: teamInfo.team,
      teamName: teamInfo.teamName,
      startTime: teamInfo.startTime,
      action: 'clear_scores', // Tell grading apps to clear their data
      source: this.peerId,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to all grading apps on the team_reset topic
    this.publish('team_reset', JSON.stringify(resetNotification));
    
    console.log('🔄 Sent team reset notification:', resetNotification);
  }

  // Manual reset trigger (for testing or admin use)
  triggerManualReset(reason = 'Manual reset from presentation tool') {
    const resetNotification = {
      type: 'team_reset',
      team: 'all',
      teamName: 'All Teams',
      startTime: new Date().toISOString(),
      action: 'clear_scores',
      reason: reason,
      source: this.peerId,
      timestamp: new Date().toISOString()
    };
    
    this.publish('team_reset', JSON.stringify(resetNotification));
    
    console.log('🔄 Triggered manual reset:', resetNotification);
  }

  // 🔧 Force grading apps to use broadcast mode
  triggerBroadcastMode() {
    const broadcastTrigger = {
      type: 'force_broadcast_mode',
      reason: 'Peer discovery issues detected',
      source: this.peerId,
      timestamp: new Date().toISOString()
    };
    
    this.publish('system/broadcast_mode', JSON.stringify(broadcastTrigger));
    console.log('🔧 Triggered broadcast mode for grading apps');
  }

  // Check connection status
  isConnected() {
    return this.client && this.client.connected;
  }

  // Get connection info
  getConnectionInfo() {
    return {
      peerId: this.peerId,
      brokerUrl: this.brokerUrl,
      connected: this.isConnected(),
      timestamp: new Date().toISOString()
    };
  }

  disconnect() {
    if (this.client) {
      this.client.end();
    }
  }

  getPeerId() {
    return this.peerId;
  }
}

export default MQTTClient;