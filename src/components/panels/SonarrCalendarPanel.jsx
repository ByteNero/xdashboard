import { useState, useEffect } from 'react';
import { Tv, Calendar, Clock, CheckCircle, Download, Eye } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import { sonarr } from '../../services/sonarr';
import { getProxiedUrl } from '../../services/proxy';
import PanelHeader from './PanelHeader';
import { getLabel } from '../../utils/translations';

const formatAirDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const episodeDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (episodeDay.getTime() === today.getTime()) return 'Today';
  if (episodeDay.getTime() === tomorrow.getTime()) return 'Tomorrow';

  const diff = Math.floor((episodeDay - today) / 86400000);
  if (diff < 0) {
    return diff === -1 ? 'Yesterday' : `${Math.abs(diff)}d ago`;
  }
  if (diff <= 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const StatusBadge = ({ episode }) => {
  if (episode.hasFile) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '8px', fontWeight: 600, padding: '2px 6px', borderRadius: '3px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
        <CheckCircle size={8} /> Available
      </span>
    );
  }
  if (episode.grabbed) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '8px', fontWeight: 600, padding: '2px 6px', borderRadius: '3px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
        <Download size={8} /> Downloading
      </span>
    );
  }
  const airDate = new Date(episode.airDateUtc);
  if (airDate <= new Date()) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '8px', fontWeight: 600, padding: '2px 6px', borderRadius: '3px', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
        <Eye size={8} /> Aired
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '8px', fontWeight: 600, padding: '2px 6px', borderRadius: '3px', background: 'rgba(100, 116, 139, 0.15)', color: 'var(--text-muted)' }}>
      <Clock size={8} /> Upcoming
    </span>
  );
};

const EpisodeCard = ({ episode }) => {
  const posterUrl = episode.poster ? getProxiedUrl(episode.poster) : null;

  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      padding: '8px',
      background: 'var(--bg-card)',
      borderRadius: '8px',
      borderLeft: `3px solid ${episode.hasFile ? '#22c55e' : episode.grabbed ? '#3b82f6' : new Date(episode.airDateUtc) <= new Date() ? '#eab308' : 'var(--border-color)'}`,
    }}>
      {posterUrl && (
        <img
          src={posterUrl}
          alt=""
          style={{
            width: '36px',
            height: '54px',
            objectFit: 'cover',
            borderRadius: '4px',
            flexShrink: 0,
            background: 'var(--bg-secondary)'
          }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {episode.seriesTitle}
          </div>
          <StatusBadge episode={episode} />
        </div>
        <div style={{ fontSize: '9px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          S{String(episode.seasonNumber).padStart(2, '0')}E{String(episode.episodeNumber).padStart(2, '0')} — {episode.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Calendar size={9} />
            {formatAirDate(episode.airDateUtc)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={9} />
            {formatTime(episode.airDateUtc)}
          </span>
          {episode.network && (
            <span style={{
              padding: '1px 5px',
              background: 'var(--bg-secondary)',
              borderRadius: '3px',
              fontSize: '8px',
              fontWeight: 600
            }}>
              {episode.network}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default function SonarrCalendarPanel({ config }) {
  const [data, setData] = useState({ connected: false, calendar: [] });
  const [filter, setFilter] = useState('upcoming');
  const [currentPage, setCurrentPage] = useState(0);
  const { settings } = useDashboardStore();
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  useEffect(() => {
    return sonarr.subscribe(setData);
  }, []);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const filtered = data.calendar.filter(ep => {
    const airDate = new Date(ep.airDateUtc);
    if (filter === 'upcoming') return airDate >= today;
    if (filter === 'recent') return airDate < today;
    return true;
  });

  const itemsPerPage = 6;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const handlePrev = () => setCurrentPage(p => p > 0 ? p - 1 : totalPages - 1);
  const handleNext = () => setCurrentPage(p => p < totalPages - 1 ? p + 1 : 0);

  const upcomingCount = data.calendar.filter(ep => new Date(ep.airDateUtc) >= today).length;
  const availableCount = data.calendar.filter(ep => ep.hasFile).length;

  if (!data.connected) {
    return (
      <div className="panel">
        <PanelHeader icon={Tv} title="TV Calendar" />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '14px' }}>
            <Tv size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>Connect Sonarr in Setup</div>
            <div style={{ fontSize: '11px', marginTop: '8px' }}>Shows upcoming episodes from your library</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <PanelHeader
        icon={Tv}
        title="TV Calendar"
        badge={upcomingCount > 0 && (
          <span style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', borderRadius: '4px', fontWeight: 600 }}>
            {upcomingCount} upcoming
          </span>
        )}
        currentPage={currentPage + 1}
        totalPages={totalPages}
        onPrev={handlePrev}
        onNext={handleNext}
        onRefresh={() => sonarr.fetchCalendar()}
      />

      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
          {[
            { key: 'upcoming', label: `Upcoming (${upcomingCount})` },
            { key: 'recent', label: `Aired (${data.calendar.length - upcomingCount})` },
            { key: 'all', label: `All (${data.calendar.length})` }
          ].map(tab => (
            <span
              key={tab.key}
              onClick={() => { setFilter(tab.key); setCurrentPage(0); }}
              style={{
                padding: '3px 8px',
                background: filter === tab.key ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: filter === tab.key ? '#000' : 'var(--text-muted)',
                borderRadius: '4px',
                fontSize: '9px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </span>
          ))}
        </div>

        {/* Episodes list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {paginated.length > 0 ? (
            paginated.map(ep => (
              <EpisodeCard key={ep.id} episode={ep} />
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '12px' }}>
              <Tv size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div>{filter === 'upcoming' ? 'No upcoming episodes' : 'No episodes found'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
