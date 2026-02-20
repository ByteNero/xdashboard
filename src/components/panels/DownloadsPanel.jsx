import { useState, useEffect, useCallback } from 'react';
import { Download, ArrowDown, ArrowUp, Pause, Play, Clock, HardDrive, Loader2, Check, AlertCircle } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';
import { getLabel } from '../../utils/translations';

// Format bytes to human readable
const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

// Format speed
const formatSpeed = (bytesPerSec) => {
  if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
  return formatBytes(bytesPerSec) + '/s';
};

// Format ETA
const formatETA = (seconds) => {
  if (!seconds || seconds <= 0 || seconds === 8640000) return '∞';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d`;
};

// Progress bar component
const ProgressBar = ({ progress, status }) => {
  const getColor = () => {
    if (status === 'completed' || status === 'seeding') return 'var(--success)';
    if (status === 'paused' || status === 'stopped') return 'var(--text-muted)';
    if (status === 'error') return 'var(--danger)';
    return 'var(--accent-primary)';
  };

  return (
    <div style={{
      width: '100%',
      height: '4px',
      background: 'var(--bg-secondary)',
      borderRadius: '2px',
      overflow: 'hidden'
    }}>
      <div style={{
        width: `${Math.min(100, progress)}%`,
        height: '100%',
        background: getColor(),
        transition: 'width 0.3s ease'
      }} />
    </div>
  );
};

// Status badge
const StatusBadge = ({ status }) => {
  const styles = {
    downloading: { bg: 'var(--accent-primary)', text: '#000', icon: ArrowDown },
    seeding: { bg: 'var(--success)', text: '#000', icon: ArrowUp },
    paused: { bg: 'var(--text-muted)', text: '#fff', icon: Pause },
    stopped: { bg: 'var(--text-muted)', text: '#fff', icon: Pause },
    completed: { bg: 'var(--success)', text: '#000', icon: Check },
    queued: { bg: 'var(--warning)', text: '#000', icon: Clock },
    error: { bg: 'var(--danger)', text: '#fff', icon: AlertCircle },
    stalled: { bg: 'var(--warning)', text: '#000', icon: AlertCircle },
    checking: { bg: 'var(--accent-secondary)', text: '#000', icon: Loader2 },
  };

  const style = styles[status?.toLowerCase()] || styles.queued;
  const Icon = style.icon;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      fontSize: '8px',
      fontWeight: '600',
      textTransform: 'uppercase',
      padding: '2px 5px',
      borderRadius: '3px',
      background: style.bg,
      color: style.text
    }}>
      <Icon size={8} />
      {status}
    </span>
  );
};

// Download item card
const DownloadCard = ({ item }) => {
  return (
    <div style={{
      padding: '10px',
      background: 'var(--bg-card)',
      borderRadius: '8px',
      borderLeft: `3px solid ${item.progress >= 100 ? 'var(--success)' : 'var(--accent-primary)'}`
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '6px'
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginRight: '8px'
        }}>
          {item.name}
        </div>
        <StatusBadge status={item.status} />
      </div>

      <ProgressBar progress={item.progress} status={item.status} />

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '6px',
        fontSize: '9px',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{item.progress.toFixed(1)}%</span>
          <span>{formatBytes(item.downloaded)} / {formatBytes(item.size)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {item.downloadSpeed > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--success)' }}>
              <ArrowDown size={9} />
              {formatSpeed(item.downloadSpeed)}
            </span>
          )}
          {item.uploadSpeed > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--accent-primary)' }}>
              <ArrowUp size={9} />
              {formatSpeed(item.uploadSpeed)}
            </span>
          )}
          {item.eta > 0 && item.status === 'downloading' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Clock size={9} />
              {formatETA(item.eta)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Stats summary component
const StatsSummary = ({ stats }) => {
  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '8px 12px',
      background: 'var(--bg-card)',
      borderRadius: '6px',
      marginBottom: '10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <ArrowDown size={12} style={{ color: 'var(--success)' }} />
        <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)' }}>
          {formatSpeed(stats.downloadSpeed)}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <ArrowUp size={12} style={{ color: 'var(--accent-primary)' }} />
        <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)' }}>
          {formatSpeed(stats.uploadSpeed)}
        </span>
      </div>
      {stats.activeCount !== undefined && (
        <div style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>
          {stats.activeCount} active / {stats.totalCount} total
        </div>
      )}
    </div>
  );
};

const CLIENTS = [
  { id: 'qbittorrent', label: 'qBittorrent' },
  { id: 'deluge', label: 'Deluge' },
  { id: 'sabnzbd', label: 'SABnzbd' },
  { id: 'transmission', label: 'Transmission' },
];

export default function DownloadsPanel({ config }) {
  const [data, setData] = useState({});
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [activeClient, setActiveClient] = useState(null);
  const { integrations, settings } = useDashboardStore();
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  const downloadClients = integrations.downloadClients || {};

  // Get configured clients
  const configuredClients = CLIENTS.filter(c => {
    const cfg = downloadClients[c.id];
    return cfg?.enabled && cfg?.url;
  });

  // Set first available client as active
  useEffect(() => {
    if (configuredClients.length > 0 && !configuredClients.find(c => c.id === activeClient)) {
      setActiveClient(configuredClients[0].id);
    }
  }, [configuredClients, activeClient]);

  // Fetch data for a client
  const fetchClient = useCallback(async (clientId) => {
    const cfg = downloadClients[clientId];
    if (!cfg?.enabled || !cfg?.url) return;

    setLoading(prev => ({ ...prev, [clientId]: true }));
    setErrors(prev => ({ ...prev, [clientId]: null }));

    try {
      const baseUrl = cfg.url.replace(/\/$/, '');
      let downloads = [];
      let clientStats = { downloadSpeed: 0, uploadSpeed: 0, activeCount: 0, totalCount: 0 };

      if (clientId === 'qbittorrent') {
        // qBittorrent API
        const apiUrl = `${baseUrl}/api/v2`;

        // Use proxy in dev mode
        const fetchUrl = (endpoint) => import.meta.env.DEV
          ? `/api/proxy?url=${encodeURIComponent(`${apiUrl}${endpoint}`)}`
          : `${apiUrl}${endpoint}`;

        // Get torrents
        const torrentsRes = await fetch(fetchUrl('/torrents/info'), {
          credentials: 'include'
        });
        if (!torrentsRes.ok) throw new Error(`HTTP ${torrentsRes.status}`);
        const torrents = await torrentsRes.json();

        // Get transfer info
        const transferRes = await fetch(fetchUrl('/transfer/info'), {
          credentials: 'include'
        });
        const transfer = transferRes.ok ? await transferRes.json() : {};

        downloads = torrents.map(t => ({
          id: t.hash,
          name: t.name,
          progress: t.progress * 100,
          size: t.size,
          downloaded: t.completed,
          downloadSpeed: t.dlspeed,
          uploadSpeed: t.upspeed,
          eta: t.eta,
          status: mapQbitStatus(t.state),
          ratio: t.ratio
        }));

        clientStats = {
          downloadSpeed: transfer.dl_info_speed || 0,
          uploadSpeed: transfer.up_info_speed || 0,
          activeCount: torrents.filter(t => ['downloading', 'uploading', 'stalledDL', 'stalledUP'].includes(t.state)).length,
          totalCount: torrents.length
        };

      } else if (clientId === 'deluge') {
        // Deluge Web API (JSON-RPC)
        const fetchUrl = import.meta.env.DEV
          ? `/api/proxy?url=${encodeURIComponent(`${baseUrl}/json`)}`
          : `${baseUrl}/json`;

        // Helper for Deluge requests with timeout
        const delugeRequest = async (method, params, id) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

          try {
            const res = await fetch(fetchUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ method, params, id }),
              credentials: 'include',
              signal: controller.signal
            });
            clearTimeout(timeout);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
          } catch (err) {
            clearTimeout(timeout);
            if (err.name === 'AbortError') {
              throw new Error('Connection timeout - is Deluge Web UI running?');
            }
            throw err;
          }
        };

        // First, authenticate if password is set
        if (cfg.password) {
          try {
            const authResult = await delugeRequest('auth.login', [cfg.password], 1);
            if (authResult.error) {
              console.warn('[Downloads] Deluge auth error:', authResult.error);
            } else if (authResult.result !== true) {
              throw new Error('Authentication failed - check password');
            }
          } catch (authErr) {
            // If auth completely fails, throw immediately
            throw new Error(`Deluge auth failed: ${authErr.message}`);
          }
        }

        // Check if connected to a daemon
        const connectedRes = await delugeRequest('web.connected', [], 2);
        if (!connectedRes.result) {
          // Try to get hosts and connect to first one
          const hostsRes = await delugeRequest('web.get_hosts', [], 3);
          if (hostsRes.result && hostsRes.result.length > 0) {
            const hostId = hostsRes.result[0][0];
            await delugeRequest('web.connect', [hostId], 4);
          } else {
            throw new Error('Not connected to daemon - check Deluge Web UI');
          }
        }

        // Get torrents
        const result = await delugeRequest(
          'web.update_ui',
          [['name', 'progress', 'total_size', 'total_done', 'download_payload_rate', 'upload_payload_rate', 'eta', 'state', 'ratio'], {}],
          5
        );

        if (result.error) throw new Error(result.error.message || 'Deluge API error');

        // Check if result is valid
        if (!result.result) {
          throw new Error('No data returned - check daemon connection');
        }

        const torrents = result.result?.torrents || {};
        const delugeStats = result.result?.stats || {};

        downloads = Object.entries(torrents).map(([hash, t]) => ({
          id: hash,
          name: t.name,
          progress: t.progress,
          size: t.total_size,
          downloaded: t.total_done,
          downloadSpeed: t.download_payload_rate,
          uploadSpeed: t.upload_payload_rate,
          eta: t.eta,
          status: mapDelugeStatus(t.state),
          ratio: t.ratio
        }));

        clientStats = {
          downloadSpeed: delugeStats.download_rate || 0,
          uploadSpeed: delugeStats.upload_rate || 0,
          activeCount: downloads.filter(d => d.status === 'downloading' || d.status === 'seeding').length,
          totalCount: downloads.length
        };

      } else if (clientId === 'sabnzbd') {
        // SABnzbd API
        const apiKey = cfg.apiKey || '';
        const apiUrl = `${baseUrl}/api?output=json&apikey=${apiKey}`;

        const fetchUrl = (mode) => import.meta.env.DEV
          ? `/api/proxy?url=${encodeURIComponent(`${apiUrl}&mode=${mode}`)}`
          : `${apiUrl}&mode=${mode}`;

        // Get queue
        const queueRes = await fetch(fetchUrl('queue'));
        if (!queueRes.ok) throw new Error(`HTTP ${queueRes.status}`);
        const queueData = await queueRes.json();

        // Get history
        const historyRes = await fetch(fetchUrl('history') + '&limit=5');
        const historyData = historyRes.ok ? await historyRes.json() : { history: { slots: [] } };

        const queue = queueData.queue || {};
        const slots = queue.slots || [];
        const history = historyData.history?.slots || [];

        downloads = [
          ...slots.map(s => ({
            id: s.nzo_id,
            name: s.filename,
            progress: parseFloat(s.percentage) || 0,
            size: parseFloat(s.mb) * 1024 * 1024,
            downloaded: parseFloat(s.mb) * 1024 * 1024 * (parseFloat(s.percentage) / 100),
            downloadSpeed: 0, // Individual speeds not available
            uploadSpeed: 0,
            eta: parseTimeToSeconds(s.timeleft),
            status: mapSabStatus(s.status)
          })),
          ...history.slice(0, 3).map(h => ({
            id: h.nzo_id,
            name: h.name,
            progress: 100,
            size: parseFloat(h.bytes) || 0,
            downloaded: parseFloat(h.bytes) || 0,
            downloadSpeed: 0,
            uploadSpeed: 0,
            eta: 0,
            status: h.status === 'Completed' ? 'completed' : 'error'
          }))
        ];

        clientStats = {
          downloadSpeed: parseFloat(queue.kbpersec || 0) * 1024,
          uploadSpeed: 0,
          activeCount: slots.filter(s => s.status === 'Downloading').length,
          totalCount: slots.length
        };

      } else if (clientId === 'transmission') {
        // Transmission RPC API
        const rpcUrl = `${baseUrl}/transmission/rpc`;
        const fetchUrl = import.meta.env.DEV
          ? `/api/proxy?url=${encodeURIComponent(rpcUrl)}`
          : rpcUrl;

        // Get session-id first (Transmission requires it)
        let sessionId = '';
        try {
          const initRes = await fetch(fetchUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: 'session-get' })
          });
          sessionId = initRes.headers.get('X-Transmission-Session-Id') || '';
        } catch (e) {
          // Session ID is returned in 409 response
        }

        const headers = {
          'Content-Type': 'application/json',
          ...(sessionId && { 'X-Transmission-Session-Id': sessionId })
        };

        // Get torrents
        const torrentsRes = await fetch(fetchUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            method: 'torrent-get',
            arguments: {
              fields: ['id', 'name', 'percentDone', 'totalSize', 'downloadedEver', 'rateDownload', 'rateUpload', 'eta', 'status', 'uploadRatio']
            }
          })
        });

        if (!torrentsRes.ok) throw new Error(`HTTP ${torrentsRes.status}`);
        const result = await torrentsRes.json();
        const torrents = result.arguments?.torrents || [];

        // Get session stats
        const statsRes = await fetch(fetchUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ method: 'session-stats' })
        });
        const statsResult = statsRes.ok ? await statsRes.json() : {};

        downloads = torrents.map(t => ({
          id: t.id,
          name: t.name,
          progress: t.percentDone * 100,
          size: t.totalSize,
          downloaded: t.downloadedEver,
          downloadSpeed: t.rateDownload,
          uploadSpeed: t.rateUpload,
          eta: t.eta,
          status: mapTransmissionStatus(t.status),
          ratio: t.uploadRatio
        }));

        const currentStats = statsResult.arguments?.['current-stats'] || {};
        clientStats = {
          downloadSpeed: currentStats.downloadSpeed || 0,
          uploadSpeed: currentStats.uploadSpeed || 0,
          activeCount: downloads.filter(d => d.status === 'downloading' || d.status === 'seeding').length,
          totalCount: downloads.length
        };
      }

      // Sort: active downloads first, then by progress descending
      downloads.sort((a, b) => {
        if (a.status === 'downloading' && b.status !== 'downloading') return -1;
        if (b.status === 'downloading' && a.status !== 'downloading') return 1;
        return b.progress - a.progress;
      });

      setData(prev => ({ ...prev, [clientId]: downloads.slice(0, 10) }));
      setStats(prev => ({ ...prev, [clientId]: clientStats }));

    } catch (err) {
      console.error(`[Downloads] Error fetching ${clientId}:`, err);
      setErrors(prev => ({ ...prev, [clientId]: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, [clientId]: false }));
    }
  }, [downloadClients]);

  // Fetch all configured clients
  useEffect(() => {
    configuredClients.forEach(c => fetchClient(c.id));

    const interval = setInterval(() => {
      configuredClients.forEach(c => fetchClient(c.id));
    }, 5000); // Refresh every 5 seconds for downloads

    return () => clearInterval(interval);
  }, [configuredClients.map(c => c.id).join(','), fetchClient]);

  // Status mapping functions
  function mapQbitStatus(state) {
    const map = {
      'downloading': 'downloading',
      'stalledDL': 'stalled',
      'uploading': 'seeding',
      'stalledUP': 'seeding',
      'pausedDL': 'paused',
      'pausedUP': 'paused',
      'queuedDL': 'queued',
      'queuedUP': 'queued',
      'checkingDL': 'checking',
      'checkingUP': 'checking',
      'error': 'error',
      'missingFiles': 'error',
      'forcedDL': 'downloading',
      'forcedUP': 'seeding',
      'allocating': 'checking'
    };
    return map[state] || 'queued';
  }

  function mapDelugeStatus(state) {
    const map = {
      'Downloading': 'downloading',
      'Seeding': 'seeding',
      'Paused': 'paused',
      'Queued': 'queued',
      'Checking': 'checking',
      'Error': 'error'
    };
    return map[state] || 'queued';
  }

  function mapSabStatus(status) {
    const map = {
      'Downloading': 'downloading',
      'Paused': 'paused',
      'Queued': 'queued',
      'Completed': 'completed',
      'Failed': 'error'
    };
    return map[status] || 'queued';
  }

  function mapTransmissionStatus(status) {
    // 0: stopped, 1: check pending, 2: checking, 3: download pending, 4: downloading, 5: seed pending, 6: seeding
    const map = {
      0: 'paused',
      1: 'queued',
      2: 'checking',
      3: 'queued',
      4: 'downloading',
      5: 'queued',
      6: 'seeding'
    };
    return map[status] || 'queued';
  }

  function parseTimeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }

  if (configuredClients.length === 0) {
    return (
      <div className="panel">
        <PanelHeader icon={Download} title={t('downloads')} />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '14px' }}>
            <Download size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>{t('configureDownloadsInSetup')}</div>
            <div style={{ fontSize: '11px', marginTop: '8px' }}>{t('downloadClients')}</div>
          </div>
        </div>
      </div>
    );
  }

  const currentClient = configuredClients.find(c => c.id === activeClient) || configuredClients[0];
  const currentData = data[currentClient?.id] || [];
  const currentStats = stats[currentClient?.id] || {};
  const currentLoading = loading[currentClient?.id];
  const currentError = errors[currentClient?.id];

  return (
    <div className="panel">
      <PanelHeader
        icon={Download}
        title={t('downloads')}
        onRefresh={() => configuredClients.forEach(c => fetchClient(c.id))}
      >
        {currentLoading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
      </PanelHeader>

      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Client tabs */}
        {configuredClients.length > 1 && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', padding: '4px', background: 'var(--bg-secondary)', borderRadius: '6px', flexShrink: 0 }}>
            {configuredClients.map(client => {
              const isActive = activeClient === client.id;
              return (
                <button
                  key={client.id}
                  onClick={() => setActiveClient(client.id)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    background: isActive ? 'var(--accent-glow)' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
                    borderRadius: '4px',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {client.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Stats summary */}
        {(currentStats.downloadSpeed > 0 || currentStats.uploadSpeed > 0 || currentStats.totalCount > 0) && (
          <StatsSummary stats={currentStats} />
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {currentError && (
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '6px', fontSize: '11px', color: 'var(--danger)' }}>
              Error: {currentError}
            </div>
          )}

          {currentData.length > 0 ? (
            currentData.map(item => (
              <DownloadCard key={item.id} item={item} />
            ))
          ) : !currentLoading && !currentError ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '12px' }}>
              <Download size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div>{t('noDownloads')}</div>
            </div>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
