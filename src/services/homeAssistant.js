// Home Assistant WebSocket API Service
class HomeAssistantService {
  constructor() {
    this.ws = null;
    this.messageId = 1;
    this.pendingPromises = new Map();
    this.subscribers = new Map();
    this.connected = false;
    this.authenticated = false;
    this.entities = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
  }

  async connect(url, token) {
    return new Promise((resolve, reject) => {
      try {
        // Close any existing connection first
        if (this.ws) {
          this.ws.onclose = null; // Prevent reconnect loop
          this.ws.close();
          this.ws = null;
        }

        // Reset reconnect attempts on fresh connection
        this.reconnectAttempts = 0;

        // Convert http(s) to ws(s)
        const wsUrl = url
          .replace('https://', 'wss://')
          .replace('http://', 'ws://')
          .replace(/\/$/, '') + '/api/websocket';

        this.url = url;
        this.token = token;
        
        // Connection timeout
        const timeout = setTimeout(() => {
          if (this.ws) {
            this.ws.close();
          }
          reject(new Error('Connection timeout - check URL and network'));
        }, 10000);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
        };

        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          this.handleMessage(message, resolve, reject, timeout);
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          reject(new Error('WebSocket connection failed - check if HA is accessible'));
        };

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          const wasAuthenticated = this.authenticated;
          this.connected = false;
          this.authenticated = false;

          // Only reject if we haven't connected yet
          if (!wasAuthenticated) {
            reject(new Error(`Connection closed: ${event.reason || 'Unknown reason'} (code: ${event.code})`));
          } else {
            // Was connected before, attempt reconnect
            this.attemptReconnect();
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  handleMessage(message, resolveConnect, rejectConnect, timeout) {
    switch (message.type) {
      case 'auth_required':
        this.ws.send(JSON.stringify({
          type: 'auth',
          access_token: this.token
        }));
        break;

      case 'auth_ok':
        if (timeout) clearTimeout(timeout);
        this.connected = true;
        this.authenticated = true;
        this.reconnectAttempts = 0;
        this.subscribeToStateChanges();
        if (resolveConnect) resolveConnect({ success: true, version: message.ha_version });
        break;

      case 'auth_invalid':
        if (timeout) clearTimeout(timeout);
        if (rejectConnect) rejectConnect(new Error(message.message || 'Invalid access token'));
        break;

      case 'result':
        if (this.pendingPromises.has(message.id)) {
          const { resolve, reject } = this.pendingPromises.get(message.id);
          this.pendingPromises.delete(message.id);
          if (message.success) {
            resolve(message.result);
          } else {
            reject(new Error(message.error?.message || 'Unknown error'));
          }
        }
        break;

      case 'event':
        if (message.event?.event_type === 'state_changed') {
          const { entity_id, new_state } = message.event.data;
          if (new_state) {
            this.entities[entity_id] = new_state;
            this.notifySubscribers(entity_id, new_state);
          }
        }
        break;
    }
  }

  async sendCommand(type, payload = {}) {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected to Home Assistant');
    }

    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      this.pendingPromises.set(id, { resolve, reject });

      this.ws.send(JSON.stringify({
        id,
        type,
        ...payload
      }));

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingPromises.has(id)) {
          this.pendingPromises.delete(id);
          reject(new Error('Command timeout'));
        }
      }, 10000);
    });
  }

  async subscribeToStateChanges() {
    try {
      await this.sendCommand('subscribe_events', {
        event_type: 'state_changed'
      });
      
      // Get initial states
      const states = await this.sendCommand('get_states');
      states.forEach(state => {
        this.entities[state.entity_id] = state;
      });
    } catch (error) {
    }
  }

  subscribe(entityId, callback) {
    if (!this.subscribers.has(entityId)) {
      this.subscribers.set(entityId, new Set());
    }
    this.subscribers.get(entityId).add(callback);

    // Immediately call with current state if available
    if (this.entities[entityId]) {
      callback(this.entities[entityId]);
    }

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(entityId);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  notifySubscribers(entityId, state) {
    const subs = this.subscribers.get(entityId);
    if (subs) {
      subs.forEach(callback => callback(state));
    }
  }

  async callService(domain, service, data = {}) {
    return this.sendCommand('call_service', {
      domain,
      service,
      service_data: data
    });
  }

  async toggle(entityId) {
    const [domain] = entityId.split('.');
    return this.callService(domain, 'toggle', { entity_id: entityId });
  }

  async turnOn(entityId, data = {}) {
    const [domain] = entityId.split('.');
    return this.callService(domain, 'turn_on', { entity_id: entityId, ...data });
  }

  async turnOff(entityId) {
    const [domain] = entityId.split('.');
    return this.callService(domain, 'turn_off', { entity_id: entityId });
  }

  async activateScene(sceneId) {
    return this.callService('scene', 'turn_on', { entity_id: sceneId });
  }

  getEntity(entityId) {
    return this.entities[entityId] || null;
  }

  getState(entityId) {
    return this.entities[entityId]?.state || null;
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    // Faster reconnect for first few attempts (1s, 2s, 3s...), then cap at 5s
    const delay = Math.min(this.reconnectAttempts * 1000, this.reconnectDelay);

    setTimeout(() => {
      if (this.url && this.token) {
        // Don't reset attempts here - only on successful auth or fresh connect()
        const currentAttempts = this.reconnectAttempts;
        this.connect(this.url, this.token)
          .catch((err) => {
            // Restore attempt count and try again
            this.reconnectAttempts = currentAttempts;
            this.attemptReconnect();
          });
      }
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.authenticated = false;
    this.entities = {};
    this.subscribers.clear();
  }

  isConnected() {
    return this.connected && this.authenticated;
  }
}

// Singleton instance
export const homeAssistant = new HomeAssistantService();
export default homeAssistant;
