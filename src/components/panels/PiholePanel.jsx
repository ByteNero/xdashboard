import { useState, useEffect } from 'react';
import { Shield, ShieldOff, Globe, Ban, Activity, Users, Search, Loader2 } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';
import { pihole } from '../../services/pihole';
import { getLabel } from '../../utils/translations';

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return (num || 0).toLocaleString();
};

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div style={{
    padding: '10px',
    background: 'var(--bg-card)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: '8px',
      background: `${color}20`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
    }}>
      <Icon size={16} style={{ color }} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
      {sub && <div style={{ fontSize: '8px', color: 'var(--text-muted)', opacity: 0.7 }}>{sub}</div>}
    </div>
  </div>
);

const DomainRow = ({ domain, count, color }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    fontSize: '10px',
    borderBottom: '1px solid var(--border-color)'
  }}>
    <span style={{
      color: 'var(--text-primary)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flex: 1,
      marginRight: '8px'
    }}>{domain}</span>
    <span style={{
      color,
      fontWeight: '600',
      fontFamily: 'var(--font-mono, monospace)',
      fontSize: '9px',
      flexShrink: 0
    }}>{formatNumber(count)}</span>
  </div>
);

export default function PiholePanel({ config }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const { settings } = useDashboardStore();
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  useEffect(() => {
    const unsub = pihole.subscribe(setData);
    return unsub;
  }, []);

  if (!data) {
    return (
      <div className="panel">
        <PanelHeader icon={Shield} title="DNS Filter" />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '14px' }}>
            <Shield size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>Configure Pi-hole or AdGuard Home in Setup</div>
          </div>
        </div>
      </div>
    );
  }

  const isEnabled = data.status === 'enabled' || data.status === 'active';
  const isPihole = data.type === 'pihole';
  const tabs = ['overview', 'top'];

  return (
    <div className="panel">
      <PanelHeader
        icon={isEnabled ? Shield : ShieldOff}
        title="DNS Filter"
        badge={
          <span style={{
            fontSize: '9px',
            padding: '2px 6px',
            background: isEnabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: isEnabled ? 'var(--success)' : 'var(--danger)',
            borderRadius: '4px',
            fontWeight: '600'
          }}>
            {isEnabled ? 'Active' : 'Disabled'}
          </span>
        }
      />

      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '4px 10px',
              background: tab === t ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: tab === t ? '#000' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '4px',
              fontSize: '9px',
              fontWeight: '600',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}>{t === 'top' ? 'Top Domains' : t}</button>
          ))}
          <span style={{
            marginLeft: 'auto',
            fontSize: '8px',
            color: 'var(--text-muted)',
            alignSelf: 'center',
            opacity: 0.6
          }}>{isPihole ? 'Pi-hole' : 'AdGuard'}</span>
        </div>

        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1, overflow: 'auto' }}>
            <StatCard
              icon={Search}
              label="Total Queries"
              value={formatNumber(data.totalQueries)}
              color="var(--accent-primary)"
            />
            <StatCard
              icon={Ban}
              label="Blocked"
              value={formatNumber(data.blockedQueries)}
              sub={`${data.percentBlocked?.toFixed(1)}% of all queries`}
              color="var(--danger)"
            />
            <StatCard
              icon={Globe}
              label={isPihole ? "Domains on Blocklist" : "Avg Processing Time"}
              value={isPihole ? formatNumber(data.domainsOnBlocklist) : `${data.avgProcessingTime || 0}ms`}
              color="var(--warning)"
            />
            <StatCard
              icon={Users}
              label={isPihole ? "Clients" : "Top Clients"}
              value={isPihole ? (data.uniqueClients || 0) : (data.topClients?.length || 0)}
              sub={isPihole ? `${data.clientsEverSeen || 0} ever seen` : null}
              color="var(--accent-secondary)"
            />
            {isPihole && (
              <>
                <StatCard
                  icon={Activity}
                  label="Forwarded"
                  value={formatNumber(data.queriesForwarded)}
                  color="#8b5cf6"
                />
                <StatCard
                  icon={Activity}
                  label="Cached"
                  value={formatNumber(data.queriesCached)}
                  color="#06b6d4"
                />
              </>
            )}
          </div>
        )}

        {tab === 'top' && (
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.topPermitted?.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--success)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Globe size={10} /> Top Permitted
                </div>
                {data.topPermitted.map((item, i) => (
                  <DomainRow key={i} domain={item.domain} count={item.count} color="var(--success)" />
                ))}
              </div>
            )}
            {data.topBlocked?.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--danger)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Ban size={10} /> Top Blocked
                </div>
                {data.topBlocked.map((item, i) => (
                  <DomainRow key={i} domain={item.domain} count={item.count} color="var(--danger)" />
                ))}
              </div>
            )}
            {(!data.topPermitted?.length && !data.topBlocked?.length) && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '11px' }}>
                {isPihole ? 'API key required for top domains' : 'No domain data available'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
