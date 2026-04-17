const TRANSLINK_ATTRIBUTION = 'Transport Information supplied by Translink Opendata API';

export const WATCHED_STOPS = ['10010881', '10010863'];
export const WATCHED_LINES = ['516'];
export const WATCHED_STOP_LABELS = {
  '10010881': 'Saintfield',
  '10010863': "Queen's Park"
};

class BusNIService {
  constructor() {
    this.baseUrl = null;
    this.apiKey = null;
    this.connected = false;
    this.data = null;
    this.subscribers = new Set();
    this.pollInterval = null;
    this._visibilityHandler = null;
    this._reconnecting = false;
  }

  async connect(config) {
    this.stopPolling();

    let url = (config.url || '').trim().replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }

    this.baseUrl = url;
    this.apiKey = config.apiKey || '';

    try {
      await this._fetch(`${this.baseUrl}/health`, false);
      await this.fetchAll();
      this.connected = true;
      this.notifySubscribers();
      this.startPolling();
      return { success: true };
    } catch (error) {
      this.connected = false;
      throw new Error(error.message || 'Could not reach Translink wrapper');
    }
  }

  async _fetch(url, withKey = true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      let proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      if (withKey && this.apiKey) {
        const headers = JSON.stringify({ 'X-API-Key': this.apiKey });
        proxyUrl += `&headers=${encodeURIComponent(headers)}`;
      }
      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Timeout contacting Translink wrapper');
      }
      throw error;
    }
  }

  async fetchAlerts() {
    const params = new URLSearchParams();
    params.set('stop_ids', WATCHED_STOPS.join(','));
    params.set('lines', WATCHED_LINES.join(','));
    params.set('mode', 'bus');
    params.set('min_priority', 'normal');
    const url = `${this.baseUrl}/alerts?${params.toString()}`;
    try {
      const res = await this._fetch(url);
      return { data: res.data || null, cache: res.cache || null, error: null };
    } catch (err) {
      return { data: null, cache: null, error: err.message };
    }
  }

  async fetchDepartures(stopId) {
    const params = new URLSearchParams();
    params.set('limit', '5');
    params.set('mode', 'bus');
    params.set('exclude_cancelled', 'false');
    const url = `${this.baseUrl}/departures/${encodeURIComponent(stopId)}?${params.toString()}`;
    try {
      const res = await this._fetch(url);
      return { data: res.data || [], cache: res.cache || null, error: null };
    } catch (err) {
      return { data: [], cache: null, error: err.message };
    }
  }

  async fetchAll() {
    if (!this.baseUrl) return;

    const alertsPromise = this.fetchAlerts();
    const stopPromises = WATCHED_STOPS.map(stopId =>
      this.fetchDepartures(stopId).then(r => ({ stopId, ...r }))
    );

    const [alerts, ...departures] = await Promise.all([alertsPromise, ...stopPromises]);

    const stops = {};
    departures.forEach(d => {
      stops[d.stopId] = { data: d.data, cache: d.cache, error: d.error };
    });

    this.data = {
      alerts,
      stops,
      stopLabels: WATCHED_STOP_LABELS,
      watchedStops: WATCHED_STOPS,
      watchedLines: WATCHED_LINES,
      attribution: TRANSLINK_ATTRIBUTION,
      updatedAt: Date.now()
    };
    this.notifySubscribers();
  }

  async attemptReconnect() {
    if (this._reconnecting || !this.baseUrl) return;
    this._reconnecting = true;
    try {
      await this._fetch(`${this.baseUrl}/health`, false);
      this.connected = true;
    } catch (e) {
    } finally {
      this._reconnecting = false;
    }
  }

  startPolling(interval = 120000) {
    this.stopPolling();
    this.pollInterval = setInterval(() => this.fetchAll(), interval);
    this._visibilityHandler = () => {
      if (document.visibilityState === 'visible') this.fetchAll();
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
  }

  subscribe(cb) {
    this.subscribers.add(cb);
    if (this.data) cb(this.data);
    return () => this.subscribers.delete(cb);
  }

  notifySubscribers() {
    if (this.data) this.subscribers.forEach(cb => cb(this.data));
  }

  getData() {
    return this.data;
  }

  disconnect() {
    this.stopPolling();
    this.connected = false;
    this.data = null;
    this.subscribers.clear();
  }

  isConnected() {
    return this.connected;
  }
}

export const busni = new BusNIService();
export default busni;
