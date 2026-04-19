import { useState, useEffect } from 'react';
import { Bus, AlertTriangle, Loader2 } from 'lucide-react';
import { busni } from '../../services/busni';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';

const PRIORITY_STYLES = {
  veryHigh: { bg: 'var(--error)', fg: '#fff', label: 'CRITICAL' },
  high: { bg: 'var(--warning)', fg: '#000', label: 'HIGH' },
  normal: { bg: 'var(--accent-primary)', fg: '#000', label: 'INFO' }
};

function formatMins(mins) {
  if (mins === null || mins === undefined) return '—';
  if (mins <= 0) return 'Due';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return time;
    // Different day — prefix with short weekday so tomorrow's buses are visually distinct
    const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
    return `${weekday} ${time}`;
  } catch {
    return '';
  }
}

function formatLine(l) {
  if (!l) return '';
  if (typeof l === 'string') return l;
  return l.number || l.name || l.id || '';
}

function formatStop(s) {
  if (!s) return '';
  if (typeof s === 'string') return s;
  if (s.name && s.locality) return `${s.name} (${s.locality})`;
  return s.name || s.id || '';
}

export default function BusNIPanel() {
  const [data, setData] = useState(null);
  const [dismissedAlertKey, setDismissedAlertKey] = useState(null);
  const { connectionStatus } = useDashboardStore();
  const status = connectionStatus.busni || {};

  useEffect(() => {
    const unsub = busni.subscribe(setData);
    return () => unsub();
  }, []);

  if (!status.connected && !data) {
    return (
      <div className="panel">
        <PanelHeader icon={Bus} title="BUS NI" />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            {status.connecting ? (
              <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Connecting to wrapper…</>
            ) : status.error ? (
              <span style={{ color: 'var(--error)' }}>Wrapper unreachable: {status.error}</span>
            ) : (
              'Configure BUS NI in Setup to enable this panel.'
            )}
          </div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const alerts = data?.alerts?.data;
  const alertKey = alerts?.items?.map(i => i.id).join('|') || '';
  const showAlert = alerts?.show && alerts.items?.length > 0 && dismissedAlertKey !== alertKey;
  const highestPrio = alerts?.highest_priority || 'normal';
  const prioStyle = PRIORITY_STYLES[highestPrio] || PRIORITY_STYLES.normal;

  const quota = data?.quotaStatus;
  const showQuotaBadge = quota === 'low' || quota === 'exhausted';
  const quotaStyle = quota === 'exhausted'
    ? { bg: 'var(--error)', fg: '#fff', label: 'QUOTA EXHAUSTED' }
    : { bg: 'var(--warning)', fg: '#000', label: 'QUOTA LOW' };

  return (
    <div className="panel">
      <PanelHeader
        icon={Bus}
        title="BUS NI"
        onRefresh={() => busni.refresh()}
        badge={
          showAlert ? (
            <span style={{
              background: prioStyle.bg,
              color: prioStyle.fg,
              padding: '2px 10px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <AlertTriangle size={10} /> {prioStyle.label}
            </span>
          ) : showQuotaBadge ? (
            <span title={data.quotaUsed != null && data.quotaLimit != null ? `${data.quotaUsed}/${data.quotaLimit} upstream calls today` : undefined} style={{
              background: quotaStyle.bg,
              color: quotaStyle.fg,
              padding: '2px 10px',
              borderRadius: '10px',
              fontSize: '10px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <AlertTriangle size={10} /> {quotaStyle.label}
            </span>
          ) : null
        }
      />
      <div className="panel-content">
        {showAlert && (
          <div
            onClick={() => setDismissedAlertKey(alertKey)}
            title="Click to dismiss"
            style={{
              background: prioStyle.bg,
              color: prioStyle.fg,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px',
              cursor: 'pointer'
            }}
          >
            {alerts.items.map((item, i) => {
              const lineLabels = (item.affected_lines || []).map(formatLine).filter(Boolean);
              const stopLabels = (item.affected_stops || []).map(formatStop).filter(Boolean);
              return (
                <div key={item.id || i} style={{ marginBottom: i < alerts.items.length - 1 ? '8px' : 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>{item.title}</div>
                  {lineLabels.length > 0 && (
                    <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
                      Routes: {lineLabels.join(', ')}
                    </div>
                  )}
                  {stopLabels.length > 0 && (
                    <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
                      Stops: {stopLabels.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {data?.watchedStops?.map(stopId => {
          const stop = data.stops?.[stopId];
          const label = data.stopLabels?.[stopId] || stopId;
          const limit = data.panelLimit || 5;
          const deps = (stop?.data || []).slice(0, limit);
          const cache = stop?.cache;
          // Did any of today's buses survive the cutoff, or are we entirely filling from tomorrow?
          const todayStr = new Date().toDateString();
          const firstDepIsToday = deps[0]?.scheduled_at
            ? new Date(deps[0].scheduled_at).toDateString() === todayStr
            : false;
          const fallbackNote = deps.length > 0 && !firstDepIsToday
            ? `No more buses today — showing ${new Date(deps[0].scheduled_at).toLocaleDateString(undefined, { weekday: 'long' })}`
            : null;

          return (
            <div key={stopId} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{label}</div>
                {cache && (
                  <span style={{
                    fontSize: '10px',
                    color: cache.status === 'HIT' ? 'var(--success)' : 'var(--text-muted)',
                    background: 'var(--bg-card)',
                    padding: '2px 6px',
                    borderRadius: '3px'
                  }}>
                    {cache.status}{cache.age_s !== undefined ? ` ${cache.age_s}s` : ''}
                  </span>
                )}
              </div>
              {stop?.error ? (
                <div style={{ color: 'var(--error)', fontSize: '12px', padding: '6px' }}>
                  {stop.error}
                </div>
              ) : deps.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '6px' }}>
                  No departures in the next while.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {fallbackNote && (
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--warning)',
                      fontStyle: 'italic',
                      padding: '4px 8px',
                      marginBottom: '2px',
                      background: 'var(--bg-card)',
                      borderLeft: '2px solid var(--warning)',
                      borderRadius: '3px'
                    }}>
                      {fallbackNote}
                    </div>
                  )}
                  {deps.map((d, i) => {
                    const cancelled = d.cancelled === true;
                    const stale = d.stale === true;
                    return (
                      <div key={i} style={{
                        display: 'grid',
                        gridTemplateColumns: '52px 1fr auto auto',
                        gap: '8px',
                        alignItems: 'center',
                        padding: '6px 8px',
                        background: 'var(--bg-card)',
                        borderRadius: '4px',
                        opacity: cancelled ? 0.55 : (stale ? 0.7 : 1),
                        textDecoration: cancelled ? 'line-through' : 'none',
                        borderLeft: stale ? '2px solid var(--warning)' : 'none'
                      }} title={stale ? 'Scheduled fallback — realtime unavailable' : undefined}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-primary)' }}>
                          {d.route || d.line || '—'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.destination || d.direction || ''}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {formatTime(d.scheduled_at)}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: cancelled ? 'var(--error)' : 'var(--text-primary)', minWidth: '56px', textAlign: 'right' }}>
                          {cancelled ? 'CANCELLED' : formatMins(d.minutes_until)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
          {data?.attribution || 'Transport Information supplied by Translink Opendata API'}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
