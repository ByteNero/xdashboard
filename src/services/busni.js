const TRANSLINK_ATTRIBUTION = 'Transport Information supplied by Translink Opendata API';

export const DEFAULT_STOPS = ['10010881', '10010863'];
export const DEFAULT_LINES = ['516'];
export const STOP_LABELS = {
  '10010881': 'Saintfield',
  '10010863': "Queen's Park"
};
// Upstream fetch size — wider than maxPerStop so destination/line filters
// still have something left after trimming.
const UPSTREAM_LIMIT = 10;

const parseCsv = (raw) =>
  (raw || '').split(',').map(s => s.trim()).filter(Boolean);

class BusNIService {
  constructor() {
    this.baseUrl = null;
    this.apiKey = null;
    this.stopIds = [...DEFAULT_STOPS];
    this.lineFilter = [];
    this.destinationFilter = '';
    this.maxPerStop = 2;
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

    const configuredStops = parseCsv(config.stopIds);
    this.stopIds = configuredStops.length ? configuredStops : [...DEFAULT_STOPS];
    this.lineFilter = parseCsv(config.lineFilter);
    this.destinationFilter = (config.destinationFilter || '').trim().toLowerCase();
    const parsedMax = parseInt(config.maxPerStop, 10);
    this.maxPerStop = Number.isFinite(parsedMax) && parsedMax > 0
      ? Math.min(parsedMax, UPSTREAM_LIMIT)
      : 2;

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

  _filterDepartures(deps) {
    let out = Array.isArray(deps) ? deps : [];
    if (this.lineFilter.length) {
      const set = new Set(this.lineFilter.map(l => l.toLowerCase()));
      out = out.filter(d => set.has(String(d.route || d.line || '').toLowerCase()));
    }
    if (this.destinationFilter) {
      out = out.filter(d => String(d.destination || '').toLowerCase().includes(this.destinationFilter));
    }
    return out.slice(0, this.maxPerStop);
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
    params.set('stop_ids', this.stopIds.join(','));
    const lines = this.lineFilter.length ? this.lineFilter : DEFAULT_LINES;
    params.set('lines', lines.join(','));
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
    params.set('limit', String(UPSTREAM_LIMIT));
    params.set('mode', 'bus');
    params.set('exclude_cancelled', 'false');
    const url = `${this.baseUrl}/departures/${encodeURIComponent(stopId)}?${params.toString()}`;
    try {
      const res = await this._fetch(url);
      const raw = Array.isArray(res.data) ? res.data : [];
      return {
        data: this._filterDepartures(raw),
        cache: res.cache || null,
        error: null
      };
    } catch (err) {
      return { data: [], cache: null, error: err.message };
    }
  }

  async fetchAll() {
    if (!this.baseUrl) return;

    const alertsPromise = this.fetchAlerts();
    const stopPromises = this.stopIds.map(stopId =>
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
      stopLabels: STOP_LABELS,
      watchedStops: [...this.stopIds],
      watchedLines: this.lineFilter.length ? [...this.lineFilter] : [...DEFAULT_LINES],
      destinationFilter: this.destinationFilter,
      maxPerStop: this.maxPerStop,
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
