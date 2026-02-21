import { useState, useEffect, useRef } from 'react';
import { Cpu, HardDrive, MemoryStick, Thermometer, Activity, Server, ArrowUp, ArrowDown, Gauge, Zap, Clock } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';
import { getLabel } from '../../utils/translations';

// Normalize different API response formats (Glances v3, v4, custom)
function normalizeStats(data, prevNetwork, refreshInterval) {
  if (data._normalized) return data;

  const stats = { _normalized: true };

  // CPU
  if (data.cpu !== undefined) stats.cpu = data.cpu;
  if (data.percpu && Array.isArray(data.percpu)) {
    stats.cpuCores = data.percpu.map(c => c.total || c);
  }

  // Memory
  if (data.mem !== undefined) stats.memory = data.mem;
  else if (data.memory !== undefined) stats.memory = data.memory;

  // Swap
  if (data.swap !== undefined) stats.swap = data.swap;

  // Disk
  if (data.disk !== undefined) stats.disk = data.disk;
  else if (data.fs !== undefined && Array.isArray(data.fs)) {
    const realFs = data.fs.filter(f => {
      const mount = f.mnt_point || '';
      if (mount.startsWith('/dev') || mount.startsWith('/sys') || mount.startsWith('/proc') ||
          mount.startsWith('/run') || mount.startsWith('/snap') || mount === '/boot/efi') {
        return false;
      }
      return true;
    });

    const rootFs = realFs.find(f => f.mnt_point === '/') || realFs[0];
    if (rootFs) {
      stats.disk = rootFs.percent;
    }
    stats.filesystems = data.fs
      .filter(f => f.size > 0)
      .sort((a, b) => (b.size || 0) - (a.size || 0))
      .map(f => ({ mount: f.mnt_point, percent: f.percent, used: f.used, total: f.size }));
  }

  // Memory details
  if (data.memused !== undefined) stats.memoryUsed = data.memused;
  if (data.memtotal !== undefined) stats.memoryTotal = data.memtotal;

  // Temperature
  if (data.cpuTemp !== undefined) stats.cpuTemp = data.cpuTemp;
  if (data.sensors && Array.isArray(data.sensors)) {
    const cpuSensor = data.sensors.find(s =>
      s.label?.toLowerCase().includes('cpu') ||
      s.label?.toLowerCase().includes('core') ||
      s.label?.toLowerCase().includes('package')
    );
    if (cpuSensor) stats.cpuTemp = cpuSensor.value;
  }

  // Network - Calculate rate from cumulative bytes
  if (data.network && Array.isArray(data.network)) {
    // Sum all interfaces or find the main one
    let totalRx = 0, totalTx = 0;
    data.network.forEach(nic => {
      // Glances provides rx/tx as bytes per second in some versions, cumulative in others
      // Check if it looks like a rate (reasonable value) or cumulative (very large)
      const rx = nic.rx || nic.bytes_recv || 0;
      const tx = nic.tx || nic.bytes_sent || 0;

      // If values are very large (> 1GB), they're probably cumulative
      if (rx > 1000000000 || tx > 1000000000) {
        // Need to calculate delta from previous
        if (prevNetwork && prevNetwork[nic.interface_name]) {
          const prev = prevNetwork[nic.interface_name];
          const interval = refreshInterval / 1000; // Convert to seconds
          totalRx += Math.max(0, (rx - prev.rx) / interval);
          totalTx += Math.max(0, (tx - prev.tx) / interval);
        }
      } else {
        // Already a rate
        totalRx += rx;
        totalTx += tx;
      }
    });

    stats.networkDown = totalRx;
    stats.networkUp = totalTx;

    // Store current values for next calculation
    stats._networkRaw = {};
    data.network.forEach(nic => {
      stats._networkRaw[nic.interface_name] = {
        rx: nic.rx || nic.bytes_recv || 0,
        tx: nic.tx || nic.bytes_sent || 0
      };
    });
  }

  // Load averages
  if (data.load && typeof data.load === 'object') {
    stats.load1 = data.load.min1;
    stats.load5 = data.load.min5;
    stats.load15 = data.load.min15;
  }

  // Uptime
  if (data.uptime !== undefined) stats.uptime = data.uptime;

  // Hostname
  if (data.hostname !== undefined) stats.hostname = data.hostname;

  // Processes
  if (data.processcount !== undefined) {
    stats.processCount = data.processcount.total;
    stats.processRunning = data.processcount.running;
  }

  return stats;
}

// Compact circular gauge - BIGGER
function CompactGauge({ percent, size = 60, strokeWidth = 5, color, label, value }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-secondary)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease-out', filter: `drop-shadow(0 0 3px ${color})` }}
          />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{value}</div>
        </div>
      </div>
      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '500' }}>{label}</span>
    </div>
  );
}

// Mini bar for core usage
function MiniBar({ percent, color }) {
  return (
    <div style={{ flex: 1, height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden', minWidth: '8px' }}>
      <div style={{ width: `${Math.min(percent, 100)}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.3s ease' }} />
    </div>
  );
}

// Compact drive item - BIGGER FONTS
function DriveItem({ mount, percent, used, total, formatBytes, getUsageColor }) {
  const name = mount === '/' ? 'Root' : mount.split('/').pop() || mount;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }} title={mount}>
        {name}
      </span>
      <div style={{ flex: 1, height: '5px', background: 'var(--bg-card)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(percent, 100)}%`, height: '100%', background: getUsageColor(percent), transition: 'width 0.3s ease' }} />
      </div>
      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: getUsageColor(percent), width: '32px', textAlign: 'right', fontWeight: '600' }}>
        {Math.round(percent)}%
      </span>
    </div>
  );
}

export default function SystemPanel({ config }) {
  const [allStats, setAllStats] = useState({});
  const [errors, setErrors] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const prevNetworkRef = useRef({});
  const { integrations, settings } = useDashboardStore();
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  const systemsArray = Array.isArray(integrations.systems) && integrations.systems.length > 0
    ? integrations.systems.filter(s => s.enabled !== false && s.apiUrl)
    : integrations.system?.apiUrl
      ? [{ id: 'default', name: integrations.system.name || 'System', apiUrl: integrations.system.apiUrl, refreshInterval: integrations.system.refreshInterval }]
      : [];

  const totalSystems = systemsArray.length;
  const currentSystem = systemsArray[currentIndex] || null;
  const isConfigured = totalSystems > 0;
  const refreshInterval = currentSystem?.refreshInterval || 5000;

  useEffect(() => {
    if (!isConfigured) return;

    const fetchAllStats = async () => {
      const newStats = {};
      const newErrors = {};

      await Promise.all(systemsArray.map(async (sys) => {
        try {
          const response = await fetch(`/api/proxy?url=${encodeURIComponent(sys.apiUrl)}`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          let data = await response.json();

          const baseUrl = sys.apiUrl.replace(/\/api\/[34]\/.*$/, '');
          const isGlances = sys.apiUrl.includes('/api/3/') || sys.apiUrl.includes('/api/4/');

          if (isGlances) {
            const apiVersion = sys.apiUrl.includes('/api/4/') ? '4' : '3';
            const endpoints = ['fs', 'mem', 'percpu', 'network', 'sensors', 'load', 'processcount'];
            const fetches = endpoints.map(async (endpoint) => {
              try {
                const res = await fetch(`/api/proxy?url=${encodeURIComponent(`${baseUrl}/api/${apiVersion}/${endpoint}`)}`);
                if (res.ok) return { endpoint, data: await res.json() };
              } catch (e) {}
              return null;
            });

            const results = await Promise.all(fetches);
            results.forEach(result => {
              if (result) {
                if (result.endpoint === 'fs') data.fs = result.data;
                else if (result.endpoint === 'mem') {
                  data.memused = result.data.used;
                  data.memtotal = result.data.total;
                }
                else if (result.endpoint === 'percpu') data.percpu = result.data;
                else if (result.endpoint === 'network') data.network = result.data;
                else if (result.endpoint === 'sensors') data.sensors = result.data;
                else if (result.endpoint === 'load') data.load = result.data;
                else if (result.endpoint === 'processcount') data.processcount = result.data;
              }
            });
          }

          const prevNetwork = prevNetworkRef.current[sys.id];
          const normalized = normalizeStats(data, prevNetwork, sys.refreshInterval || 5000);

          // Store network raw for next delta calculation
          if (normalized._networkRaw) {
            prevNetworkRef.current[sys.id] = normalized._networkRaw;
          }

          newStats[sys.id] = normalized;
        } catch (err) {
          newErrors[sys.id] = err.message;
        }
      }));

      setAllStats(prev => ({ ...prev, ...newStats }));
      setErrors(prev => ({ ...prev, ...newErrors }));
    };

    fetchAllStats();
    const interval = setInterval(fetchAllStats, refreshInterval);
    return () => clearInterval(interval);
  }, [isConfigured, JSON.stringify(systemsArray.map(s => s.apiUrl))]);

  const formatBytes = (bytes, decimals = 1) => {
    if (!bytes) return '0';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(decimals)}${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec < 1) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
    return `${(bytesPerSec / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getUsageColor = (percent) => {
    if (percent >= 90) return 'var(--danger)';
    if (percent >= 70) return 'var(--warning)';
    return 'var(--accent-primary)';
  };

  const handlePrev = () => setCurrentIndex(i => i > 0 ? i - 1 : totalSystems - 1);
  const handleNext = () => setCurrentIndex(i => i < totalSystems - 1 ? i + 1 : 0);

  if (!isConfigured) {
    return (
      <div className="panel">
        <PanelHeader icon={Cpu} title={t('system')} />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '14px' }}>
            <Server size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>{t('configureSystemInSetup')}</div>
          </div>
        </div>
      </div>
    );
  }

  const stats = allStats[currentSystem?.id];
  const error = errors[currentSystem?.id];

  if (error && !stats) {
    return (
      <div className="panel">
        <PanelHeader icon={Cpu} title={currentSystem?.name || 'System'} currentPage={currentIndex + 1} totalPages={totalSystems} onPrev={handlePrev} onNext={handleNext} />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--danger)', padding: '40px 20px', fontSize: '13px' }}>Failed: {error}</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="panel">
        <PanelHeader icon={Cpu} title={currentSystem?.name || 'System'} currentPage={currentIndex + 1} totalPages={totalSystems} onPrev={handlePrev} onNext={handleNext} />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '14px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <PanelHeader icon={Cpu} title={currentSystem?.name || stats.hostname || 'System'} currentPage={currentIndex + 1} totalPages={totalSystems} onPrev={handlePrev} onNext={handleNext} />
      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* Main gauges */}
        <div style={{ display: 'flex', justifyContent: 'space-around', paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
          {stats.cpu !== undefined && <CompactGauge percent={stats.cpu} color={getUsageColor(stats.cpu)} label="CPU" value={`${Math.round(stats.cpu)}%`} />}
          {stats.memory !== undefined && <CompactGauge percent={stats.memory} color={getUsageColor(stats.memory)} label="RAM" value={`${Math.round(stats.memory)}%`} />}
          {stats.disk !== undefined && <CompactGauge percent={stats.disk} color={getUsageColor(stats.disk)} label="Disk" value={`${Math.round(stats.disk)}%`} />}
          {stats.swap !== undefined && stats.swap > 5 && <CompactGauge percent={stats.swap} color={stats.swap > 50 ? 'var(--warning)' : 'var(--text-muted)'} label="Swap" value={`${Math.round(stats.swap)}%`} />}
        </div>

        {/* CPU Cores */}
        {stats.cpuCores && stats.cpuCores.length > 0 && (
          <div style={{ marginBottom: '10px', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={10} /> {stats.cpuCores.length} CORES
            </div>
            <div style={{ display: 'flex', gap: '2px' }}>
              {stats.cpuCores.slice(0, 32).map((core, i) => <MiniBar key={i} percent={core} color={getUsageColor(core)} />)}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
          {/* Network */}
          {(stats.networkUp !== undefined || stats.networkDown !== undefined) && (
            <div style={{ flex: 1, minWidth: '120px', display: 'flex', gap: '12px', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ArrowDown size={12} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: '600' }}>{formatSpeed(stats.networkDown)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ArrowUp size={12} style={{ color: 'var(--success)' }} />
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--success)', fontWeight: '600' }}>{formatSpeed(stats.networkUp)}</span>
              </div>
            </div>
          )}

          {/* Temp */}
          {stats.cpuTemp !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
              <Thermometer size={12} style={{ color: stats.cpuTemp > 80 ? 'var(--danger)' : stats.cpuTemp > 60 ? 'var(--warning)' : 'var(--success)' }} />
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: '600', color: stats.cpuTemp > 80 ? 'var(--danger)' : 'var(--text-primary)' }}>{Math.round(stats.cpuTemp)}°C</span>
            </div>
          )}

          {/* Load */}
          {stats.load1 !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
              <Gauge size={12} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {stats.load1?.toFixed(1)}/{stats.load5?.toFixed(1)}/{stats.load15?.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Memory details */}
        {stats.memoryUsed && stats.memoryTotal && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', flexShrink: 0 }}>
            RAM: {formatBytes(stats.memoryUsed)} / {formatBytes(stats.memoryTotal)}
          </div>
        )}

        {/* Drives section - scrollable */}
        {stats.filesystems && stats.filesystems.length > 0 && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <HardDrive size={10} /> DRIVES ({stats.filesystems.length})
            </div>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              padding: '8px 10px'
            }}>
              {stats.filesystems.map((fs, i) => (
                <DriveItem key={i} {...fs} formatBytes={formatBytes} getUsageColor={getUsageColor} />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', marginTop: '8px', borderTop: '1px solid var(--border-color)', fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
          {stats.processCount !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={10} />
              <span>{stats.processCount} procs</span>
              {stats.processRunning && <span style={{ color: 'var(--success)' }}>({stats.processRunning} run)</span>}
            </div>
          )}
          {stats.uptime && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={10} />
              <span>{stats.uptime}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
