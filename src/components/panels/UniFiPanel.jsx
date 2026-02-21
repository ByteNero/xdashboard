import { useState, useEffect } from 'react';
import { Wifi, Globe, Server, Loader2, Monitor, Smartphone, Cable, Radio, Router, Users, ArrowDown, ArrowUp, Cpu, HardDrive, Signal, Zap } from 'lucide-react';
import { unifi } from '../../services';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';
import { getLabel } from '../../utils/translations';

const vibrate = (pattern = 20) => {
  if (navigator.vibrate) navigator.vibrate(pattern);
};

const formatBytes = (bytesPerSec) => {
  if (!bytesPerSec || bytesPerSec < 0) return '0 B/s';
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.min(Math.floor(Math.log(bytesPerSec) / Math.log(1024)), units.length - 1);
  return (bytesPerSec / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0) + ' ' + units[i];
};

const formatBytesTotal = (bytes) => {
  if (!bytes || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
};

const formatUptime = (seconds) => {
  if (!seconds) return '-';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const getSignalQuality = (rssi) => {
  if (!rssi || rssi === 0) return { label: '-', color: 'var(--text-muted)', percent: 0 };
  // RSSI is typically -30 (best) to -90 (worst)
  if (rssi >= -50) return { label: 'Excellent', color: 'var(--success)', percent: 100 };
  if (rssi >= -60) return { label: 'Good', color: '#22c55e', percent: 75 };
  if (rssi >= -70) return { label: 'Fair', color: 'var(--warning)', percent: 50 };
  return { label: 'Weak', color: 'var(--danger)', percent: 25 };
};

const getDeviceTypeIcon = (type) => {
  if (type === 'uap') return Wifi;
  if (type === 'usw') return Server;
  if (type === 'ugw' || type === 'udm') return Router;
  return HardDrive;
};

const getDeviceTypeLabel = (type) => {
  if (type === 'uap') return 'AP';
  if (type === 'usw') return 'Switch';
  if (type === 'ugw' || type === 'udm') return 'Gateway';
  return 'Device';
};

const getDeviceTypeColor = (type) => {
  if (type === 'uap') return '#3b82f6';   // blue
  if (type === 'usw') return '#22c55e';   // green
  if (type === 'ugw' || type === 'udm') return '#a855f7'; // purple
  return 'var(--text-muted)';
};

// Mini progress bar component
const MiniBar = ({ value, color = 'var(--accent-primary)', label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px' }}>
    {label && <span style={{ color: 'var(--text-muted)', width: '24px' }}>{label}</span>}
    <div style={{ flex: 1, height: '4px', background: 'var(--bg-primary)', borderRadius: '2px', overflow: 'hidden', minWidth: '30px' }}>
      <div style={{ width: `${Math.min(100, value || 0)}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.3s ease' }} />
    </div>
    <span style={{ color: 'var(--text-secondary)', minWidth: '24px', textAlign: 'right' }}>{Math.round(value || 0)}%</span>
  </div>
);

// ========================
// Client Row Component
// ========================
const ClientRow = ({ client }) => {
  const signal = getSignalQuality(client.signal);
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 8px',
      background: 'var(--bg-card)',
      borderRadius: '6px',
      fontSize: '11px',
      minHeight: '36px'
    }}>
      {/* Icon */}
      <div style={{ color: client.isWired ? '#22c55e' : '#3b82f6', flexShrink: 0 }}>
        {client.isWired ? <Cable size={14} /> : <Wifi size={14} />}
      </div>

      {/* Name + IP */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '11px' }}>
          {client.name}
        </div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
          {client.ip || 'No IP'}{client.network ? ` · ${client.network}` : ''}
        </div>
      </div>

      {/* Signal (wireless only) */}
      {!client.isWired && client.signal ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
          <Signal size={10} style={{ color: signal.color }} />
          <span style={{ fontSize: '9px', color: signal.color }}>{client.signal}</span>
        </div>
      ) : null}

      {/* Bandwidth */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '55px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end' }}>
          <ArrowDown size={8} style={{ color: '#22c55e' }} />
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{formatBytes(client.rxRate)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end' }}>
          <ArrowUp size={8} style={{ color: '#3b82f6' }} />
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{formatBytes(client.txRate)}</span>
        </div>
      </div>
    </div>
  );
};

// ========================
// Device Card Component
// ========================
const DeviceCard = ({ device }) => {
  const TypeIcon = getDeviceTypeIcon(device.type);
  const typeColor = getDeviceTypeColor(device.type);
  const isOnline = device.status === 'online';

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '8px',
      padding: '10px',
      borderLeft: `3px solid ${isOnline ? typeColor : 'var(--text-muted)'}`,
      opacity: isOnline ? 1 : 0.6
    }}>
      {/* Header: icon + name + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <TypeIcon size={14} style={{ color: typeColor, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '600', fontSize: '11px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {device.name}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
            {getDeviceTypeLabel(device.type)}{device.ip ? ` · ${device.ip}` : ''}
          </div>
        </div>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: isOnline ? '#22c55e' : 'var(--danger)',
          flexShrink: 0,
          boxShadow: isOnline ? '0 0 6px rgba(34, 197, 94, 0.4)' : 'none'
        }} />
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '8px', fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
        <span title="Clients"><Users size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />{device.clients}</span>
        <span title="Uptime">⏱ {formatUptime(device.uptime)}</span>
      </div>

      {/* CPU / Memory bars */}
      {(device.cpu !== null || device.mem !== null) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {device.cpu !== null && <MiniBar value={device.cpu} color={device.cpu > 80 ? 'var(--danger)' : typeColor} label="CPU" />}
          {device.mem !== null && <MiniBar value={device.mem} color={device.mem > 80 ? 'var(--danger)' : typeColor} label="MEM" />}
        </div>
      )}
    </div>
  );
};

// ========================
// WAN Overview Component
// ========================
const WanOverview = ({ health, onSpeedTest, speedTestRunning }) => {
  const wan = health?.wan;
  const wlan = health?.wlan;
  const lan = health?.lan;
  const www = health?.www;

  if (!wan) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '13px' }}>
        No WAN data available
      </div>
    );
  }

  const isOnline = www?.status === 'ok' || wan?.status === 'ok';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Internet Status */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '8px',
        padding: '12px',
        borderLeft: `3px solid ${isOnline ? '#22c55e' : 'var(--danger)'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={16} style={{ color: isOnline ? '#22c55e' : 'var(--danger)' }} />
            <span style={{ fontWeight: '600', fontSize: '12px', color: 'var(--text-primary)' }}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          {wan.isp && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{wan.isp}</span>
          )}
        </div>

        {/* WAN IP + Gateway */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px' }}>
          {wan.wanIp && (
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginBottom: '2px' }}>WAN IP</div>
              <div style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '10px' }}>{wan.wanIp}</div>
            </div>
          )}
          {wan.gatewayName && (
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginBottom: '2px' }}>Gateway</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '10px' }}>{wan.gatewayName}</div>
            </div>
          )}
          {wan.uptime != null && (
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginBottom: '2px' }}>Uptime</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '10px' }}>{formatUptime(wan.uptime)}</div>
            </div>
          )}
          {wan.latency != null && (
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginBottom: '2px' }}>Latency</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '10px' }}>{wan.latency}ms</div>
            </div>
          )}
        </div>
      </div>

      {/* Throughput */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '10px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>Throughput</div>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div style={{ textAlign: 'center' }}>
            <ArrowDown size={12} style={{ color: '#22c55e', marginBottom: '2px' }} />
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e' }}>{formatBytes(wan.rxRate)}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Download</div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-color)' }} />
          <div style={{ textAlign: 'center' }}>
            <ArrowUp size={12} style={{ color: '#3b82f6', marginBottom: '2px' }} />
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#3b82f6' }}>{formatBytes(wan.txRate)}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Upload</div>
          </div>
        </div>
      </div>

      {/* Speed Test */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (wan.speedtestDown || wan.speedtestUp) ? '8px' : '0' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>Speed Test</div>
          <button
            onClick={() => { vibrate(30); onSpeedTest?.(); }}
            disabled={speedTestRunning}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px',
              background: speedTestRunning ? 'var(--bg-secondary)' : 'var(--accent-glow)',
              border: `1px solid ${speedTestRunning ? 'var(--border-color)' : 'var(--accent-primary)'}`,
              borderRadius: '4px',
              color: speedTestRunning ? 'var(--text-muted)' : 'var(--accent-primary)',
              fontSize: '10px', fontWeight: '600',
              cursor: speedTestRunning ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit'
            }}
          >
            {speedTestRunning ? (
              <><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Running...</>
            ) : (
              <><Zap size={10} /> Run Test</>
            )}
          </button>
        </div>
        {(wan.speedtestDown || wan.speedtestUp) ? (
          <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '11px' }}>
            {wan.speedtestDown != null && (
              <div style={{ textAlign: 'center' }}>
                <ArrowDown size={10} style={{ color: '#22c55e', marginBottom: '2px' }} />
                <div style={{ fontWeight: '700', color: '#22c55e', fontSize: '13px' }}>{wan.speedtestDown.toFixed(1)}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Mbps Down</div>
              </div>
            )}
            {wan.speedtestUp != null && (
              <div style={{ textAlign: 'center' }}>
                <ArrowUp size={10} style={{ color: '#3b82f6', marginBottom: '2px' }} />
                <div style={{ fontWeight: '700', color: '#3b82f6', fontSize: '13px' }}>{wan.speedtestUp.toFixed(1)}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Mbps Up</div>
              </div>
            )}
            {wan.speedtestPing != null && (
              <div style={{ textAlign: 'center' }}>
                <Signal size={10} style={{ color: 'var(--accent-primary)', marginBottom: '2px' }} />
                <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13px' }}>{wan.speedtestPing}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>ms Ping</div>
              </div>
            )}
          </div>
        ) : !speedTestRunning ? (
          <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', padding: '4px 0' }}>
            No results yet — run a test
          </div>
        ) : null}
      </div>

      {/* Gateway CPU/Memory */}
      {(wan.cpu != null || wan.mem != null) && (
        <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>Gateway</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {wan.cpu != null && <MiniBar value={wan.cpu} color={wan.cpu > 80 ? 'var(--danger)' : '#a855f7'} label="CPU" />}
            {wan.mem != null && <MiniBar value={wan.mem} color={wan.mem > 80 ? 'var(--danger)' : '#a855f7'} label="MEM" />}
          </div>
        </div>
      )}

      {/* Network Summary */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '10px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>Network Summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
          {wlan && (
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#3b82f6' }}>{wlan.numAp}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>APs</div>
            </div>
          )}
          {lan && (
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#22c55e' }}>{lan.numSw}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Switches</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-primary)' }}>
              {(wlan?.numClients || 0) + (lan?.numClients || 0)}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Clients</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================
// Main Panel Component
// ========================
export default function UniFiPanel({ config }) {
  const [data, setData] = useState({ devices: [], clients: [], health: null });
  const { connectionStatus, settings, integrations, connectUnifi } = useDashboardStore();
  const [isConnected, setIsConnected] = useState(unifi.isConnected());
  const [activeTab, setActiveTab] = useState('clients');
  const [currentPage, setCurrentPage] = useState({ clients: 0, devices: 0, wan: 0 });
  const [speedTestRunning, setSpeedTestRunning] = useState(false);
  const reconnectAttemptRef = useState(false);

  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  // Dynamic items per page
  const panelH = settings?.panelHeight && settings.panelHeight !== 'auto'
    ? parseInt(settings.panelHeight) : window.innerHeight;
  const ITEMS_PER_PAGE = {
    clients: Math.max(6, Math.floor((panelH - 130) / 44)),
    devices: 6 // 2 columns × 3 rows
  };

  const tabs = [
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'devices', label: 'Devices', icon: Server },
    { id: 'wan', label: 'WAN', icon: Globe }
  ];

  // Poll connection status + auto-reconnect
  useEffect(() => {
    const unifiConfig = integrations?.unifi;
    const checkConnection = () => {
      const serviceConnected = unifi.isConnected();
      const storeConnected = connectionStatus.unifi?.connected;
      setIsConnected(serviceConnected || storeConnected);

      // Auto-reconnect if configured but not connected
      if (!serviceConnected && !storeConnected && unifiConfig?.enabled && unifiConfig?.url && !reconnectAttemptRef.current) {
        reconnectAttemptRef.current = true;
        connectUnifi?.().finally(() => {
          setTimeout(() => { reconnectAttemptRef.current = false; }, 30000);
        });
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 2000);
    return () => clearInterval(interval);
  }, [connectionStatus.unifi?.connected, integrations?.unifi, connectUnifi]);

  // Subscribe to data updates
  useEffect(() => {
    if (!isConnected) {
      setData({ devices: [], clients: [], health: null });
      return;
    }

    const unsubscribe = unifi.subscribe((newData) => {
      setData(newData);
    });

    return () => unsubscribe();
  }, [isConnected]);

  const isConnecting = connectionStatus.unifi?.connecting;
  const totalClients = data.clients.length;
  const wiredCount = data.clients.filter(c => c.isWired).length;
  const wirelessCount = totalClients - wiredCount;

  // Sort clients: wireless first (with signal), then wired, alphabetical within groups
  const sortedClients = [...data.clients].sort((a, b) => {
    if (a.isWired !== b.isWired) return a.isWired ? 1 : -1;
    return (a.name || '').localeCompare(b.name || '');
  });

  // Sort devices: gateways first, then APs, then switches. Online first.
  const typeOrder = { ugw: 0, udm: 0, uap: 1, usw: 2 };
  const sortedDevices = [...data.devices].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'online' ? -1 : 1;
    return (typeOrder[a.type] || 3) - (typeOrder[b.type] || 3);
  });

  // Pagination
  const getItems = () => {
    if (activeTab === 'clients') return sortedClients;
    if (activeTab === 'devices') return sortedDevices;
    return [];
  };

  const items = getItems();
  const perPage = ITEMS_PER_PAGE[activeTab] || 6;
  const totalPages = activeTab === 'wan' ? 1 : Math.max(1, Math.ceil(items.length / perPage));
  const page = currentPage[activeTab] || 0;
  const paginatedItems = items.slice(page * perPage, (page + 1) * perPage);

  const handlePrev = () => {
    vibrate();
    setCurrentPage(p => ({ ...p, [activeTab]: p[activeTab] > 0 ? p[activeTab] - 1 : totalPages - 1 }));
  };
  const handleNext = () => {
    vibrate();
    setCurrentPage(p => ({ ...p, [activeTab]: p[activeTab] < totalPages - 1 ? p[activeTab] + 1 : 0 }));
  };

  const handleRefresh = () => {
    vibrate();
    if (unifi.isConnected()) unifi.fetchAll();
  };

  const handleSpeedTest = async () => {
    if (speedTestRunning || !unifi.isConnected()) return;
    setSpeedTestRunning(true);
    try {
      await unifi.runSpeedTest();
      // Poll for results every 5s for up to 90s
      let attempts = 0;
      const initialResults = await unifi.getSpeedTestResults();
      const initialTime = initialResults?.lastRun || 0;

      const poll = setInterval(async () => {
        attempts++;
        try {
          const results = await unifi.getSpeedTestResults();
          // Check if we got NEW results (different timestamp) or any results at all
          const hasNewResults = results?.download && results.lastRun !== initialTime;
          if (hasNewResults || attempts >= 18) {
            clearInterval(poll);
            setSpeedTestRunning(false);
            unifi.fetchAll();
          }
        } catch {
          // Keep polling even on errors
          if (attempts >= 18) {
            clearInterval(poll);
            setSpeedTestRunning(false);
            unifi.fetchAll();
          }
        }
      }, 5000);
    } catch (err) {
      console.error('[UniFi] Speed test error:', err);
      setSpeedTestRunning(false);
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="panel">
        <PanelHeader
          icon={Wifi}
          title="Network"
          badge={
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: isConnecting ? 'var(--warning)' : 'var(--text-muted)', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isConnecting ? (
                <><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Connecting</>
              ) : 'Not Connected'}
            </span>
          }
        />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px', fontSize: '14px' }}>
            {isConnecting ? 'Connecting to UniFi...' : 'Connect UniFi in Setup'}
          </div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="panel">
      <PanelHeader
        icon={Wifi}
        title="Network"
        onRefresh={handleRefresh}
        currentPage={totalPages > 1 ? page + 1 : undefined}
        totalPages={totalPages > 1 ? totalPages : undefined}
        onPrev={totalPages > 1 ? handlePrev : undefined}
        onNext={totalPages > 1 ? handleNext : undefined}
        badge={
          <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '3px 8px', borderRadius: '4px' }}>
            {totalClients} clients
          </span>
        }
      />
      <div className="panel-content">
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { vibrate(); setActiveTab(tab.id); }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '6px 8px',
                  background: isActive ? 'var(--accent-glow)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
                  borderRadius: '6px',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                  fontSize: '10px',
                  fontWeight: isActive ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit'
                }}
              >
                <TabIcon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Summary bar */}
            <div style={{ display: 'flex', gap: '12px', padding: '4px 0', marginBottom: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Wifi size={10} style={{ color: '#3b82f6' }} /> {wirelessCount} wireless
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Cable size={10} style={{ color: '#22c55e' }} /> {wiredCount} wired
              </span>
            </div>

            {paginatedItems.length > 0 ? (
              paginatedItems.map((client, i) => (
                <ClientRow key={client.mac || i} client={client} />
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px', fontSize: '12px' }}>
                No clients connected
              </div>
            )}
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((device, i) => (
                <DeviceCard key={device.mac || i} device={device} />
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '30px', fontSize: '12px' }}>
                No devices found
              </div>
            )}
          </div>
        )}

        {/* WAN Tab */}
        {activeTab === 'wan' && (
          <WanOverview health={data.health} onSpeedTest={handleSpeedTest} speedTestRunning={speedTestRunning} />
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
