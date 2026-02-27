import { useState, useEffect, useCallback } from 'react';
import { Box, Play, Square, Pause, RotateCcw, AlertCircle, CheckCircle, Clock, Cpu, HardDrive, Loader2 } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';
import { getLabel } from '../../utils/translations';

// Format bytes
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Format uptime
const formatUptime = (seconds) => {
  if (!seconds) return '-';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

// Status badge
const StatusBadge = ({ status }) => {
  const styles = {
    running: { bg: 'var(--success)', text: '#000', icon: Play },
    exited: { bg: 'var(--danger)', text: '#fff', icon: Square },
    paused: { bg: 'var(--warning)', text: '#000', icon: Pause },
    restarting: { bg: 'var(--accent-secondary)', text: '#000', icon: RotateCcw },
    dead: { bg: 'var(--danger)', text: '#fff', icon: AlertCircle },
    created: { bg: 'var(--text-muted)', text: '#fff', icon: Clock },
    healthy: { bg: 'var(--success)', text: '#000', icon: CheckCircle },
    unhealthy: { bg: 'var(--danger)', text: '#fff', icon: AlertCircle },
  };

  const style = styles[status?.toLowerCase()] || styles.created;
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

// Container card
const ContainerCard = ({ container }) => {
  return (
    <div style={{
      padding: '10px',
      background: 'var(--bg-card)',
      borderRadius: '8px',
      borderLeft: `3px solid ${container.state === 'running' ? 'var(--success)' : 'var(--danger)'}`
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
          {container.name}
        </div>
        <StatusBadge status={container.state} />
      </div>

      <div style={{
        fontSize: '9px',
        color: 'var(--text-muted)',
        marginBottom: '6px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {container.image}
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        fontSize: '9px',
        color: 'var(--text-muted)'
      }}>
        {container.uptime && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={9} />
            {formatUptime(container.uptime)}
          </span>
        )}
        {container.cpu !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Cpu size={9} />
            {container.cpu.toFixed(1)}%
          </span>
        )}
        {container.memory && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <HardDrive size={9} />
            {formatBytes(container.memory)}
          </span>
        )}
        {container.ports && container.ports.length > 0 && (
          <span style={{ color: 'var(--accent-primary)' }}>
            :{container.ports[0]}
          </span>
        )}
      </div>
    </div>
  );
};

// Stats summary
const StatsSummary = ({ stats }) => {
  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      padding: '8px 12px',
      background: 'var(--bg-card)',
      borderRadius: '6px',
      marginBottom: '10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <CheckCircle size={12} style={{ color: 'var(--success)' }} />
        <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)' }}>
          {stats.running}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>running</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Square size={12} style={{ color: 'var(--danger)' }} />
        <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)' }}>
          {stats.stopped}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>stopped</span>
      </div>
      {stats.unhealthy > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={12} style={{ color: 'var(--warning)' }} />
          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--warning)' }}>
            {stats.unhealthy}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>unhealthy</span>
        </div>
      )}
    </div>
  );
};

export default function DockerPanel({ config }) {
  const [containers, setContainers] = useState([]);
  const [stats, setStats] = useState({ running: 0, stopped: 0, unhealthy: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { integrations, settings } = useDashboardStore();
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  const dockerConfig = integrations.docker || {};

  const fetchContainers = useCallback(async () => {
    if (!dockerConfig.enabled || !dockerConfig.url) return;

    setLoading(true);
    setError(null);

    try {
      const baseUrl = dockerConfig.url.replace(/\/$/, '');
      let allContainers = [];

      if (dockerConfig.type === 'portainer') {
        // Portainer API
        const headers = {
          'X-API-Key': dockerConfig.apiKey || ''
        };

        // First get endpoints
        const fetchUrl = `/api/proxy?url=${encodeURIComponent(`${baseUrl}/api/endpoints`)}`;

        const endpointsRes = await fetch(fetchUrl, { headers });
        if (!endpointsRes.ok) throw new Error(`HTTP ${endpointsRes.status}`);
        const endpoints = await endpointsRes.json();

        // Get containers from first endpoint (or specified)
        const endpointId = dockerConfig.endpointId || (endpoints[0]?.Id || 1);
        const containersUrl = `/api/proxy?url=${encodeURIComponent(`${baseUrl}/api/endpoints/${endpointId}/docker/containers/json?all=true`)}`;

        const containersRes = await fetch(containersUrl, { headers });
        if (!containersRes.ok) throw new Error(`HTTP ${containersRes.status}`);
        allContainers = await containersRes.json();

        allContainers = allContainers.map(c => ({
          id: c.Id,
          name: c.Names?.[0]?.replace(/^\//, '') || c.Id.slice(0, 12),
          image: c.Image?.split(':')[0]?.split('/').pop() || c.Image,
          state: c.State,
          status: c.Status,
          uptime: c.State === 'running' ? Math.floor((Date.now() / 1000) - c.Created) : 0,
          ports: c.Ports?.filter(p => p.PublicPort).map(p => p.PublicPort) || [],
          health: c.Status?.includes('healthy') ? 'healthy' : c.Status?.includes('unhealthy') ? 'unhealthy' : null
        }));

      } else {
        // Direct Docker API (socket or TCP)
        const fetchUrl = `/api/proxy?url=${encodeURIComponent(`${baseUrl}/containers/json?all=true`)}`;

        const containersRes = await fetch(fetchUrl);
        if (!containersRes.ok) throw new Error(`HTTP ${containersRes.status}`);
        allContainers = await containersRes.json();

        allContainers = allContainers.map(c => ({
          id: c.Id,
          name: c.Names?.[0]?.replace(/^\//, '') || c.Id.slice(0, 12),
          image: c.Image?.split(':')[0]?.split('/').pop() || c.Image,
          state: c.State,
          status: c.Status,
          uptime: c.State === 'running' ? Math.floor((Date.now() / 1000) - c.Created) : 0,
          ports: c.Ports?.filter(p => p.PublicPort).map(p => p.PublicPort) || [],
          health: c.Status?.includes('healthy') ? 'healthy' : c.Status?.includes('unhealthy') ? 'unhealthy' : null
        }));
      }

      // Sort: running first, then by name
      allContainers.sort((a, b) => {
        if (a.state === 'running' && b.state !== 'running') return -1;
        if (b.state === 'running' && a.state !== 'running') return 1;
        return a.name.localeCompare(b.name);
      });

      // Calculate stats
      const running = allContainers.filter(c => c.state === 'running').length;
      const stopped = allContainers.filter(c => c.state !== 'running').length;
      const unhealthy = allContainers.filter(c => c.health === 'unhealthy').length;

      setContainers(allContainers.slice(0, 12));
      setStats({ running, stopped, unhealthy });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dockerConfig]);

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [fetchContainers]);

  if (!dockerConfig.enabled || !dockerConfig.url) {
    return (
      <div className="panel">
        <PanelHeader icon={Box} title={t('docker')} />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '14px' }}>
            <Box size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>{t('configureDockerInSetup')}</div>
            <div style={{ fontSize: '11px', marginTop: '8px' }}>{t('dockerTypes')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <PanelHeader
        icon={Box}
        title={t('docker')}
        onRefresh={fetchContainers}
      >
        {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
      </PanelHeader>

      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Stats summary */}
        <StatsSummary stats={stats} />

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {error && (
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '6px', fontSize: '11px', color: 'var(--danger)' }}>
              Error: {error}
            </div>
          )}

          {containers.length > 0 ? (
            containers.map(container => (
              <ContainerCard key={container.id} container={container} />
            ))
          ) : !loading && !error ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '12px' }}>
              <Box size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div>{t('noContainersFound')}</div>
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
