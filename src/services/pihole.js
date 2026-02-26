class PiholeService {
  constructor() {
    this.baseUrl = null;
    this.apiKey = null;
    this.type = 'pihole'; // 'pihole' or 'adguard'
    this.piholeVersion = null; // 5 or 6, auto-detected
    this.username = null;
    this.password = null;
    this.sid = null; // v6 session ID
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
    this.sid = null;
    this.piholeVersion = null;

    try {
      if (this.type === 'adguard') {
        await this.fetchAdGuardStats();
      } else {
        // Auto-detect v5 vs v6
        await this._detectAndFetch();
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

  // Proxy helper — builds /api/proxy URL with optional custom headers
  async _fetch(url, opts = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      let proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;

      // Merge custom headers
      const customHeaders = opts.headers || {};
      if (Object.keys(customHeaders).length > 0) {
        proxyUrl += `&headers=${encodeURIComponent(JSON.stringify(customHeaders))}`;
      }

      const fetchOpts = { signal: controller.signal };
      if (opts.method) fetchOpts.method = opts.method;
      if (opts.body) {
        fetchOpts.body = opts.body;
        fetchOpts.headers = { 'Content-Type': 'application/json' };
      }

      const response = await fetch(proxyUrl, fetchOpts);
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

  // --- Pi-hole version detection ---

  async _detectAndFetch() {
    // If we already know the version, use it
    if (this.piholeVersion === 6) {
      return this._fetchV6Stats();
    }
    if (this.piholeVersion === 5) {
      return this._fetchV5Stats();
    }

    // Try v6 first (/api/auth endpoint)
    try {
      console.log('[DNS] Trying Pi-hole v6 API...');
      await this._authV6();
      this.piholeVersion = 6;
      console.log('[DNS] Detected Pi-hole v6');
      return this._fetchV6Stats();
    } catch (e) {
      console.log('[DNS] v6 auth failed, trying v5...', e.message);
    }

    // Fall back to v5
    try {
      await this._fetchV5Stats();
      this.piholeVersion = 5;
      console.log('[DNS] Detected Pi-hole v5');
    } catch (e) {
      throw new Error('Could not connect — check URL and API key/password');
    }
  }

  // --- Pi-hole v6 ---

  async _authV6() {
    const password = this.apiKey || this.password || '';
    const data = await this._fetch(`${this.baseUrl}/api/auth`, {
      method: 'POST',
      body: JSON.stringify({ password })
    });

    if (data?.session?.valid) {
      this.sid = data.session.sid; // null if no password set
      console.log('[DNS] v6 authenticated, sid:', this.sid ? 'obtained' : 'not needed');
      return;
    }

    throw new Error('Pi-hole v6 authentication failed');
  }

  _v6Url(path) {
    let url = `${this.baseUrl}/api${path}`;
    if (this.sid) {
      url += (url.includes('?') ? '&' : '?') + `sid=${this.sid}`;
    }
    return url;
  }

  async _fetchV6Stats() {
    // Try to fetch summary; if 401, re-auth and retry once
    let summary;
    try {
      summary = await this._fetch(this._v6Url('/stats/summary'));
    } catch (e) {
      if (e.message.includes('401')) {
        console.log('[DNS] v6 session expired, re-authenticating...');
        await this._authV6();
        summary = await this._fetch(this._v6Url('/stats/summary'));
      } else {
        throw e;
      }
    }

    if (!summary?.queries) {
      throw new Error('Invalid Pi-hole v6 response');
    }

    // Fetch top domains (permitted + blocked) in parallel
    const [topPermitted, topBlocked] = await Promise.all([
      this._fetch(this._v6Url('/stats/top_domains?count=5')).catch(() => null),
      this._fetch(this._v6Url('/stats/top_domains?blocked=true&count=5')).catch(() => null)
    ]);

    this.data = {
      type: 'pihole',
      version: 6,
      status: summary.queries ? 'enabled' : 'disabled',
      totalQueries: summary.queries.total || 0,
      blockedQueries: summary.queries.blocked || 0,
      percentBlocked: summary.queries.percent_blocked || 0,
      domainsOnBlocklist: summary.gravity?.domains_being_blocked || 0,
      uniqueDomains: summary.queries.unique_domains || 0,
      queriesForwarded: summary.queries.forwarded || 0,
      queriesCached: summary.queries.cached || 0,
      clientsEverSeen: summary.clients?.total || 0,
      uniqueClients: summary.clients?.active || 0,
      gravityLastUpdated: summary.gravity?.last_update
        ? new Date(summary.gravity.last_update * 1000).toLocaleDateString()
        : null,
      topPermitted: (topPermitted?.domains || []).slice(0, 5).map(d => ({ domain: d.domain, count: d.count })),
      topBlocked: (topBlocked?.domains || []).slice(0, 5).map(d => ({ domain: d.domain, count: d.count })),
      queryTypes: summary.queries?.types || null,
      updatedAt: Date.now()
    };
  }

  // --- Pi-hole v5 (legacy) ---

  async _fetchV5Stats() {
    const authParam = this.apiKey ? `&auth=${this.apiKey}` : '';

    const [summary, topItems, queryTypes] = await Promise.all([
      this._fetch(`${this.baseUrl}/admin/api.php?summaryRaw${authParam}`),
      this._fetch(`${this.baseUrl}/admin/api.php?topItems=5${authParam}`).catch(() => null),
      this._fetch(`${this.baseUrl}/admin/api.php?getQueryTypes${authParam}`).catch(() => null)
    ]);

    if (summary.status === undefined && !summary.domains_being_blocked) {
      throw new Error('Invalid Pi-hole v5 response — check URL');
    }

    this.data = {
      type: 'pihole',
      version: 5,
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

  // --- AdGuard Home ---

  _adguardAuthHeader() {
    if (this.username && this.password) {
      return { Authorization: 'Basic ' + btoa(`${this.username}:${this.password}`) };
    }
    return {};
  }

  async fetchAdGuardStats() {
    const headers = this._adguardAuthHeader();

    const [status, stats] = await Promise.all([
      this._fetch(`${this.baseUrl}/control/status`, { headers }),
      this._fetch(`${this.baseUrl}/control/stats`, { headers })
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

  // --- Polling / reconnect ---

  async attemptReconnect() {
    if (this._reconnecting || !this.baseUrl) return;
    this._reconnecting = true;

    try {
      console.log('[DNS] Attempting reconnect...');
      if (this.type === 'adguard') {
        await this.fetchAdGuardStats();
      } else {
        await this._detectAndFetch();
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
      } else if (this.piholeVersion === 6) {
        await this._fetchV6Stats();
      } else if (this.piholeVersion === 5) {
        await this._fetchV5Stats();
      } else {
        await this._detectAndFetch();
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
    this.sid = null;
    this.piholeVersion = null;
    this.subscribers.clear();
  }

  isConnected() {
    return this.connected;
  }
}

export const pihole = new PiholeService();
export default pihole;
