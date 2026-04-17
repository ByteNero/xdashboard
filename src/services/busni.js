const TRANSLINK_ATTRIBUTION = 'Transport Information supplied by Translink Opendata API';

export const DEFAULT_STOPS = ['10010881', '10010863'];
export const DEFAULT_LINES = ['516'];
export const STOP_LABELS = {
  '10010881': 'Saintfield',
  '10010863': "Queen's Park"
};

const UPSTREAM_LIMIT = 10;
const DEFAULT_POLL_MINUTES = 5;
const MIN_POLL_MINUTES = 1;
const MAX_POLL_MINUTES = 60;
const TIMETABLE_TTL_MS = 20 * 60 * 60 * 1000; // 20h — comfortably inside the wrapper's 24h cache
const TICK_MS = 60 * 1000;

const parseCsv = (raw) =>
  (raw || '').split(',').map(s => s.trim()).filter(Boolean);

class BusNIService {
  constructor() {
    this.baseUrl = null;
    this.apiKey = null;
    this.stopIds = [...DEFAULT_STOPS];
    this.resolvedStopLabels = {};
    this.lineFilter = [];
    this.destinationFilter = '';
    this.panelLimit = 5;
    this.pollIntervalMs = DEFAULT_POLL_MINUTES * 60 * 1000;
    this.postcode = '';
    this.connected = false;
    this.data = null;
    this.subscribers = new Set();
    this.timetableByStop = {}; // id -> { data, cache, fetchedAt, error }
    this.alertsResult = null;
    this.healthData = null;
    this.tickInterval = null;
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
    this.postcode = (config.postcode || '').trim();
    this.lineFilter = parseCsv(config.lineFilter);
    this.destinationFilter = (config.destinationFilter || '').trim();

    const parsedPanel = parseInt(config.panelLimit, 10);
    this.panelLimit = Number.isFinite(parsedPanel) && parsedPanel > 0
      ? Math.min(parsedPanel, UPSTREAM_LIMIT)
      : 5;

    const parsedPoll = parseInt(config.pollIntervalMinutes, 10);
    const pollMins = Number.isFinite(parsedPoll) && parsedPoll > 0
      ? Math.min(Math.max(parsedPoll, MIN_POLL_MINUTES), MAX_POLL_MINUTES)
      : DEFAULT_POLL_MINUTES;
    this.pollIntervalMs = pollMins * 60 * 1000;

    this.resolvedStopLabels = { ...STOP_LABELS };
    this.timetableByStop = {};
    this.alertsResult = null;
    this.healthData = null;

    try {
      await this.fetchHealth();

      // Resolve stops: postcode wins if set, else use stopIds, else defaults.
      if (this.postcode) {
        const resolved = await this._resolveStopsFromPostcode(this.postcode);
        if (!resolved.length) {
          throw new Error(`No stops found for postcode ${this.postcode}`);
        }
        this.stopIds = resolved.map(s => s.id);
        resolved.forEach(s => { this.resolvedStopLabels[s.id] = s.name || s.id; });
      } else {
        const configuredStops = parseCsv(config.stopIds);
        this.stopIds = configuredStops.length ? configuredStops : [...DEFAULT_STOPS];
      }

      await this.fetchTimetables();
      await this.fetchAlerts();
      this.connected = true;
      this._emit();
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

  async _resolveStopsFromPostcode(postcode) {
    const params = new URLSearchParams();
    params.set('postcode', postcode);
    const url = `${this.baseUrl}/stops/by-postcode?${params.toString()}`;
    const res = await this._fetch(url);
    // Wrapper shape: { data: { postcode, resolved, stops: [...] } }
    const raw = Array.isArray(res?.data?.stops)
      ? res.data.stops
      : Array.isArray(res?.data) ? res.data : [];
    return raw
      .map(s => ({ id: String(s.id || s.stop_id || ''), name: s.name || s.stop_name || '' }))
      .filter(s => s.id);
  }

  async fetchHealth() {
    try {
      const res = await this._fetch(`${this.baseUrl}/health`, false);
      this.healthData = res || null;
    } catch (e) {
      this.healthData = null;
    }
  }

  _tomorrowDateString() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  async fetchTimetable(stopId, date) {
    const params = new URLSearchParams();
    params.set('mode', 'bus');
    if (date) params.set('date', date);
    if (this.lineFilter.length) params.set('lines', this.lineFilter.join(','));
    if (this.destinationFilter) params.set('destination', this.destinationFilter);
    const url = `${this.baseUrl}/timetable/${encodeURIComponent(stopId)}?${params.toString()}`;
    try {
      const res = await this._fetch(url);
      const rows = Array.isArray(res?.data) ? res.data : [];
      return { data: rows, cache: res?.cache || null, fetchedAt: Date.now(), error: null };
    } catch (err) {
      return { data: [], cache: null, fetchedAt: Date.now(), error: err.message };
    }
  }

  async fetchTimetables(force = false) {
    const now = Date.now();
    const tomorrowDate = this._tomorrowDateString();

    const entries = await Promise.all(this.stopIds.map(async id => {
      const existing = this.timetableByStop[id] || {};
      const todayFresh = existing.today && !existing.today.error
        && (now - existing.today.fetchedAt) < TIMETABLE_TTL_MS;
      const tomorrowFresh = existing.tomorrow
        && existing.tomorrow.date === tomorrowDate
        && !existing.tomorrow.error
        && (now - existing.tomorrow.fetchedAt) < TIMETABLE_TTL_MS;

      const [today, tomorrow] = await Promise.all([
        !force && todayFresh ? existing.today : this.fetchTimetable(id),
        !force && tomorrowFresh ? existing.tomorrow : this.fetchTimetable(id, tomorrowDate).then(r => ({ ...r, date: tomorrowDate }))
      ]);

      return [id, { today, tomorrow }];
    }));
    this.timetableByStop = Object.fromEntries(entries);
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
      this.alertsResult = { data: res?.data || null, cache: res?.cache || null, error: null };
    } catch (err) {
      this.alertsResult = { data: null, cache: null, error: err.message };
    }
  }

  _upcomingForStop(stopId) {
    const entry = this.timetableByStop[stopId];
    if (!entry) return { data: [], cache: null, error: 'no data' };

    const today = entry.today || { data: [], cache: null, error: null };
    const tomorrow = entry.tomorrow || { data: [], cache: null, error: null };

    if (today.error && tomorrow.error && !today.data?.length && !tomorrow.data?.length) {
      return { data: [], cache: today.cache || tomorrow.cache, error: today.error || tomorrow.error };
    }

    const now = Date.now();
    const ceiling = Math.max(this.panelLimit, 2);
    // Keep buses whose scheduled time is in the last 60s too (the "Due" state)
    const cutoff = now - 60 * 1000;

    const enrich = (source) => (d) => {
      const t = Date.parse(d.scheduled_at);
      const mins = Math.max(0, Math.round((t - now) / 60000));
      return {
        ...d,
        minutes_until: mins,
        is_realtime_tracked: false,
        cancelled: d.cancelled || false,
        stale: d.stale || source.cache?.status === 'STALE'
      };
    };

    const todaysUpcoming = (today.data || [])
      .filter(d => {
        const t = Date.parse(d.scheduled_at);
        return !isNaN(t) && t >= cutoff;
      })
      .map(enrich(today));

    const needed = ceiling - todaysUpcoming.length;
    const tomorrowsFill = needed > 0
      ? (tomorrow.data || [])
          .filter(d => !isNaN(Date.parse(d.scheduled_at)))
          .map(enrich(tomorrow))
          .slice(0, needed)
      : [];

    const merged = [...todaysUpcoming, ...tomorrowsFill].slice(0, ceiling);

    return {
      data: merged,
      cache: today.cache || tomorrow.cache,
      error: null
    };
  }

  _emit() {
    const stops = {};
    this.stopIds.forEach(id => { stops[id] = this._upcomingForStop(id); });

    this.data = {
      alerts: this.alertsResult,
      stops,
      stopLabels: this.resolvedStopLabels,
      watchedStops: [...this.stopIds],
      watchedLines: this.lineFilter.length ? [...this.lineFilter] : [...DEFAULT_LINES],
      destinationFilter: this.destinationFilter,
      panelLimit: this.panelLimit,
      postcode: this.postcode,
      quotaStatus: this.healthData?.quota_status || 'unknown',
      quotaUsed: this.healthData?.quota_used,
      quotaLimit: this.healthData?.quota_limit,
      attribution: TRANSLINK_ATTRIBUTION,
      updatedAt: Date.now()
    };
    this.notifySubscribers();
  }

  async refresh() {
    // Full wrapper hit: alerts + health + timetable-if-stale.
    // Called from the refresh icon, on visibility change, and on the poll timer.
    await Promise.all([
      this.fetchAlerts(),
      this.fetchHealth(),
      this.fetchTimetables(false)
    ]);
    this._emit();
  }

  async fetchAll() {
    // Kept for compatibility with any external caller. Same as refresh().
    return this.refresh();
  }

  async attemptReconnect() {
    if (this._reconnecting || !this.baseUrl) return;
    this._reconnecting = true;
    try {
      await this.fetchHealth();
      this.connected = true;
    } catch (e) {
    } finally {
      this._reconnecting = false;
    }
  }

  startPolling(interval) {
    this.stopPolling();

    // Local tick: re-compute minutes_until from the cached timetable every 60s,
    // no network. This is what makes the panel feel "live" without any quota cost.
    this.tickInterval = setInterval(() => this._emit(), TICK_MS);

    // Network poll: alerts + health (+ timetable if stale).
    const ms = interval || this.pollIntervalMs;
    this.pollInterval = setInterval(() => this.refresh(), ms);

    this._visibilityHandler = () => {
      if (document.visibilityState === 'visible') this.refresh();
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);
  }

  stopPolling() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
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
    this.timetableByStop = {};
    this.alertsResult = null;
    this.healthData = null;
    this.subscribers.clear();
  }

  isConnected() {
    return this.connected;
  }
}

export const busni = new BusNIService();
export default busni;
