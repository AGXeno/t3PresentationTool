// This is where everything happens to obtain the polling results to the display iframe. 
// How it's going to work:
// 1. Users will scan the QR code and submit their ratings through the polling app
// 2. Thier app will publish the results through MQTT
// 3. We recieve that data from them
import mqtt from 'mqtt';

class MQTTClient {
  constructor(brokerUrl) {
    this.client = null;
    this.brokerUrl = brokerUrl;
    this.connect();
  }

  connect() {
    this.client = mqtt.connect(this.brokerUrl, {
      clientId: `presentation_tool_${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
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
    this.client.on('connect', callback);
  }

  onMessage(callback) {
    this.client.on('message', callback);
  }

  subscribe(topic) {
    if (this.client.connected) {
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
    if (this.client.connected) {
      this.client.publish(topic, message, { qos: 1 }, (err) => {
        if (err) {
          console.error(`Publish error: ${err}`);
        }
      });
    } else {
      console.warn('Cannot publish, client not connected');
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
    }
  }
}

export default MQTTClient;
