import { proxyFetch } from './proxy';

class ProxmoxService {
  constructor() {
    this.baseUrl = null;
    this.tokenId = null;
    this.tokenSecret = null;
    this.connected = false;
    this.nodes = [];
    this.guests = []; // VMs + CTs combined
    this.subscribers = new Set();
    this.pollInterval = null;
    this._visibilityHandler = null;
    this._reconnecting = false;
  }

  async connect(config) {
    this.stopPolling();

    let url = (config.url || '').trim().replace(/\/+$/, '');
    // Proxmox always uses HTTPS — force it even if user typed http://
    url = url.replace(/^http:\/\//i, 'https://');
    if (!url.startsWith('https://')) {
      url = 'https://' + url;
    }

    this.baseUrl = url;
    this.tokenId = config.tokenId || '';
    this.tokenSecret = config.tokenSecret || '';

    try {
      await this.fetchAll();
      this.connected = true;
      this.notifySubscribers();
      this.startPolling();
      return { success: true };
    } catch (error) {
      this.connected = false;
      console.error('[Proxmox] Connection failed:', error.message);
      throw error;
    }
  }

  async _fetch(path) {
    const url = `${this.baseUrl}/api2/json${path}`;
    const headers = JSON.stringify({
      Authorization: `PVEAPIToken=${this.tokenId}=${this.tokenSecret}`
    });
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}&headers=${encodeURIComponent(headers)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      console.log(`[Proxmox] Fetching: ${path}`);
      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed — check API token ID and secret');
        }
        if (response.status === 595 || response.status === 596) {
          throw new Error('Could not reach Proxmox — check URL and ensure the host is accessible from the dashboard server');
        }
        // Try to read error body
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}${errorText ? ': ' + errorText.slice(0, 100) : ''}`);
      }

      const text = await response.text();

      // Proxmox sometimes returns HTML login page instead of JSON
      if (text.startsWith('<!') || text.startsWith('<html')) {
        throw new Error('Received HTML instead of JSON — check URL (should end with port 8006)');
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid JSON response from Proxmox');
      }

      return json.data;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  async fetchAll() {
    if (!this.connected && this.nodes.length > 0) {
      await this.attemptReconnect();
      if (!this.connected) return;
    }

    try {
      // Fetch nodes first
      const nodesData = await this._fetch('/nodes');

      if (!Array.isArray(nodesData)) {
        throw new Error('Invalid Proxmox response — check URL');
      }

      this.nodes = nodesData.map(n => ({
        node: n.node,
        status: n.status || (n.uptime > 0 ? 'online' : 'offline'),
        uptime: n.uptime || 0,
        cpu: n.cpu || 0,
        maxcpu: n.maxcpu || 0,
        mem: n.mem || 0,
        maxmem: n.maxmem || 0,
        disk: n.disk || 0,
        maxdisk: n.maxdisk || 0
      }));

      // Fetch VMs and CTs for each online node
      const guestPromises = this.nodes
        .filter(n => n.status === 'online')
        .flatMap(n => [
          this._fetch(`/nodes/${n.node}/qemu`).then(vms =>
            (vms || []).map(vm => ({ ...vm, guestType: 'qemu', node: n.node }))
          ).catch(() => []),
          this._fetch(`/nodes/${n.node}/lxc`).then(cts =>
            (cts || []).map(ct => ({ ...ct, guestType: 'lxc', node: n.node }))
          ).catch(() => [])
        ]);

      const guestArrays = await Promise.all(guestPromises);
      const allGuests = guestArrays.flat();

      this.guests = allGuests.map(g => ({
        vmid: g.vmid,
        name: g.name || `VM ${g.vmid}`,
        node: g.node,
        type: g.guestType, // 'qemu' or 'lxc'
        status: g.status || 'unknown',
        uptime: g.uptime || 0,
        cpu: g.cpu || 0,
        cpus: g.cpus || g.maxcpu || 1,
        mem: g.mem || 0,
        maxmem: g.maxmem || 0,
        disk: g.disk || 0,
        maxdisk: g.maxdisk || 0,
        netin: g.netin || 0,
        netout: g.netout || 0,
        tags: g.tags || ''
      })).sort((a, b) => a.vmid - b.vmid);

      this.connected = true;
      this.notifySubscribers();
    } catch (error) {
      console.error('[Proxmox] Fetch failed:', error.message);
      if (error.message.includes('Failed to fetch') || error.name === 'AbortError') {
        this.connected = false;
      }
      throw error;
    }
  }

  async attemptReconnect() {
    if (this._reconnecting || !this.baseUrl) return;
    this._reconnecting = true;

    try {
      console.log('[Proxmox] Attempting reconnect...');
      const nodesData = await this._fetch('/nodes');
      if (Array.isArray(nodesData)) {
        this.connected = true;
        console.log('[Proxmox] Reconnected successfully');
      }
    } catch (error) {
      console.log('[Proxmox] Reconnect failed:', error.message);
    } finally {
      this._reconnecting = false;
    }
  }

  startPolling(interval = 15000) {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      this.fetchAll().catch(() => {});
    }, interval);

    this._visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Proxmox] Tab visible — refreshing data');
        this.fetchAll().catch(() => {});
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
    if (this.nodes.length > 0 || this.guests.length > 0) {
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
      nodes: this.nodes,
      guests: this.guests
    };
  }

  disconnect() {
    this.stopPolling();
    this.connected = false;
    this.nodes = [];
    this.guests = [];
    this.subscribers.clear();
  }

  isConnected() {
    return this.connected;
  }
}

export const proxmox = new ProxmoxService();
export default proxmox;
