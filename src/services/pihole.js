import { proxyFetch } from './proxy';

class PiholeService {
  constructor() {
    this.baseUrl = null;
    this.apiKey = null;
    this.type = 'pihole'; // 'pihole' or 'adguard'
    this.username = null;
    this.password = null;
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
    this.type = config.type || 'pihole';
    this.apiKey = config.apiKey || '';
    this.username = config.username || '';
    this.password = config.password || '';

    try {
      if (this.type === 'adguard') {
        await this.fetchAdGuardStats();
      } else {
        await this.fetchPiholeStats();
      }

      this.connected = true;
      this.notifySubscribers();
      this.startPolling();
      return { success: true };
    } catch (error) {
      this.connected = false;
      console.error(`[DNS] Connection failed:`, error.message);
      throw error;
    }
  }

  _authHeader() {
    if (this.type === 'adguard' && this.username && this.password) {
      return 'Basic ' + btoa(`${this.username}:${this.password}`);
    }
    return null;
  }

  async _fetch(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const auth = this._authHeader();

      // Build proxy URL with custom auth headers if needed
      let proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      if (auth) {
        const headers = JSON.stringify({ Authorization: auth });
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
      throw error;
    }
  }

  async fetchPiholeStats() {
    const params = this.apiKey ? `?auth=${this.apiKey}` : '';

    const [summary, topItems, queryTypes] = await Promise.all([
      this._fetch(`${this.baseUrl}/admin/api.php?summaryRaw${params ? '&auth=' + this.apiKey : ''}`),
      this._fetch(`${this.baseUrl}/admin/api.php?topItems=5${params ? '&auth=' + this.apiKey : ''}`).catch(() => null),
      this._fetch(`${this.baseUrl}/admin/api.php?getQueryTypes${params ? '&auth=' + this.apiKey : ''}`).catch(() => null)
    ]);

    if (summary.status === undefined && !summary.domains_being_blocked) {
      throw new Error('Invalid Pi-hole response — check URL');
    }

    this.data = {
      type: 'pihole',
      status: summary.status || 'unknown',
      totalQueries: parseInt(summary.dns_queries_today) || 0,
      blockedQueries: parseInt(summary.ads_blocked_today) || 0,
      percentBlocked: parseFloat(summary.ads_percentage_today) || 0,
      domainsOnBlocklist: parseInt(summary.domains_being_blocked) || 0,
      uniqueDomains: parseInt(summary.unique_domains) || 0,
      queriesForwarded: parseInt(summary.queries_forwarded) || 0,
      queriesCached: parseInt(summary.queries_cached) || 0,
      clientsEverSeen: parseInt(summary.clients_ever_seen) || 0,
      uniqueClients: parseInt(summary.unique_clients) || 0,
      privacyLevel: summary.privacy_level,
      gravityLastUpdated: summary.gravity_last_updated?.absolute
        ? new Date(summary.gravity_last_updated.absolute * 1000).toLocaleDateString()
        : null,
      topPermitted: topItems?.top_queries ? Object.entries(topItems.top_queries).slice(0, 5).map(([domain, count]) => ({ domain, count })) : [],
      topBlocked: topItems?.top_ads ? Object.entries(topItems.top_ads).slice(0, 5).map(([domain, count]) => ({ domain, count })) : [],
      queryTypes: queryTypes?.querytypes || null,
      updatedAt: Date.now()
    };
  }

  async fetchAdGuardStats() {
    const [status, stats] = await Promise.all([
      this._fetch(`${this.baseUrl}/control/status`),
      this._fetch(`${this.baseUrl}/control/stats`)
    ]);

    if (status.dns_addresses === undefined && !status.protection_enabled) {
      throw new Error('Invalid AdGuard response — check URL and credentials');
    }

    const totalQueries = (stats.num_dns_queries) || 0;
    const blockedQueries = (stats.num_blocked_filtering) || 0;

    this.data = {
      type: 'adguard',
      status: status.protection_enabled ? 'enabled' : 'disabled',
      totalQueries,
      blockedQueries,
      percentBlocked: totalQueries > 0 ? (blockedQueries / totalQueries * 100) : 0,
      domainsOnBlocklist: stats.num_replaced_safebrowsing || 0,
      avgProcessingTime: stats.avg_processing_time ? Math.round(stats.avg_processing_time * 1000 * 100) / 100 : 0,
      topPermitted: (stats.top_queried_domains || []).slice(0, 5).map(entry => {
        const [domain, count] = Object.entries(entry)[0];
        return { domain, count };
      }),
      topBlocked: (stats.top_blocked_domains || []).slice(0, 5).map(entry => {
        const [domain, count] = Object.entries(entry)[0];
        return { domain, count };
      }),
      topClients: (stats.top_clients || []).slice(0, 5).map(entry => {
        const [client, count] = Object.entries(entry)[0];
        return { client, count };
      }),
      dnsPort: status.dns_port,
      protectionEnabled: status.protection_enabled,
      running: status.running,
      updatedAt: Date.now()
    };
  }

  async attemptReconnect() {
    if (this._reconnecting || !this.baseUrl) return;
    this._reconnecting = true;

    try {
      console.log('[DNS] Attempting reconnect...');
      if (this.type === 'adguard') {
        await this.fetchAdGuardStats();
      } else {
        await this.fetchPiholeStats();
      }
      this.connected = true;
      console.log('[DNS] Reconnected successfully');
    } catch (error) {
      console.log('[DNS] Reconnect failed:', error.message);
    } finally {
      this._reconnecting = false;
    }
  }

  async fetchAll() {
    if (!this.connected) {
      await this.attemptReconnect();
      if (!this.connected) return;
    }

    try {
      if (this.type === 'adguard') {
        await this.fetchAdGuardStats();
      } else {
        await this.fetchPiholeStats();
      }
      this.notifySubscribers();
    } catch (error) {
      console.error('[DNS] Poll failed:', error.message);
      this.connected = false;
    }
  }

  startPolling(interval = 30000) {
    this.stopPolling();
    this.pollInterval = setInterval(() => this.fetchAll(), interval);

    this._visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        console.log('[DNS] Tab visible — refreshing data');
        this.fetchAll();
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
    if (this.data) callback(this.data);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    if (this.data) {
      this.subscribers.forEach(cb => cb(this.data));
    }
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

export const pihole = new PiholeService();
export default pihole;
