import { useState, useEffect } from 'react';
import { Server, Cpu, HardDrive, MemoryStick, MonitorSmartphone, Container, ArrowUpDown, Clock } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';
import { proxmox } from '../../services/proxmox';
import { getLabel } from '../../utils/translations';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatUptime = (seconds) => {
  if (!seconds) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const ProgressBar = ({ value, max, color, label }) => {
  const pct = max > 0 ? (value / max * 100) : 0;
  return (
    <div style={{ flex: 1 }}>
      {label && <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span>{pct.toFixed(1)}%</span>
      </div>}
      <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(pct, 100)}%`,
          background: pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : color || 'var(--accent-primary)',
          borderRadius: 2,
          transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  );
};

const StatusDot = ({ status }) => (
  <span style={{
    width: 6, height: 6, borderRadius: '50%',
    background: status === 'running' || status === 'online' ? 'var(--success)' : status === 'stopped' ? 'var(--danger)' : 'var(--warning)',
    display: 'inline-block',
    flexShrink: 0
  }} />
);

const NodeCard = ({ node }) => (
  <div style={{
    padding: '10px',
    background: 'var(--bg-card)',
    borderRadius: '8px',
    borderLeft: `3px solid ${node.status === 'online' ? 'var(--success)' : 'var(--danger)'}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <StatusDot status={node.status} />
        <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)' }}>{node.node}</span>
      </div>
      <span style={{ fontSize: '8px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
        <Clock size={8} /> {formatUptime(node.uptime)}
      </span>
    </div>
    <div style={{ display: 'flex', gap: '8px' }}>
      <ProgressBar value={node.cpu * node.maxcpu} max={node.maxcpu} color="var(--accent-primary)" label={`CPU (${node.maxcpu} cores)`} />
      <ProgressBar value={node.mem} max={node.maxmem} color="#8b5cf6" label={`RAM ${formatBytes(node.mem)}`} />
      {node.maxdisk > 0 && (
        <ProgressBar value={node.disk} max={node.maxdisk} color="var(--warning)" label={`Disk ${formatBytes(node.disk)}`} />
      )}
    </div>
  </div>
);

const GuestRow = ({ guest }) => {
  const isRunning = guest.status === 'running';
  const cpuPct = guest.cpus > 0 ? (guest.cpu * 100) : 0;
  const memPct = guest.maxmem > 0 ? (guest.mem / guest.maxmem * 100) : 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 8px',
      background: 'var(--bg-card)',
      borderRadius: '6px',
      borderLeft: `3px solid ${isRunning ? 'var(--success)' : 'var(--danger)'}`
    }}>
      <StatusDot status={guest.status} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: '0 0 auto', width: '30px' }}>
        {guest.type === 'lxc'
          ? <Container size={10} style={{ color: 'var(--accent-secondary)', flexShrink: 0 }} />
          : <MonitorSmartphone size={10} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
        }
        <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{guest.vmid}</span>
      </div>
      <span style={{
        fontSize: '10px',
        fontWeight: '600',
        color: 'var(--text-primary)',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0
      }}>{guest.name}</span>
      {isRunning && (
        <>
          <span style={{
            fontSize: '8px',
            color: cpuPct > 80 ? 'var(--danger)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono, monospace)',
            minWidth: '38px',
            textAlign: 'right'
          }}>
            <Cpu size={8} style={{ display: 'inline', marginRight: '2px' }} />
            {cpuPct.toFixed(0)}%
          </span>
          <span style={{
            fontSize: '8px',
            color: memPct > 80 ? 'var(--danger)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono, monospace)',
            minWidth: '50px',
            textAlign: 'right'
          }}>
            {formatBytes(guest.mem)}
          </span>
        </>
      )}
      {!isRunning && (
        <span style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{guest.status}</span>
      )}
    </div>
  );
};

export default function ProxmoxPanel({ config }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('all');
  const { settings } = useDashboardStore();
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  useEffect(() => {
    const unsub = proxmox.subscribe(setData);
    return unsub;
  }, []);

  if (!data || !data.nodes?.length) {
    return (
      <div className="panel">
        <PanelHeader icon={Server} title="Proxmox" />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '14px' }}>
            <Server size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>Configure Proxmox in Setup</div>
            <div style={{ fontSize: '11px', marginTop: '8px' }}>Needs an API token with PVEAuditor role</div>
          </div>
        </div>
      </div>
    );
  }

  const runningGuests = data.guests.filter(g => g.status === 'running');
  const stoppedGuests = data.guests.filter(g => g.status !== 'running');
  const qemuCount = data.guests.filter(g => g.type === 'qemu').length;
  const lxcCount = data.guests.filter(g => g.type === 'lxc').length;

  const filteredGuests = tab === 'running' ? runningGuests
    : tab === 'stopped' ? stoppedGuests
    : data.guests;

  return (
    <div className="panel">
      <PanelHeader
        icon={Server}
        title="Proxmox"
        badge={
          <span style={{
            fontSize: '9px',
            padding: '2px 6px',
            background: 'rgba(34, 197, 94, 0.2)',
            color: 'var(--success)',
            borderRadius: '4px',
            fontWeight: '600'
          }}>
            {runningGuests.length}/{data.guests.length} running
          </span>
        }
      />

      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Node overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
          {data.nodes.map(node => (
            <NodeCard key={node.node} node={node} />
          ))}
        </div>

        {/* Guest filter tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', alignItems: 'center' }}>
          {[
            { id: 'all', label: `All (${data.guests.length})` },
            { id: 'running', label: `Running (${runningGuests.length})` },
            { id: 'stopped', label: `Stopped (${stoppedGuests.length})` }
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '3px 8px',
              background: tab === t.id ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: tab === t.id ? '#000' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '4px',
              fontSize: '9px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>{t.label}</button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '8px', color: 'var(--text-muted)' }}>
            {qemuCount} VM · {lxcCount} CT
          </span>
        </div>

        {/* Guest list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filteredGuests.map(guest => (
            <GuestRow key={`${guest.node}-${guest.vmid}`} guest={guest} />
          ))}
          {filteredGuests.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '11px' }}>
              No {tab === 'stopped' ? 'stopped' : tab === 'running' ? 'running' : ''} guests
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
