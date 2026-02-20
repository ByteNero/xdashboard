import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { uptimeKuma } from '../../services';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';
import { getLabel } from '../../utils/translations';

export default function UptimeKumaPanel({ config }) {
  const [services, setServices] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const { connectionStatus, settings } = useDashboardStore();

  // Dynamic items per page based on panel height (~52px per service row)
  const panelH = settings?.panelHeight && settings.panelHeight !== 'auto'
    ? parseInt(settings.panelHeight) : window.innerHeight;
  const ITEMS_PER_PAGE = Math.max(6, Math.floor((panelH - 130) / 52));
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);
  const isConnected = connectionStatus.uptimeKuma?.connected;

  const sortedServices = [...services].sort((a, b) => {
    if (a.status === 'down' && b.status !== 'down') return -1;
    if (a.status !== 'down' && b.status === 'down') return 1;
    return 0;
  });
  const totalPages = Math.ceil(sortedServices.length / ITEMS_PER_PAGE);
  const paginatedServices = sortedServices.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  useEffect(() => {
    if (!isConnected) {
      setServices([]);
      return;
    }

    // Load initial data
    const initial = uptimeKuma.getMonitors();
    if (initial.length > 0) {
      setServices(initial);
    }

    const unsubscribe = uptimeKuma.subscribe((monitors) => {
      setServices(monitors);
    });

    return () => unsubscribe();
  }, [isConnected]);

  const getUptimeClass = (uptime) => {
    if (uptime >= 99.9) return '';
    if (uptime >= 99) return 'warning';
    return 'danger';
  };

  const totalUp = services.filter(s => s.status === 'up').length;
  const totalDown = services.filter(s => s.status === 'down').length;

  const handlePrev = () => setCurrentPage(p => p > 0 ? p - 1 : totalPages - 1);
  const handleNext = () => setCurrentPage(p => p < totalPages - 1 ? p + 1 : 0);

  return (
    <div className="panel">
      <PanelHeader
        icon={Activity}
        title={t('services')}
        currentPage={currentPage + 1}
        totalPages={totalPages}
        onPrev={handlePrev}
        onNext={handleNext}
        badge={!isConnected && (
          <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px' }}>
            {t('notConnected')}
          </span>
        )}
      />
      <div className="panel-content">
        {isConnected && services.length > 0 && (
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <div className="status-dot up"></div>
              <span>{totalUp} {t('online')}</span>
            </div>
            {totalDown > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <div className="status-dot down"></div>
                <span>{totalDown} {t('offline')}</span>
              </div>
            )}
          </div>
        )}

        {services.length > 0 ? (
          <div className="uptime-list">
            {paginatedServices.map((service, index) => (
              <div
                key={service.id || index}
                className={`uptime-item ${service.status === 'down' ? 'service-down-blink' : ''}`}
                style={service.status === 'down' ? {
                  animation: 'blink-red 1s ease-in-out infinite',
                  borderRadius: '6px'
                } : undefined}
              >
                <div className={`status-dot ${service.status}`}></div>
                <span className="service-name">{service.name}</span>
                <div className="service-stats">
                  <span className={`uptime-value ${getUptimeClass(service.uptime)}`}>
                    {typeof service.uptime === 'number' ? service.uptime.toFixed(1) : service.uptime}%
                  </span>
                  <span>{service.ping !== null ? `${service.ping}ms` : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '14px' }}>
            {isConnected ? t('noMonitors') : t('connectUptimeKuma')}
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink-red {
          0%, 100% {
            background: rgba(239, 68, 68, 0.1);
          }
          50% {
            background: rgba(239, 68, 68, 0.4);
          }
        }
      `}</style>
    </div>
  );
}
