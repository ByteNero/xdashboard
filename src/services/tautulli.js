// Tautulli API Service for Plex monitoring
import { proxyFetch, getProxiedUrl } from './proxy';

class TautulliService {
  constructor() {
    this.baseUrl = null;
    this.apiKey = null;
    this.connected = false;
    this.activity = null;
    this.recentlyAdded = [];
    this.history = [];
    this.stats = null;
    this.subscribers = new Set();
    this.pollInterval = null;
  }

  async connect(url, apiKey) {
    // Stop any existing polling first
    this.stopPolling();

    // Normalize URL - add http:// if missing
    let normalizedUrl = url.trim().replace(/\/$/, '');
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'http://' + normalizedUrl;
    }

    this.baseUrl = normalizedUrl;
    this.apiKey = apiKey;

    try {
      // Test connection with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      console.log('[Tautulli] Connecting to:', this.baseUrl);

      const testUrl = `${this.baseUrl}/api/v2?apikey=${this.apiKey}&cmd=arnold`;
      const response = await proxyFetch(testUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      // Arnold command returns result: 'success' with message: null
      if (data?.response?.result === 'success') {
        this.connected = true;
        console.log('[Tautulli] Connected successfully:', data.response.data);
        await this.fetchAll();
        this.startPolling();
        return { success: true };
      }
      throw new Error('Invalid response from Tautulli');
    } catch (error) {
      this.connected = false;
      console.error('[Tautulli] Connection failed:', error.message);

      if (error.name === 'AbortError') {
        throw new Error('Connection timeout - check URL and network');
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Connection failed - check URL and ensure Tautulli is running');
      }
      throw error;
    }
  }

  async apiCall(cmd, params = {}) {
    if (!this.connected || !this.baseUrl || !this.apiKey) return null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const url = new URL(`${this.baseUrl}/api/v2`);
      url.searchParams.set('apikey', this.apiKey);
      url.searchParams.set('cmd', cmd);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      const response = await proxyFetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error(`[Tautulli] API call ${cmd} failed:`, error.message);
      if (error.name === 'AbortError' || error.message.includes('Failed to fetch')) {
        console.log('[Tautulli] Connection appears lost');
        this.connected = false;
      }
      return null;
    }
  }

  buildImageUrl(thumb) {
    if (!thumb) return null;
    const url = `${this.baseUrl}/pms_image_proxy?img=${encodeURIComponent(thumb)}&width=300&height=450&fallback=poster&apikey=${this.apiKey}`;
    return getProxiedUrl(url);
  }

  async fetchAll() {
    await Promise.all([
      this.fetchActivity(),
      this.fetchRecentlyAdded(),
      this.fetchHistory(),
      this.fetchStats()
    ]);
    this.notifySubscribers();
  }

  async fetchActivity() {
    try {
      const data = await this.apiCall('get_activity');
      if (data?.response?.data) {
        this.activity = {
          streamCount: data.response.data.stream_count || 0,
          streams: (data.response.data.sessions || []).map(s => ({
            user: s.friendly_name || s.user,
            title: s.title,
            fullTitle: s.full_title,
            mediaType: s.media_type,
            type: s.media_type,
            state: s.state,
            progress: s.progress_percent,
            quality: s.quality_profile,
            player: s.player,
            platform: s.platform,
            product: s.product,
            // For TV shows: use show poster (grandparent_thumb)
            thumb: this.buildImageUrl(s.grandparent_thumb || s.parent_thumb || s.thumb),
            grandparentTitle: s.grandparent_title,
            parentTitle: s.parent_title,
            // Episode info
            parentMediaIndex: s.parent_media_index, // Season number
            mediaIndex: s.media_index, // Episode number
            year: s.year,
            transcodeDecision: s.transcode_decision,
            bandwidth: s.bandwidth,
            location: s.location
          }))
        };
      }
    } catch (error) {
      console.error('[Tautulli] Failed to fetch activity:', error);
    }
  }

  async fetchRecentlyAdded() {
    try {
      const data = await this.apiCall('get_recently_added', { count: 20 });
      if (data?.response?.data?.recently_added) {
        this.recentlyAdded = data.response.data.recently_added.map(item => ({
          title: item.title,
          year: item.year,
          type: item.media_type,
          addedAt: item.added_at * 1000,
          // For episodes: use show poster. For movies: use movie poster
          thumb: this.buildImageUrl(item.grandparent_thumb || item.parent_thumb || item.thumb),
          // Keep episode thumb separately for display
          episodeThumb: item.media_type === 'episode' ? this.buildImageUrl(item.thumb) : null,
          grandparentTitle: item.grandparent_title,
          parentTitle: item.parent_title,
          // Episode info
          seasonNum: item.parent_media_index,
          episodeNum: item.media_index
        }));
      }
    } catch (error) {
      console.error('[Tautulli] Failed to fetch recently added:', error);
    }
  }

  async fetchHistory() {
    try {
      const data = await this.apiCall('get_history', { length: 10 });
      if (data?.response?.data?.data) {
        this.history = data.response.data.data.map(item => ({
          user: item.friendly_name || item.user,
          title: item.full_title || item.title,
          type: item.media_type,
          watchedAt: item.stopped * 1000,
          duration: item.play_duration,
          percentComplete: item.percent_complete
        }));
      }
    } catch (error) {
      console.error('[Tautulli] Failed to fetch history:', error);
    }
  }

  async fetchStats() {
    try {
      // Fetch library stats and home stats in parallel
      const [librariesData, homeStatsData, serverInfoData] = await Promise.all([
        this.apiCall('get_libraries'),
        this.apiCall('get_home_stats', { time_range: 30, stats_count: 5 }),
        this.apiCall('get_server_info')
      ]);

      const libraries = librariesData?.response?.data || [];
      const homeStats = homeStatsData?.response?.data || [];
      const serverInfo = serverInfoData?.response?.data || {};

      // Calculate totals from libraries
      let totalMovies = 0;
      let totalShows = 0;
      let totalEpisodes = 0;
      let totalMusic = 0;
      let totalAlbums = 0;

      libraries.forEach(lib => {
        if (lib.section_type === 'movie') {
          totalMovies += parseInt(lib.count) || 0;
        } else if (lib.section_type === 'show') {
          totalShows += parseInt(lib.count) || 0;
          totalEpisodes += parseInt(lib.child_count) || 0;
        } else if (lib.section_type === 'artist') {
          totalMusic += parseInt(lib.count) || 0;
          totalAlbums += parseInt(lib.child_count) || 0;
        }
      });

      // Extract useful home stats
      const topUsers = homeStats.find(s => s.stat_id === 'top_users')?.rows || [];
      const mostWatched = homeStats.find(s => s.stat_id === 'popular_movies' || s.stat_id === 'popular_tv')?.rows || [];
      const recentlyWatched = homeStats.find(s => s.stat_id === 'last_watched')?.rows || [];

      this.stats = {
        libraries: libraries.map(lib => ({
          name: lib.section_name,
          type: lib.section_type,
          count: parseInt(lib.count) || 0,
          childCount: parseInt(lib.child_count) || 0
        })),
        totals: {
          movies: totalMovies,
          shows: totalShows,
          episodes: totalEpisodes,
          music: totalMusic,
          albums: totalAlbums
        },
        topUsers: topUsers.slice(0, 5).map(u => ({
          user: u.friendly_name || u.user,
          plays: u.total_plays,
          duration: u.total_duration
        })),
        serverInfo: {
          version: serverInfo.pms_version,
          platform: serverInfo.pms_platform,
          name: serverInfo.pms_name
        }
      };
    } catch (error) {
      console.error('[Tautulli] Failed to fetch stats:', error);
    }
  }

  startPolling(interval = 10000) {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      this.fetchAll();
    }, interval);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.getData());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  notifySubscribers() {
    const data = this.getData();
    this.subscribers.forEach(callback => callback(data));
  }

  getData() {
    return {
      activity: this.activity,
      recentlyAdded: this.recentlyAdded,
      history: this.history,
      stats: this.stats
    };
  }

  disconnect() {
    this.stopPolling();
    this.connected = false;
    this.activity = null;
    this.recentlyAdded = [];
    this.history = [];
    this.stats = null;
    this.subscribers.clear();
  }

  isConnected() {
    return this.connected;
  }

  // Helper to format duration in seconds to human readable
  formatDuration(seconds) {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

export const tautulli = new TautulliService();
export default tautulli;
