// UniFi Network Controller Service
// Supports both self-hosted controller and UDM/UniFi OS
// Supports both username/password (cookie) and API key authentication

class UniFiService {
  constructor() {
    this.baseUrl = null;
    this.controllerType = null; // 'self-hosted' or 'udm'
    this.authMethod = null;     // 'credentials' or 'apikey'
    this.site = 'default';

    // Auth state
    this.apiKey = null;
    this.username = null;
    this.password = null;
    this.sessionCookie = null;

    // Connection state
    this.connected = false;
    this.subscribers = new Set();
    this.pollInterval = null;
    this._retrying = false;

    // Data
    this.devices = [];
    this.clients = [];
    this.health = null;
  }

  async connect(config) {
    this.stopPolling();

    this.baseUrl = (config.url || '').trim().replace(/\/+$/, '');
    this.controllerType = config.controllerType || 'udm';
    this.authMethod = config.authMethod || 'credentials';
    this.site = config.site || 'default';

    if (this.authMethod === 'apikey') {
      this.apiKey = config.apiKey;
    } else {
      this.username = config.username;
      this.password = config.password;
      await this._login();
    }

    // Verify connection by fetching health
    await this.fetchHealth();
    this.connected = true;

    // Fetch all data
    await this.fetchAll();
    this.startPolling();

    return { success: true };
  }

  async _login() {
    const loginPath = this.controllerType === 'udm'
      ? '/api/auth/login'
      : '/api/login';

    const loginUrl = `${this.baseUrl}${loginPath}`;

    console.log('[UniFi] Logging in to:', loginUrl);

    const response = await fetch(
      `/api/proxy?url=${encodeURIComponent(loginUrl)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.username,
          password: this.password
        })
      }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid username or password');
      }
      throw new Error(`Login failed: HTTP ${response.status}`);
    }

    // Capture cookie from proxy's X-Scrypted-Cookie header
    const setCookie = response.headers.get('x-scrypted-cookie');
    if (setCookie) {
      // Extract name=value pairs, strip Path, Secure, HttpOnly etc.
      this.sessionCookie = setCookie.split(';')[0];
      console.log('[UniFi] Session cookie obtained');
    } else {
      console.warn('[UniFi] No cookie received from login response');
    }
  }

  _apiUrl(path) {
    // UDM/UniFi OS requires /proxy/network prefix for all network API calls
    const prefix = this.controllerType === 'udm' ? '/proxy/network' : '';
    // Ensure path doesn't start with / to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${this.baseUrl}${prefix}/${cleanPath}`;
  }

  async _fetch(path) {
    const url = this._apiUrl(path);
    let proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;

    if (this.authMethod === 'apikey') {
      const headers = JSON.stringify({ 'X-API-KEY': this.apiKey });
      proxyUrl += `&headers=${encodeURIComponent(headers)}`;
    } else if (this.sessionCookie) {
      proxyUrl += `&cookie=${encodeURIComponent(this.sessionCookie)}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        // Session expired — try re-login once
        if (response.status === 401 && this.authMethod === 'credentials' && !this._retrying) {
          this._retrying = true;
          console.log('[UniFi] Session expired, re-authenticating...');
          try {
            await this._login();
            const result = await this._fetch(path);
            this._retrying = false;
            return result;
          } catch (e) {
            this._retrying = false;
            throw e;
          }
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // UniFi API returns { meta: { rc: 'ok' }, data: [...] }
      if (data.meta?.rc === 'error') {
        throw new Error(`UniFi API error: ${data.meta?.msg || 'unknown'}`);
      }

      return data.data || data;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  async _post(path, body = {}) {
    const url = this._apiUrl(path);
    let proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;

    if (this.authMethod === 'apikey') {
      const headers = JSON.stringify({ 'X-API-KEY': this.apiKey });
      proxyUrl += `&headers=${encodeURIComponent(headers)}`;
    } else if (this.sessionCookie) {
      proxyUrl += `&cookie=${encodeURIComponent(this.sessionCookie)}`;
    }

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      if (response.status === 401 && this.authMethod === 'credentials' && !this._retrying) {
        this._retrying = true;
        try {
          await this._login();
          const result = await this._post(path, body);
          this._retrying = false;
          return result;
        } catch (e) {
          this._retrying = false;
          throw e;
        }
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.meta?.rc === 'error') {
      throw new Error(`UniFi API error: ${data.meta?.msg || 'unknown'}`);
    }
    return data.data || data;
  }

  async runSpeedTest() {
    if (!this.connected) throw new Error('Not connected');
    console.log('[UniFi] Triggering speed test...');
    await this._post(`api/s/${this.site}/cmd/devmgr`, { cmd: 'speedtest' });
    return { started: true };
  }

  async getSpeedTestStatus() {
    if (!this.connected) return null;
    try {
      const data = await this._post(`api/s/${this.site}/cmd/devmgr`, { cmd: 'speedtest-status' });
      return data;
    } catch (err) {
      console.error('[UniFi] getSpeedTestStatus error:', err);
      return null;
    }
  }

  async getSpeedTestResults() {
    if (!this.connected) return null;
    try {
      // Try the dedicated speed test archive endpoint first
      const now = Date.now();
      const dayAgo = now - 86400000;
      const data = await this._fetch(`api/s/${this.site}/stat/report/archive.speedtest?start=${dayAgo}&end=${now}`);
      if (data && data.length > 0) {
        // Get most recent result
        const latest = data.sort((a, b) => (b.time || 0) - (a.time || 0))[0];
        return {
          download: latest.xput_download,
          upload: latest.xput_upload,
          ping: latest.latency,
          lastRun: latest.time
        };
      }
    } catch (err) {
      console.log('[UniFi] archive.speedtest not available, trying health endpoint');
    }

    // Fallback: check health endpoint fields
    try {
      const data = await this._fetch(`api/s/${this.site}/stat/health`);
      const wan = (data || []).find(s => s.subsystem === 'wan');
      if (wan && (wan.xput_down || wan.xput_download)) {
        return {
          download: wan.xput_download || wan.xput_down,
          upload: wan.xput_upload || wan.xput_up,
          ping: wan.latency || wan.speedtest_ping,
          lastRun: wan.speedtest_lastrun
        };
      }
    } catch (err) {
      console.error('[UniFi] getSpeedTestResults fallback error:', err);
    }
    return null;
  }

  async fetchAll() {
    try {
      await Promise.all([
        this.fetchDevices(),
        this.fetchClients(),
        this.fetchHealth()
      ]);
      this.notifySubscribers();
    } catch (err) {
      console.error('[UniFi] fetchAll error:', err);
    }
  }

  async fetchDevices() {
    try {
      const data = await this._fetch(`api/s/${this.site}/stat/device`);
      this.devices = (data || []).map(d => ({
        mac: d.mac,
        name: d.name || d.hostname || d.mac,
        model: d.model,
        modelName: d.model_in_lts || d.model_in_eol || '',
        type: d.type, // 'uap' (AP), 'usw' (switch), 'ugw'/'udm' (gateway)
        status: d.state === 1 ? 'online' : 'offline',
        uptime: d.uptime || 0,
        clients: d['num_sta'] || 0,
        userClients: d['user-num_sta'] || 0,
        guestClients: d['guest-num_sta'] || 0,
        cpu: d['system-stats']?.cpu ? parseFloat(d['system-stats'].cpu) : null,
        mem: d['system-stats']?.mem ? parseFloat(d['system-stats'].mem) : null,
        ip: d.ip,
        version: d.version,
        satisfaction: d.satisfaction,
        txRate: d['tx_bytes-r'] || 0,
        rxRate: d['rx_bytes-r'] || 0
      }));
    } catch (err) {
      console.error('[UniFi] fetchDevices error:', err);
    }
  }

  async fetchClients() {
    try {
      const data = await this._fetch(`api/s/${this.site}/stat/sta`);
      this.clients = (data || []).map(c => ({
        mac: c.mac,
        name: c.name || c.hostname || c.oui || c.mac,
        ip: c.ip,
        isWired: !!c.is_wired,
        isGuest: !!c.is_guest,
        signal: c.rssi || c.signal,
        satisfaction: c.satisfaction,
        txRate: c['tx_bytes-r'] || 0,
        rxRate: c['rx_bytes-r'] || 0,
        txBytes: c.tx_bytes || 0,
        rxBytes: c.rx_bytes || 0,
        uptime: c.uptime || 0,
        network: c.network || c.essid || '',
        apMac: c.ap_mac,
        channel: c.channel,
        radio: c.radio,
        oui: c.oui || ''
      }));
    } catch (err) {
      console.error('[UniFi] fetchClients error:', err);
    }
  }

  async fetchHealth() {
    try {
      const data = await this._fetch(`api/s/${this.site}/stat/health`);
      this.health = {};

      (data || []).forEach(sub => {
        if (sub.subsystem === 'wan') {
          this.health.wan = {
            status: sub.status,
            wanIp: sub.wan_ip,
            isp: sub.isp_name,
            ispOrg: sub.isp_organization,
            gatewayName: sub.gw_name,
            gatewayMac: sub.gw_mac,
            gatewayVersion: sub.gw_version,
            uptime: sub['gw_system-stats']?.uptime ? parseInt(sub['gw_system-stats'].uptime) : null,
            cpu: sub['gw_system-stats']?.cpu ? parseFloat(sub['gw_system-stats'].cpu) : null,
            mem: sub['gw_system-stats']?.mem ? parseFloat(sub['gw_system-stats'].mem) : null,
            txRate: sub['tx_bytes-r'] || 0,
            rxRate: sub['rx_bytes-r'] || 0,
            latency: sub.latency,
            speedtestPing: sub.speedtest_ping || sub.latency,
            speedtestDown: sub.xput_download || sub.xput_down,
            speedtestUp: sub.xput_upload || sub.xput_up,
            numSta: sub.num_sta || 0
          };
        } else if (sub.subsystem === 'wlan') {
          this.health.wlan = {
            status: sub.status,
            numAp: sub.num_ap || 0,
            numClients: sub.num_user || 0,
            numGuests: sub.num_guest || 0,
            numAdopted: sub.num_adopted || 0,
            numDisconnected: sub.num_disconnected || 0,
            txRate: sub['tx_bytes-r'] || 0,
            rxRate: sub['rx_bytes-r'] || 0
          };
        } else if (sub.subsystem === 'lan') {
          this.health.lan = {
            status: sub.status,
            numSw: sub.num_sw || 0,
            numClients: sub.num_user || 0,
            numGuests: sub.num_guest || 0,
            numAdopted: sub.num_adopted || 0,
            txRate: sub['tx_bytes-r'] || 0,
            rxRate: sub['rx_bytes-r'] || 0
          };
        } else if (sub.subsystem === 'www') {
          this.health.www = {
            status: sub.status
          };
        }
      });
    } catch (err) {
      console.error('[UniFi] fetchHealth error:', err);
    }
  }

  startPolling(interval = 30000) {
    this.stopPolling();
    this.pollInterval = setInterval(() => this.fetchAll(), interval);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    // Immediately call with current data if available
    if (this.devices.length || this.clients.length || this.health) {
      callback(this.getData());
    }
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    const data = this.getData();
    this.subscribers.forEach(cb => cb(data));
  }

  getData() {
    return {
      devices: this.devices,
      clients: this.clients,
      health: this.health
    };
  }

  disconnect() {
    this.stopPolling();
    this.connected = false;
    this.sessionCookie = null;
    this.devices = [];
    this.clients = [];
    this.health = null;
    this.subscribers.clear();
  }

  isConnected() {
    return this.connected;
  }
}

export const unifi = new UniFiService();
export default unifi;
