import { useState, useEffect } from 'react';
import { Tv, Clock, Plus, Loader2, Play, User, Monitor, Smartphone, Tablet, BarChart3, Film, Music, Users } from 'lucide-react';
import { tautulli } from '../../services';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';
import { getLabel } from '../../utils/translations';

// Get icon for device type
const getDeviceIcon = (platform, product) => {
  const p = (platform || product || '').toLowerCase();
  if (p.includes('android') || p.includes('ios') || p.includes('iphone')) return Smartphone;
  if (p.includes('ipad') || p.includes('tablet')) return Tablet;
  return Monitor;
};

const ITEMS_PER_PAGE = {
  activity: 6, // Compact but readable
  recent: 12, // 3 rows x 4 columns
  history: 8
};

export default function TautulliPanel({ config }) {
  const [data, setData] = useState({ activity: null, recentlyAdded: [], history: [], stats: null });
  const { connectionStatus, settings } = useDashboardStore();
  const [isConnected, setIsConnected] = useState(tautulli.isConnected());
  const [currentPage, setCurrentPage] = useState({ activity: 0, recent: 0, history: 0 });
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  // Config for which tabs to show
  const showActivity = config?.showActivity === true;
  const showRecent = config?.showRecent !== false;
  const showHistory = config?.showHistory !== false;
  const showStats = config?.showStats === true;

  // Determine available tabs based on config
  const availableTabs = [];
  if (showActivity) availableTabs.push({ id: 'activity', label: t('nowPlaying'), icon: Play });
  if (showRecent) availableTabs.push({ id: 'recent', label: t('recentlyAdded'), icon: Plus });
  if (showHistory) availableTabs.push({ id: 'history', label: t('history'), icon: Clock });
  if (showStats) availableTabs.push({ id: 'stats', label: t('stats'), icon: BarChart3 });

  const [activeTab, setActiveTab] = useState(availableTabs[0]?.id || 'recent');

  useEffect(() => {
    const checkConnection = () => {
      const serviceConnected = tautulli.isConnected();
      const storeConnected = connectionStatus.tautulli?.connected;
      setIsConnected(serviceConnected || storeConnected);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 500);
    return () => clearInterval(interval);
  }, [connectionStatus.tautulli?.connected]);

  useEffect(() => {
    if (!isConnected) {
      setData({ activity: null, recentlyAdded: [], history: [] });
      return;
    }

    const unsubscribe = tautulli.subscribe((newData) => {
      setData(newData);
    });

    return () => unsubscribe();
  }, [isConnected]);

  useEffect(() => {
    if (!availableTabs.find(t => t.id === activeTab) && availableTabs.length > 0) {
      setActiveTab(availableTabs[0].id);
    }
  }, [showActivity, showRecent, showHistory, activeTab, availableTabs]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const isConnecting = connectionStatus.tautulli?.connecting;
  const streamCount = data.activity?.streamCount || 0;

  // Pagination helpers
  const getItems = () => {
    if (activeTab === 'activity') return data.activity?.streams || [];
    if (activeTab === 'recent') return data.recentlyAdded || [];
    if (activeTab === 'history') return data.history || [];
    return [];
  };

  const items = getItems();
  const perPage = ITEMS_PER_PAGE[activeTab] || 5;
  const totalPages = Math.ceil(items.length / perPage);
  const page = currentPage[activeTab] || 0;
  const paginatedItems = items.slice(page * perPage, (page + 1) * perPage);

  const handlePrev = () => setCurrentPage(p => ({ ...p, [activeTab]: p[activeTab] > 0 ? p[activeTab] - 1 : totalPages - 1 }));
  const handleNext = () => setCurrentPage(p => ({ ...p, [activeTab]: p[activeTab] < totalPages - 1 ? p[activeTab] + 1 : 0 }));

  if (!isConnected) {
    return (
      <div className="panel">
        <PanelHeader
          icon={Tv}
          title={t('plex')}
          badge={
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: isConnecting ? 'var(--warning)' : 'var(--text-muted)', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isConnecting ? (
                <><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> {t('connecting')}</>
              ) : t('notConnected')}
            </span>
          }
        />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px', fontSize: '14px' }}>
            {isConnecting ? t('waitingForTautulli') : t('connectTautulliInSetup')}
          </div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (availableTabs.length === 0) {
    return (
      <div className="panel">
        <PanelHeader icon={Tv} title={t('plex')} />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '13px' }}>
            Enable at least one tab in Settings
          </div>
        </div>
      </div>
    );
  }

  // Poster card for recently added - fixed size for consistent grid
  const PosterCard = ({ item }) => {
    const isEpisode = item.type === 'episode';
    const displayTitle = item.grandparentTitle || item.title;
    const episodeInfo = isEpisode && item.seasonNum && item.episodeNum
      ? `S${item.seasonNum}E${item.episodeNum}`
      : null;

    return (
      <div style={{ textAlign: 'center', width: '70px' }}>
        <div style={{
          width: '70px',
          height: '100px',
          borderRadius: '6px',
          overflow: 'hidden',
          background: 'var(--bg-card)',
          marginBottom: '4px',
          position: 'relative'
        }}>
          {item.thumb ? (
            <img
              src={item.thumb}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.parentElement.style.background = 'var(--bg-secondary)'; e.target.style.display = 'none'; }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tv size={20} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            </div>
          )}
          {episodeInfo && (
            <div style={{
              position: 'absolute',
              bottom: '4px',
              right: '4px',
              background: 'rgba(0,0,0,0.8)',
              padding: '2px 4px',
              borderRadius: '3px',
              fontSize: '8px',
              fontWeight: '600',
              color: '#fff'
            }}>
              {episodeInfo}
            </div>
          )}
        </div>
        <div style={{ fontSize: '9px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '70px' }}>
          {displayTitle}
        </div>
        {isEpisode && item.title && (
          <div style={{ fontSize: '8px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '70px' }}>
            {item.title}
          </div>
        )}
      </div>
    );
  };

  // Now Playing - compact but readable list format
  const StreamItem = ({ stream }) => {
    const DeviceIcon = getDeviceIcon(stream.platform, stream.product);
    const isPlaying = stream.state === 'playing';
    const isEpisode = stream.mediaType === 'episode';
    const episodeInfo = isEpisode && stream.parentMediaIndex && stream.mediaIndex
      ? `S${stream.parentMediaIndex}E${stream.episodeNum || stream.mediaIndex}`
      : null;

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 10px',
        background: 'var(--bg-card)',
        borderRadius: '6px',
        borderLeft: `3px solid ${isPlaying ? 'var(--success)' : 'var(--warning)'}`
      }}>
        {/* Status indicator */}
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isPlaying ? 'var(--success)' : 'var(--warning)',
          flexShrink: 0,
          boxShadow: isPlaying ? '0 0 6px var(--success)' : 'none'
        }} />

        {/* Title & episode info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {episodeInfo && <span style={{ color: 'var(--accent-primary)', marginRight: '6px' }}>{episodeInfo}</span>}
            {stream.grandparentTitle || stream.title}
          </div>
          {isEpisode && stream.title && (
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {stream.title}
            </div>
          )}
        </div>

        {/* User & device */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <User size={10} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stream.user}</span>
          <DeviceIcon size={10} style={{ color: 'var(--text-muted)' }} />
        </div>

        {/* Progress bar */}
        <div style={{ width: '60px', flexShrink: 0 }}>
          <div style={{ height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px' }}>
            <div style={{ width: `${stream.progress}%`, height: '100%', background: isPlaying ? 'var(--accent-primary)' : 'var(--warning)', borderRadius: '2px', transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: '8px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>
            {Math.round(stream.progress)}%
          </div>
        </div>
      </div>
    );
  };

  // History item
  const HistoryItem = ({ item }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 0',
      borderBottom: '1px solid var(--border-color)'
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.title}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {item.user}
        </div>
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
        {formatTime(item.watchedAt)}
      </div>
    </div>
  );

  return (
    <div className="panel tautulli-panel">
      <PanelHeader
        icon={Tv}
        title={t('plex')}
        currentPage={page + 1}
        totalPages={totalPages}
        onPrev={handlePrev}
        onNext={handleNext}
        badge={streamCount > 0 && (
          <span style={{
            background: 'var(--success)',
            color: '#000',
            padding: '2px 10px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Play size={10} fill="currentColor" />
            {streamCount}
          </span>
        )}
      />
      <div className="panel-content">
        {/* Tabs */}
        {availableTabs.length > 1 && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            {availableTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  background: activeTab === tab.id ? 'var(--accent-glow)' : 'var(--bg-card)',
                  border: `1px solid ${activeTab === tab.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <tab.icon size={12} />
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Now Playing - Compact but readable */}
        {activeTab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((stream, i) => (
                <StreamItem key={i} stream={stream} />
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '13px' }}>
                <Tv size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <div>{t('nothingPlaying')}</div>
              </div>
            )}
          </div>
        )}

        {/* Recently Added */}
        {activeTab === 'recent' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            justifyItems: 'center'
          }}>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item, i) => (
                <PosterCard key={i} item={item} />
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '30px', fontSize: '13px' }}>
                No recent additions
              </div>
            )}
          </div>
        )}

        {/* History */}
        {activeTab === 'history' && (
          <div>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item, i) => (
                <HistoryItem key={i} item={item} />
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px', fontSize: '13px' }}>
                {t('noHistory')}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {activeTab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.stats ? (
              <>
                {/* Library Totals */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <Film size={20} style={{ color: 'var(--accent-primary)', marginBottom: '4px' }} />
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {data.stats.totals.movies.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('movies')}</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <Tv size={20} style={{ color: 'var(--accent-primary)', marginBottom: '4px' }} />
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {data.stats.totals.shows.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('shows')}</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <Play size={20} style={{ color: 'var(--accent-primary)', marginBottom: '4px' }} />
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {data.stats.totals.episodes.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('episodes')}</div>
                  </div>
                </div>

                {/* Music stats if available */}
                {data.stats.totals.music > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <Music size={16} style={{ color: 'var(--accent-primary)', marginBottom: '2px' }} />
                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {data.stats.totals.music.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('artists')}</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <Music size={16} style={{ color: 'var(--accent-primary)', marginBottom: '2px' }} />
                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {data.stats.totals.albums.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('albums')}</div>
                    </div>
                  </div>
                )}

                {/* Top Users */}
                {data.stats.topUsers.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={12} /> {t('topUsers')} (30 {t('days')})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {data.stats.topUsers.map((user, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          background: 'var(--bg-card)',
                          borderRadius: '4px'
                        }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent-primary)', width: '16px' }}>
                            #{i + 1}
                          </span>
                          <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.user}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {user.plays} {t('plays')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Server Info */}
                {data.stats.serverInfo?.name && (
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
                    {data.stats.serverInfo.name} • v{data.stats.serverInfo.version}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px', fontSize: '13px' }}>
                <BarChart3 size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <div>{t('loadingStats')}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
