import { useState, useEffect, useCallback } from 'react';
import { Film, Tv, Book, Bell, Clock, Check, X, ChevronLeft, ChevronRight, Loader2, Calendar, Star } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';
import { getLabel } from '../../utils/translations';

// Tab definitions - labels will be translated at render time
const TAB_DEFINITIONS = [
  { id: 'overseerr', labelKey: 'requests', icon: Bell },
  { id: 'radarr', labelKey: 'movies', icon: Film },
  { id: 'sonarr', labelKey: 'shows', icon: Tv },
  { id: 'readarr', labelKey: 'books', icon: Book },
];

// Format date relative
const formatRelativeDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) {
    const absDays = Math.abs(days);
    if (absDays === 0) return 'Today';
    if (absDays === 1) return 'Yesterday';
    if (absDays < 7) return `${absDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// Status badge component
const StatusBadge = ({ status }) => {
  const colors = {
    pending: { bg: 'var(--warning)', text: '#000' },
    approved: { bg: 'var(--success)', text: '#000' },
    available: { bg: 'var(--accent-primary)', text: '#000' },
    declined: { bg: 'var(--danger)', text: '#fff' },
    processing: { bg: 'var(--accent-secondary)', text: '#000' },
    partial: { bg: '#8b5cf6', text: '#fff' },
    upcoming: { bg: 'var(--warning)', text: '#000' },
    wanted: { bg: 'var(--danger)', text: '#fff' },
    complete: { bg: 'var(--success)', text: '#000' },
    'in progress': { bg: 'var(--accent-secondary)', text: '#000' },
    downloading: { bg: 'var(--accent-secondary)', text: '#000' },
    grabbed: { bg: 'var(--warning)', text: '#000' },
    downloaded: { bg: 'var(--success)', text: '#000' },
    awaiting: { bg: 'var(--text-muted)', text: '#fff' },
    new: { bg: 'var(--accent-primary)', text: '#000' },
    missing: { bg: 'var(--danger)', text: '#fff' },
    requested: { bg: 'var(--accent-secondary)', text: '#000' },
  };
  const style = colors[status?.toLowerCase()] || colors.pending;

  return (
    <span style={{
      fontSize: '8px',
      fontWeight: '600',
      textTransform: 'uppercase',
      padding: '2px 6px',
      borderRadius: '4px',
      background: style.bg,
      color: style.text,
      letterSpacing: '0.5px'
    }}>
      {status}
    </span>
  );
};

// Media card component
const MediaCard = ({ item, type }) => {
  const poster = item.posterUrl || item.remotePoster || item.images?.find(i => i.coverType === 'poster')?.remoteUrl;

  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      padding: '8px',
      background: 'var(--bg-card)',
      borderRadius: '8px',
      borderLeft: `3px solid ${type === 'movie' ? 'var(--warning)' : type === 'show' ? 'var(--accent-primary)' : 'var(--success)'}`
    }}>
      {poster && (
        <img
          src={poster}
          alt=""
          style={{
            width: '45px',
            height: '65px',
            objectFit: 'cover',
            borderRadius: '4px',
            flexShrink: 0
          }}
          onError={(e) => e.target.style.display = 'none'}
        />
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: item.subtitle ? '1px' : '3px'
        }}>
          {item.title || item.name}
        </div>
        {item.subtitle && (
          <div style={{
            fontSize: '10px',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: '3px'
          }}>
            {item.subtitle}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {item.year && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.year}</span>
          )}
          {item.status && <StatusBadge status={item.status} />}
          {item.airDate && (
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Calendar size={9} />
              {formatRelativeDate(item.airDate)}
            </span>
          )}
          {item.added && (
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={9} />
              {formatRelativeDate(item.added)}
            </span>
          )}
          {item.requestedBy && (
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
              by {item.requestedBy}
            </span>
          )}
        </div>
        {item.overview && (
          <div style={{
            fontSize: '9px',
            color: 'var(--text-muted)',
            marginTop: '4px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {item.overview}
          </div>
        )}
      </div>
    </div>
  );
};

export default function ArrPanel({ config }) {
  const [activeTab, setActiveTab] = useState('overseerr');
  const [subTab, setSubTab] = useState({ overseerr: 'requests', radarr: 'recent', sonarr: 'recent' }); // Sub-tabs
  const [data, setData] = useState({
    overseerr: { requests: [], requested: [], available: [] },
    radarr: { recent: [], missing: [] },
    sonarr: { recent: [], missing: [] },
    readarr: []
  });
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const { integrations, settings } = useDashboardStore();
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  const arrConfig = integrations.arr || {};

  // Build TABS with translated labels
  const TABS = TAB_DEFINITIONS.map(tab => ({
    ...tab,
    label: t(tab.labelKey)
  }));

  // Filter tabs to only show configured services
  const availableTabs = TABS.filter(tab => {
    const cfg = arrConfig[tab.id];
    return cfg?.enabled && cfg?.url && cfg?.apiKey;
  });

  // Set first available tab as active if current is not available
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  // Fetch data for a specific service
  const fetchService = useCallback(async (service) => {
    const cfg = arrConfig[service];
    if (!cfg?.enabled || !cfg?.url || !cfg?.apiKey) return;

    setLoading(prev => ({ ...prev, [service]: true }));
    setErrors(prev => ({ ...prev, [service]: null }));

    try {
      let items = [];
      const baseUrl = cfg.url.replace(/\/$/, '');
      const headers = { 'X-Api-Key': cfg.apiKey };

      if (service === 'overseerr') {
        // Fetch requests - use proxy in dev mode to bypass CORS
        try {
          const apiUrl = `${baseUrl}/api/v1/request?take=20&skip=0&sort=added`;
          const fetchUrl = `/api/proxy?url=${encodeURIComponent(apiUrl)}&apiKey=${encodeURIComponent(cfg.apiKey)}`;
          const overseerrHeaders = { 'Accept': 'application/json' };

          const res = await fetch(fetchUrl, { headers: overseerrHeaders });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();

          // Overseerr request status: 1=PENDING APPROVAL, 2=APPROVED, 3=DECLINED
          // Overseerr media status: 1=UNKNOWN, 2=PENDING, 3=PROCESSING, 4=PARTIALLY_AVAILABLE, 5=AVAILABLE
          const requests = [];   // Pending approval (r.status === 1)
          const requested = [];  // Approved but not yet available (r.status === 2 && media not available)
          const available = [];  // Available to watch (media.status === 5 or 4)

          for (const r of (json.results || [])) {
            const mediaInfo = r.media || {};
            const tmdbId = mediaInfo.tmdbId;
            let title = 'Unknown';
            let year = null;
            let posterPath = mediaInfo.posterPath;

            // Fetch from TMDB via Overseerr to get title
            if (tmdbId) {
              try {
                const mediaType = r.type === 'movie' ? 'movie' : 'tv';
                const mediaApiUrl = `${baseUrl}/api/v1/${mediaType}/${tmdbId}`;
                const mediaFetchUrl = `/api/proxy?url=${encodeURIComponent(mediaApiUrl)}&apiKey=${encodeURIComponent(cfg.apiKey)}`;
                const mediaRes = await fetch(mediaFetchUrl, { headers: overseerrHeaders });
                if (mediaRes.ok) {
                  const mediaData = await mediaRes.json();
                  title = mediaData.title || mediaData.name || title;
                  year = (mediaData.releaseDate || mediaData.firstAirDate)?.substring(0, 4);
                  posterPath = posterPath || mediaData.posterPath;
                }
              } catch (e) {
                console.warn('Failed to fetch media details:', e);
              }
            }

            // Debug log
            console.log(`[Overseerr] ${title}: request.status=${r.status}, media.status=${mediaInfo.status}`);

            let status = 'Pending';
            let bucket = 'requests';

            // First check media availability (this takes priority)
            const mediaStatus = mediaInfo.status;
            if (mediaStatus === 5) {
              status = 'Available';
              bucket = 'available';
            } else if (mediaStatus === 4) {
              status = 'Partial';
              bucket = 'available';
            } else if (r.status === 1) {
              // Request pending approval
              status = 'Pending';
              bucket = 'requests';
            } else if (r.status === 2) {
              // Approved but not yet available
              status = 'Requested';
              bucket = 'requested';
            } else if (r.status === 3) {
              status = 'Declined';
              bucket = 'requests';
            }

            const item = {
              id: r.id,
              title,
              posterUrl: posterPath ? `https://image.tmdb.org/t/p/w200${posterPath}` : null,
              status,
              year,
              type: r.type === 'movie' ? 'movie' : 'show',
              added: r.createdAt,
              requestedBy: r.requestedBy?.displayName || r.requestedBy?.email?.split('@')[0]
            };

            if (bucket === 'requests') requests.push(item);
            else if (bucket === 'requested') requested.push(item);
            else available.push(item);
          }

          console.log(`[Overseerr] Sorted: ${requests.length} requests, ${requested.length} requested, ${available.length} available`);

          setData(prev => ({
            ...prev,
            overseerr: { requests, requested, available }
          }));
          return;
        } catch (e) {
          if (e.message.includes('NetworkError') || e.name === 'TypeError') {
            throw new Error('CORS blocked. Use a reverse proxy or enable CORS in Overseerr settings.');
          }
          throw e;
        }
      } else if (service === 'radarr') {
        // Fetch movies
        const moviesRes = await fetch(`${baseUrl}/api/v3/movie`, { headers });
        const movies = moviesRes.ok ? await moviesRes.json() : [];

        const now = new Date();
        const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

        // Recent = movies added in last 48 hours
        const recentMovies = movies
          .filter(m => new Date(m.added) >= cutoff48h)
          .sort((a, b) => new Date(b.added) - new Date(a.added))
          .slice(0, 8)
          .map(m => ({
            id: m.id,
            title: m.title,
            year: m.year,
            posterUrl: m.images?.find(i => i.coverType === 'poster')?.remoteUrl,
            added: m.added,
            status: m.hasFile ? 'Available' : 'Wanted',
            type: 'movie'
          }));

        // Missing = monitored movies without files
        const missingMovies = movies
          .filter(m => m.monitored && !m.hasFile)
          .sort((a, b) => {
            const dateA = new Date(a.added || '1970');
            const dateB = new Date(b.added || '1970');
            return dateB - dateA; // Most recently added first
          })
          .slice(0, 8)
          .map(m => ({
            id: m.id,
            title: m.title,
            year: m.year,
            posterUrl: m.images?.find(i => i.coverType === 'poster')?.remoteUrl,
            added: m.added,
            status: 'Missing',
            type: 'movie'
          }));

        setData(prev => ({
          ...prev,
          radarr: { recent: recentMovies, missing: missingMovies }
        }));
        return;
      } else if (service === 'sonarr') {
        // Fetch series, history, and wanted/missing
        const [seriesRes, historyRes, wantedRes] = await Promise.all([
          fetch(`${baseUrl}/api/v3/series`, { headers }),
          fetch(`${baseUrl}/api/v3/history?pageSize=30&sortKey=date&sortDirection=descending&includeSeries=true&includeEpisode=true`, { headers }),
          fetch(`${baseUrl}/api/v3/wanted/missing?pageSize=15&sortKey=airDateUtc&sortDirection=descending&includeSeries=true`, { headers })
        ]);

        const series = seriesRes.ok ? await seriesRes.json() : [];
        const history = historyRes.ok ? await historyRes.json() : { records: [] };
        const wanted = wantedRes.ok ? await wantedRes.json() : { records: [] };

        // Build series lookup
        const seriesMap = {};
        series.forEach(s => { seriesMap[s.id] = s; });

        // Recent = only downloaded episodes (not grabbed), deduped
        const seenEpisodeIds = new Set();
        const recentEpisodes = (history.records || [])
          .filter(h => h.eventType === 'downloadFolderImported')
          .filter(h => {
            const key = `${h.seriesId}-${h.episodeId}`;
            if (seenEpisodeIds.has(key)) return false;
            seenEpisodeIds.add(key);
            return true;
          })
          .slice(0, 8)
          .map(h => {
            const seriesInfo = h.series || seriesMap[h.seriesId];
            const ep = h.episode || {};
            const seasonNum = String(ep.seasonNumber || 0).padStart(2, '0');
            const episodeNum = String(ep.episodeNumber || 0).padStart(2, '0');

            return {
              id: h.id,
              title: seriesInfo?.title || 'Unknown Show',
              subtitle: `S${seasonNum}E${episodeNum}${ep.title ? ` - ${ep.title}` : ''}`,
              posterUrl: seriesInfo?.images?.find(i => i.coverType === 'poster')?.remoteUrl,
              added: h.date,
              status: 'Downloaded',
              type: 'show'
            };
          });

        // Missing = episodes that are wanted but not downloaded
        const missingEpisodes = (wanted.records || [])
          .slice(0, 8)
          .map(ep => {
            const seriesInfo = ep.series || seriesMap[ep.seriesId];
            const seasonNum = String(ep.seasonNumber || 0).padStart(2, '0');
            const episodeNum = String(ep.episodeNumber || 0).padStart(2, '0');

            return {
              id: ep.id,
              title: seriesInfo?.title || 'Unknown Show',
              subtitle: `S${seasonNum}E${episodeNum}${ep.title ? ` - ${ep.title}` : ''}`,
              posterUrl: seriesInfo?.images?.find(i => i.coverType === 'poster')?.remoteUrl,
              airDate: ep.airDateUtc,
              status: 'Missing',
              type: 'show'
            };
          });

        setData(prev => ({
          ...prev,
          sonarr: { recent: recentEpisodes, missing: missingEpisodes }
        }));
        return;
      } else if (service === 'readarr') {
        // Fetch recently added books
        const res = await fetch(`${baseUrl}/api/v1/book?sortKey=added&sortDirection=descending`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const books = await res.json();

        items = books.slice(0, 8).map(b => ({
          id: b.id,
          title: b.title,
          year: b.releaseDate?.substring(0, 4),
          posterUrl: b.images?.find(i => i.coverType === 'cover')?.remoteUrl,
          added: b.added,
          status: b.statistics?.bookFileCount > 0 ? 'Available' : 'Wanted',
          overview: b.author?.authorName,
          type: 'book'
        }));
      }

      // For readarr, set items directly
      if (service === 'readarr') {
        setData(prev => ({ ...prev, [service]: items }));
      }
    } catch (err) {
      console.error(`[Arr] Error fetching ${service}:`, err);
      setErrors(prev => ({ ...prev, [service]: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, [service]: false }));
    }
  }, [arrConfig]);

  // Fetch all configured services
  useEffect(() => {
    availableTabs.forEach(tab => fetchService(tab.id));

    const interval = setInterval(() => {
      availableTabs.forEach(tab => fetchService(tab.id));
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [availableTabs.map(t => t.id).join(','), fetchService]);

  const isConfigured = availableTabs.length > 0;

  if (!isConfigured) {
    return (
      <div className="panel">
        <PanelHeader icon={Film} title={t('media')} />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '14px' }}>
            <Film size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>{t('configureArrInSetup')}</div>
            <div style={{ fontSize: '11px', marginTop: '8px' }}>{t('arrServices')}</div>
          </div>
        </div>
      </div>
    );
  }

  const currentTabIndex = availableTabs.findIndex(t => t.id === activeTab);
  const currentTab = availableTabs[currentTabIndex >= 0 ? currentTabIndex : 0];
  const currentLoading = loading[currentTab?.id];
  const currentError = errors[currentTab?.id];

  // Get current data - handle sub-tabs for overseerr/radarr/sonarr
  const getCurrentData = () => {
    const tabId = currentTab?.id;
    if (tabId === 'overseerr' || tabId === 'radarr' || tabId === 'sonarr') {
      const tabData = data[tabId];
      const currentSubTab = subTab[tabId];
      return tabData?.[currentSubTab] || [];
    }
    return data[tabId] || [];
  };
  const currentData = getCurrentData();
  const hasSubTabs = currentTab?.id === 'overseerr' || currentTab?.id === 'radarr' || currentTab?.id === 'sonarr';

  // Navigation handlers for main tabs
  const handlePrevTab = () => {
    const newIndex = currentTabIndex > 0 ? currentTabIndex - 1 : availableTabs.length - 1;
    setActiveTab(availableTabs[newIndex].id);
  };
  const handleNextTab = () => {
    const newIndex = currentTabIndex < availableTabs.length - 1 ? currentTabIndex + 1 : 0;
    setActiveTab(availableTabs[newIndex].id);
  };

  return (
    <div className="panel">
      <PanelHeader
        icon={currentTab?.icon || Film}
        title={currentTab?.label || 'Media'}
        currentPage={currentTabIndex + 1}
        totalPages={availableTabs.length}
        onPrev={handlePrevTab}
        onNext={handleNextTab}
      >
        {currentLoading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
      </PanelHeader>

      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', padding: '4px', background: 'var(--bg-secondary)', borderRadius: '8px', flexShrink: 0 }}>
          {availableTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '8px 4px',
                  background: isActive ? 'var(--accent-glow)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
                  borderRadius: '6px',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={12} />
                <span style={{ display: availableTabs.length > 3 ? 'none' : 'inline' }}>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-tabs for Overseerr/Radarr/Sonarr */}
        {hasSubTabs && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexShrink: 0 }}>
            {(currentTab.id === 'overseerr'
              ? [
                  { id: 'requests', label: 'Requests', icon: Clock },
                  { id: 'requested', label: 'Requested', icon: Loader2 },
                  { id: 'available', label: 'Available', icon: Check }
                ]
              : [
                  { id: 'recent', label: 'Recent', icon: Clock },
                  { id: 'missing', label: 'Missing', icon: X }
                ]
            ).map(st => {
              const Icon = st.icon;
              const isActive = subTab[currentTab.id] === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setSubTab(prev => ({ ...prev, [currentTab.id]: st.id }))}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '6px 8px',
                    background: isActive ? 'var(--bg-card)' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--border-color)' : 'transparent'}`,
                    borderRadius: '4px',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icon size={10} />
                  {st.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {currentError && (
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '6px', fontSize: '11px', color: 'var(--danger)' }}>
              Error: {currentError}
            </div>
          )}

          {currentData.length > 0 ? (
            currentData.map((item, i) => (
              <MediaCard key={item.id || i} item={item} type={item.type} />
            ))
          ) : !currentLoading && !currentError ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '12px' }}>
              {t('noItemsToDisplay')}
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
