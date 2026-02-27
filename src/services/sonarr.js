import { proxyFetch } from './proxy';

class SonarrService {
  constructor() {
    this.baseUrl = null;
    this.apiKey = null;
    this.connected = false;
    this.calendar = [];
    this.subscribers = new Set();
    this.pollInterval = null;
    this._reconnecting = false;
    this._visibilityHandler = null;
  }

  async connect(url, apiKey) {
    this.stopPolling();

    let normalizedUrl = url.trim().replace(/\/$/, '');
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'http://' + normalizedUrl;
    }

    this.baseUrl = normalizedUrl;
    this.apiKey = apiKey;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await this._fetch('/api/v3/system/status', { signal: controller.signal });
      clearTimeout(timeout);

      this.connected = true;
      await this.fetchCalendar();
      this.startPolling();
      return { success: true, version: res.version };
    } catch (error) {
      this.connected = false;
      throw new Error(`Sonarr connection failed: ${error.message}`);
    }
  }

  disconnect() {
    this.stopPolling();
    this.connected = false;
    this.baseUrl = null;
    this.apiKey = null;
    this.calendar = [];
    this._notify();
  }

  async _fetch(path, opts = {}) {
    const url = `${this.baseUrl}${path}`;
    const separator = path.includes('?') ? '&' : '?';
    const fullUrl = `${url}${separator}apikey=${this.apiKey}`;
    const res = await proxyFetch(fullUrl, opts);
    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid API key');
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  }

  async fetchCalendar() {
    if (!this.connected || !this.baseUrl) return;

    try {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      const end = new Date(now);
      end.setDate(end.getDate() + 14);

      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      const episodes = await this._fetch(`/api/v3/calendar?start=${startStr}&end=${endStr}&includeSeries=true&includeEpisodeFile=true`);

      this.calendar = (episodes || []).map(ep => ({
        id: ep.id,
        seriesId: ep.seriesId,
        seriesTitle: ep.series?.title || 'Unknown',
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
        title: ep.title || '',
        overview: ep.overview || '',
        airDateUtc: ep.airDateUtc,
        airDate: ep.airDate,
        hasFile: ep.hasFile || false,
        grabbed: ep.grabbed || false,
        monitored: ep.monitored,
        poster: ep.series?.images?.find(i => i.coverType === 'poster')?.remoteUrl || null,
        banner: ep.series?.images?.find(i => i.coverType === 'banner')?.remoteUrl || null,
        fanart: ep.series?.images?.find(i => i.coverType === 'fanart')?.remoteUrl || null,
        network: ep.series?.network || '',
        runtime: ep.series?.runtime || 0,
        genres: ep.series?.genres || []
      })).sort((a, b) => new Date(a.airDateUtc) - new Date(b.airDateUtc));

      this._notify();
    } catch (error) {
      if (error.message.includes('401')) {
        this.connected = false;
      }
    }
  }

  async attemptReconnect() {
    if (this._reconnecting || !this.baseUrl || !this.apiKey) return;
    this._reconnecting = true;
    try {
      const res = await this._fetch('/api/v3/system/status');
      if (res?.version) {
        this.connected = true;
        await this.fetchCalendar();
      }
    } catch {
      // still down
    } finally {
      this._reconnecting = false;
    }
  }

  startPolling() {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      if (this.connected) {
        this.fetchCalendar();
      } else {
        this.attemptReconnect();
      }
    }, 300000); // 5 min

    this._visibilityHandler = () => {
      if (document.visibilityState === 'visible' && this.connected) {
        this.fetchCalendar();
      } else if (document.visibilityState === 'visible' && !this.connected) {
        this.attemptReconnect();
      }
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

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this._getData());
    return () => this.subscribers.delete(callback);
  }

  _notify() {
    const data = this._getData();
    this.subscribers.forEach(cb => cb(data));
  }

  _getData() {
    return {
      connected: this.connected,
      calendar: this.calendar
    };
  }
}

export const sonarr = new SonarrService();
