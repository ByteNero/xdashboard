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
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
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

  return (
    <div className="panel">
      <PanelHeader
        icon={Bus}
        title="BUS NI"
        onRefresh={() => busni.fetchAll()}
        badge={showAlert && (
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
        )}
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
            {alerts.items.map((item, i) => (
              <div key={item.id || i} style={{ marginBottom: i < alerts.items.length - 1 ? '8px' : 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '700' }}>{item.title}</div>
                {item.affected_lines?.length > 0 && (
                  <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
                    Routes: {item.affected_lines.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {data?.watchedStops?.map(stopId => {
          const stop = data.stops?.[stopId];
          const label = data.stopLabels?.[stopId] || stopId;
          const deps = stop?.data || [];
          const cache = stop?.cache;

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
                  {deps.map((d, i) => {
                    const cancelled = d.cancelled === true;
                    const timetableOnly = d.is_realtime_tracked === false;
                    return (
                      <div key={i} style={{
                        display: 'grid',
                        gridTemplateColumns: '52px 1fr auto auto',
                        gap: '8px',
                        alignItems: 'center',
                        padding: '6px 8px',
                        background: 'var(--bg-card)',
                        borderRadius: '4px',
                        opacity: cancelled ? 0.55 : (timetableOnly ? 0.75 : 1),
                        textDecoration: cancelled ? 'line-through' : 'none'
                      }}>
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
