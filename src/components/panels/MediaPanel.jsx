import { useState, useEffect, useRef } from 'react';
import { Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Tv, Loader2, ChevronDown } from 'lucide-react';
import { homeAssistant } from '../../services';
import { useDashboardStore } from '../../store/dashboardStore';
import { getLabel } from '../../utils/translations';

export default function MediaPanel({ config }) {
  const [mediaPlayers, setMediaPlayers] = useState([]);
  const [activePlayer, setActivePlayer] = useState(config?.selectedPlayer || null);
  const [loading, setLoading] = useState(null);
  const [isConnected, setIsConnected] = useState(homeAssistant.isConnected());
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const { updatePanelConfig, settings } = useDashboardStore();
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  // Get configured players (if any)
  const configuredPlayers = config?.players || [];
  const showAllPlayers = configuredPlayers.length === 0;

  // Poll connection status
  useEffect(() => {
    const check = () => setIsConnected(homeAssistant.isConnected());
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, []);

  // Find and subscribe to media_player entities
  useEffect(() => {
    if (!isConnected) {
      setMediaPlayers([]);
      return;
    }

    const loadMediaPlayers = () => {
      let players = Object.entries(homeAssistant.entities)
        .filter(([id]) => id.startsWith('media_player.'))
        .map(([id, state]) => ({
          id,
          name: state.attributes?.friendly_name || id.split('.')[1].replace(/_/g, ' '),
          state: state.state,
          ...parseMediaAttributes(state)
        }));

      // Filter to configured players if specified
      if (!showAllPlayers) {
        players = players.filter(p => configuredPlayers.includes(p.id));
      }

      // Sort: playing first, then paused, then others
      players.sort((a, b) => {
        const order = { playing: 0, paused: 1, idle: 2, off: 3, unavailable: 4 };
        return (order[a.state] ?? 5) - (order[b.state] ?? 5);
      });

      setMediaPlayers(players);

      // Auto-select player logic
      const savedPlayer = config?.selectedPlayer;
      const playing = players.find(p => p.state === 'playing');

      if (playing) {
        setActivePlayer(playing.id);
      } else if (savedPlayer && players.find(p => p.id === savedPlayer)) {
        setActivePlayer(savedPlayer);
      } else if (players.length > 0 && !activePlayer) {
        setActivePlayer(players[0].id);
      }
    };

    loadMediaPlayers();

    // Subscribe to all media_player updates
    const mediaPlayerIds = Object.keys(homeAssistant.entities).filter(id => id.startsWith('media_player.'));
    const unsubscribes = mediaPlayerIds.map(id =>
      homeAssistant.subscribe(id, () => loadMediaPlayers())
    );

    return () => unsubscribes.forEach(unsub => unsub?.());
  }, [isConnected, configuredPlayers.join(','), showAllPlayers]);

  const parseMediaAttributes = (state) => {
    const attrs = state.attributes || {};
    let artwork = null;
    if (attrs.entity_picture) {
      if (attrs.entity_picture.startsWith('/')) {
        const haUrl = localStorage.getItem('ultrawide-dashboard-storage');
        if (haUrl) {
          try {
            const stored = JSON.parse(haUrl);
            const baseUrl = stored?.state?.integrations?.homeAssistant?.url;
            if (baseUrl) artwork = baseUrl.replace(/\/$/, '') + attrs.entity_picture;
          } catch (e) {}
        }
      } else if (attrs.entity_picture.startsWith('http')) {
        artwork = attrs.entity_picture;
      }
    }
    return {
      title: attrs.media_title || null,
      artist: attrs.media_artist || attrs.media_album_artist || null,
      album: attrs.media_album_name || null,
      artwork,
      duration: attrs.media_duration || 0,
      position: attrs.media_position || 0,
      volume: attrs.volume_level != null ? Math.round(attrs.volume_level * 100) : null,
      source: attrs.source || attrs.app_name || null,
      mediaType: attrs.media_content_type || null
    };
  };

  const handleControl = async (action) => {
    if (!isConnected || !activePlayer) return;
    setLoading(action);
    try {
      const service = {
        toggle: 'media_play_pause',
        play: 'media_play',
        pause: 'media_pause',
        next: 'media_next_track',
        previous: 'media_previous_track'
      }[action];
      if (service) {
        await homeAssistant.callService('media_player', service, { entity_id: activePlayer });
      }
    } catch (error) {
    } finally {
      setLoading(null);
    }
  };

  // Volume control
  const handleVolumeChange = async (newVolume) => {
    if (!isConnected || !activePlayer) return;
    try {
      await homeAssistant.callService('media_player', 'volume_set', {
        entity_id: activePlayer,
        volume_level: newVolume / 100
      });
    } catch (error) {
    }
  };

  // Seek control
  const handleSeek = async (position) => {
    if (!isConnected || !activePlayer || !currentPlayer?.duration) return;
    try {
      await homeAssistant.callService('media_player', 'media_seek', {
        entity_id: activePlayer,
        seek_position: position
      });
    } catch (error) {
    }
  };

  // Handle progress bar click for seeking
  const handleProgressClick = (e) => {
    if (!currentPlayer?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newPosition = Math.floor(percent * currentPlayer.duration);
    handleSeek(newPosition);
  };

  // Handle volume slider
  const handleVolumeSliderChange = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, Math.round((x / rect.width) * 100)));
    handleVolumeChange(percent);
  };

  const handlePlayerSelect = (playerId) => {
    setActivePlayer(playerId);
    updatePanelConfig('media', { selectedPlayer: playerId });
    setShowPlayerDropdown(false);
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentPlayer = mediaPlayers.find(p => p.id === activePlayer);
  const isPlaying = currentPlayer?.state === 'playing';
  const progressPercent = currentPlayer?.duration ? (currentPlayer.position / currentPlayer.duration) * 100 : 0;

  // Get status color
  const getStatusColor = (state) => {
    switch (state) {
      case 'playing': return 'var(--success)';
      case 'paused': return 'var(--warning)';
      default: return 'var(--text-muted)';
    }
  };

  // Not connected
  if (!isConnected) {
    return (
      <div className="panel">
        <div className="panel-header">
          <Music size={18} className="panel-icon" />
          <h2>{t('nowPlayingPanel')}</h2>
          <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--warning)', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Loader2 size={10} className="spin" /> {t('connecting')}
          </span>
        </div>
        <div className="panel-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            {t('waitingForHomeAssistant')}
          </div>
        </div>
        <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // No media players
  if (mediaPlayers.length === 0) {
    return (
      <div className="panel">
        <div className="panel-header">
          <Music size={18} className="panel-icon" />
          <h2>{t('nowPlayingPanel')}</h2>
        </div>
        <div className="panel-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            {t('noMediaPlayersFound')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ position: 'relative' }}>
      <div className="panel-header">
        <Music size={18} className="panel-icon" />
        <h2>{t('nowPlayingPanel')}</h2>
        {isPlaying && (
          <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--success)', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', background: 'var(--success)', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            {t('playing')}
          </span>
        )}
      </div>

      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Player selector dropdown - compact for many players */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowPlayerDropdown(!showPlayerDropdown)}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: getStatusColor(currentPlayer?.state),
                flexShrink: 0
              }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentPlayer?.name || t('selectPlayer')}
              </span>
              {currentPlayer?.state && currentPlayer.state !== 'playing' && (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  ({currentPlayer.state})
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {mediaPlayers.filter(p => p.state === 'playing').length > 0 &&
                  `${mediaPlayers.filter(p => p.state === 'playing').length} ${t('active')}`}
              </span>
              <ChevronDown size={14} style={{
                color: 'var(--text-muted)',
                transform: showPlayerDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }} />
            </div>
          </button>

          {/* Dropdown list */}
          {showPlayerDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              {mediaPlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => handlePlayerSelect(player.id)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: activePlayer === player.id ? 'var(--accent-glow)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border-color)',
                    color: activePlayer === player.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'left'
                  }}
                >
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: getStatusColor(player.state),
                    flexShrink: 0
                  }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.name}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {player.state}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main content area */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Artwork */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '8px',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {currentPlayer?.artwork ? (
              <img
                src={currentPlayer.artwork}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <Tv size={28} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            )}
          </div>

          {/* Track info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {currentPlayer?.title ? (
              <>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {currentPlayer.title}
                </div>
                {currentPlayer.artist && (
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {currentPlayer.artist}
                  </div>
                )}
                {currentPlayer.source && (
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--accent-primary)',
                    marginTop: '4px',
                    textTransform: 'uppercase'
                  }}>
                    {currentPlayer.source}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {currentPlayer?.state === 'off' ? t('playerOff') :
                 currentPlayer?.state === 'idle' ? t('idle') :
                 currentPlayer?.state === 'paused' ? t('paused') :
                 currentPlayer?.state === 'unavailable' ? t('unavailable') :
                 t('nothingPlayingShort')}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar - clickable for seeking */}
        {currentPlayer?.duration > 0 && (
          <div>
            <div
              onClick={handleProgressClick}
              style={{
                height: '6px',
                background: 'var(--bg-card)',
                borderRadius: '3px',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative'
              }}
              title="Click to seek"
            >
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'var(--accent-primary)',
                transition: 'width 0.3s ease',
                borderRadius: '3px'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatTime(currentPlayer.position)}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatTime(currentPlayer.duration)}</span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => handleControl('previous')}
            disabled={!currentPlayer}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: 'none',
              cursor: currentPlayer ? 'pointer' : 'not-allowed',
              opacity: currentPlayer ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)'
            }}
          >
            {loading === 'previous' ? <Loader2 size={16} className="spin" /> : <SkipBack size={16} />}
          </button>

          <button
            onClick={() => handleControl('toggle')}
            disabled={!currentPlayer}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              border: 'none',
              cursor: currentPlayer ? 'pointer' : 'not-allowed',
              opacity: currentPlayer ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              boxShadow: '0 2px 8px rgba(0, 255, 136, 0.3)'
            }}
          >
            {loading === 'toggle' ? (
              <Loader2 size={20} className="spin" />
            ) : isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />
            )}
          </button>

          <button
            onClick={() => handleControl('next')}
            disabled={!currentPlayer}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: 'none',
              cursor: currentPlayer ? 'pointer' : 'not-allowed',
              opacity: currentPlayer ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)'
            }}
          >
            {loading === 'next' ? <Loader2 size={16} className="spin" /> : <SkipForward size={16} />}
          </button>
        </div>

        {/* Volume - interactive slider */}
        {currentPlayer?.volume != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => handleVolumeChange(currentPlayer.volume > 0 ? 0 : 50)}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={currentPlayer.volume > 0 ? 'Mute' : 'Unmute'}
            >
              {currentPlayer.volume > 0 ? (
                <Volume2 size={14} style={{ color: 'var(--text-muted)' }} />
              ) : (
                <VolumeX size={14} style={{ color: 'var(--danger)' }} />
              )}
            </button>
            <div
              onClick={handleVolumeSliderChange}
              style={{
                flex: 1,
                height: '6px',
                background: 'var(--bg-card)',
                borderRadius: '3px',
                cursor: 'pointer',
                position: 'relative'
              }}
              title="Click to adjust volume"
            >
              <div style={{
                width: `${currentPlayer.volume}%`,
                height: '100%',
                background: currentPlayer.volume > 0 ? 'var(--accent-primary)' : 'var(--danger)',
                borderRadius: '3px',
                transition: 'width 0.1s ease'
              }} />
              {/* Thumb indicator */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: `${currentPlayer.volume}%`,
                transform: 'translate(-50%, -50%)',
                width: '12px',
                height: '12px',
                background: 'var(--accent-primary)',
                borderRadius: '50%',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                opacity: 0.9
              }} />
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', minWidth: '28px', textAlign: 'right' }}>
              {currentPlayer.volume}%
            </span>
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {showPlayerDropdown && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setShowPlayerDropdown(false)}
        />
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
