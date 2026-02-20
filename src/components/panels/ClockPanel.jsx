import { useState, useEffect } from 'react';
import { Clock as ClockIcon, Calendar, Globe } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';

export default function ClockPanel({ config }) {
  const [time, setTime] = useState(new Date());
  const [currentClockIndex, setCurrentClockIndex] = useState(0);
  const { integrations } = useDashboardStore();

  // Get clocks from config - default to local time if none configured
  const clocks = integrations.clocks && integrations.clocks.length > 0
    ? integrations.clocks.filter(c => c.enabled !== false)
    : [{ id: 'local', name: 'Local', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }];

  const totalClocks = clocks.length;
  const currentClock = clocks[currentClockIndex] || clocks[0];

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const format24h = config?.format === '24h';

  const formatTime = (timezone) => {
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: !format24h,
      timeZone: timezone
    };

    try {
      const formatted = new Intl.DateTimeFormat('en-US', options).format(time);
      const parts = formatted.split(/[:\s]/);

      if (format24h) {
        return {
          hours: parts[0],
          minutes: parts[1],
          seconds: parts[2],
          period: ''
        };
      } else {
        return {
          hours: parts[0],
          minutes: parts[1],
          seconds: parts[2],
          period: parts[3] || ''
        };
      }
    } catch (e) {
      // Fallback for invalid timezone
      const hours = time.getHours();
      return {
        hours: (format24h ? hours : hours % 12 || 12).toString().padStart(2, '0'),
        minutes: time.getMinutes().toString().padStart(2, '0'),
        seconds: time.getSeconds().toString().padStart(2, '0'),
        period: format24h ? '' : (hours >= 12 ? 'PM' : 'AM')
      };
    }
  };

  const formatDate = (timezone) => {
    const options = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: timezone
    };
    try {
      return time.toLocaleDateString('en-GB', options);
    } catch (e) {
      return time.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  const handlePrev = () => setCurrentClockIndex(i => i > 0 ? i - 1 : totalClocks - 1);
  const handleNext = () => setCurrentClockIndex(i => i < totalClocks - 1 ? i + 1 : 0);

  const { hours, minutes, seconds, period } = formatTime(currentClock.timezone);
  const nextEvent = config?.nextEvent;

  return (
    <div className="panel">
      <PanelHeader
        icon={ClockIcon}
        title={currentClock.name || 'Clock'}
        currentPage={currentClockIndex + 1}
        totalPages={totalClocks}
        onPrev={handlePrev}
        onNext={handleNext}
      />
      <div className="panel-content">
        <div className="clock-main">
          <div className="clock-time" style={{ fontSize: 'var(--clock-size, 64px)' }}>
            {hours}:{minutes}
            <span className="clock-seconds" style={{ fontSize: 'var(--clock-seconds-size, 32px)' }}>:{seconds}</span>
            {period && (
              <span style={{
                fontSize: 'calc(var(--clock-size, 64px) * 0.35)',
                marginLeft: '8px',
                color: 'var(--text-muted)'
              }}>
                {period}
              </span>
            )}
          </div>

          {config?.showDate !== false && (
            <div className="clock-date" style={{ fontSize: 'var(--clock-date-size, 16px)' }}>
              {formatDate(currentClock.timezone)}
            </div>
          )}

          {totalClocks > 1 && currentClock.timezone && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <Globe size={12} />
              <span>{currentClock.timezone.replace(/_/g, ' ')}</span>
            </div>
          )}

          {config?.showNextEvent && nextEvent && (
            <div className="clock-event">
              <div className="clock-event-label">
                <Calendar size={12} style={{
                  display: 'inline',
                  marginRight: '6px',
                  verticalAlign: 'middle'
                }} />
                Next Event
              </div>
              <div className="clock-event-title">{nextEvent.title}</div>
              <div className="clock-event-time">{nextEvent.time}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
