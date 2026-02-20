import { useState, useEffect, useCallback, useRef } from 'react';
import { Film, Tv, Calendar, Star, Clock, RefreshCw, ChevronLeft, ChevronRight, Check, AlertCircle, Loader2, PlusCircle, TrendingUp, Sparkles, Play, Radio } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';
import { getLabel } from '../../utils/translations';

// TMDB image base URL
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p';

// Source badge labels and styles
const SOURCE_CONFIG = {
  trending: { label: 'TRENDING', icon: TrendingUp, color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)' },
  popular: { label: 'POPULAR', icon: Sparkles, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.2)' },
  upcoming: { label: 'UPCOMING', icon: Calendar, color: '#00d4ff', bg: 'rgba(0, 212, 255, 0.2)' },
  now_playing: { label: 'NOW PLAYING', icon: Play, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.2)' },
  on_air: { label: 'ON AIR', icon: Radio, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' },
  trakt_trending: { label: 'TRAKT TRENDING', icon: TrendingUp, color: '#ed1c24', bg: 'rgba(237, 28, 36, 0.2)' },
  trakt_popular: { label: 'TRAKT POPULAR', icon: Sparkles, color: '#ed1c24', bg: 'rgba(237, 28, 36, 0.2)' },
  trakt_anticipated: { label: 'ANTICIPATED', icon: Calendar, color: '#ed1c24', bg: 'rgba(237, 28, 36, 0.2)' }
};

// Format date
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

// Format relative date
const formatRelativeDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((date - now) / (1000 * 60 * 60 * 24));

  if (diff < 0) return 'Released';
  if (diff === 0) return 'Today!';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7) return `In ${diff} days`;
  if (diff < 30) return `In ${Math.floor(diff / 7)} weeks`;
  return formatDate(dateStr);
};

// Rating badge
const RatingBadge = ({ rating }) => {
  if (!rating) return null;
  const color = rating >= 7 ? 'var(--success)' : rating >= 5 ? 'var(--warning)' : 'var(--danger)';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      padding: '2px 6px',
      background: `${color}20`,
      color: color,
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: '600'
    }}>
      <Star size={10} fill={color} />
      {rating.toFixed(1)}
    </span>
  );
};

// Media type badge
const TypeBadge = ({ type }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 6px',
    background: type === 'movie' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(99, 102, 241, 0.2)',
    color: type === 'movie' ? '#f97316' : '#6366f1',
    borderRadius: '4px',
    fontSize: '9px',
    fontWeight: '600',
    textTransform: 'uppercase'
  }}>
    {type === 'movie' ? <Film size={9} /> : <Tv size={9} />}
    {type}
  </span>
);

// Source badge (Trending, Upcoming, etc.)
const SourceBadge = ({ source }) => {
  const config = SOURCE_CONFIG[source];
  if (!config) return null;

  const Icon = config.icon;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 8px',
      background: config.bg,
      color: config.color,
      borderRadius: '4px',
      fontSize: '9px',
      fontWeight: '700',
      letterSpacing: '0.5px',
      textTransform: 'uppercase'
    }}>
      <Icon size={10} />
      {config.label}
    </span>
  );
};

// Status badge (for library status)
const StatusBadge = ({ inLibrary, available }) => {
  if (inLibrary && available) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '2px 6px',
        background: 'rgba(34, 197, 94, 0.2)',
        color: 'var(--success)',
        borderRadius: '4px',
        fontSize: '9px',
        fontWeight: '600'
      }}>
        <Check size={9} />
        In Library
      </span>
    );
  }
  if (inLibrary) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '2px 6px',
        background: 'rgba(234, 179, 8, 0.2)',
        color: 'var(--warning)',
        borderRadius: '4px',
        fontSize: '9px',
        fontWeight: '600'
      }}>
        <Clock size={9} />
        Monitored
      </span>
    );
  }
  return null; // Don't show badge if not in library - we'll show button instead
};

// Add to Library button
const AddToLibraryButton = ({ item, arrConfig, tmdbApiKey, onAdded }) => {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);

  const canAdd = item.media_type === 'movie'
    ? (arrConfig?.radarr?.enabled && arrConfig?.radarr?.url && arrConfig?.radarr?.apiKey)
    : (arrConfig?.sonarr?.enabled && arrConfig?.sonarr?.url && arrConfig?.sonarr?.apiKey);

  if (!canAdd || item.inLibrary) return null;

  const handleAdd = async (e) => {
    e.stopPropagation();
    setAdding(true);
    setError(null);

    try {
      if (item.media_type === 'movie') {
        // Add to Radarr
        const baseUrl = arrConfig.radarr.url.replace(/\/$/, '');

        // First get root folders and quality profiles
        const [rootFoldersRes, profilesRes] = await Promise.all([
          fetch(import.meta.env.DEV
            ? `/api/proxy?url=${encodeURIComponent(`${baseUrl}/api/v3/rootfolder`)}&apiKey=${arrConfig.radarr.apiKey}`
            : `${baseUrl}/api/v3/rootfolder?apikey=${arrConfig.radarr.apiKey}`
          ),
          fetch(import.meta.env.DEV
            ? `/api/proxy?url=${encodeURIComponent(`${baseUrl}/api/v3/qualityprofile`)}&apiKey=${arrConfig.radarr.apiKey}`
            : `${baseUrl}/api/v3/qualityprofile?apikey=${arrConfig.radarr.apiKey}`
          )
        ]);

        if (!rootFoldersRes.ok || !profilesRes.ok) throw new Error('Failed to get Radarr config');

        const rootFolders = await rootFoldersRes.json();
        const profiles = await profilesRes.json();

        if (!rootFolders.length || !profiles.length) throw new Error('No root folder or quality profile configured');

        // Add movie
        const addUrl = import.meta.env.DEV
          ? `/api/proxy?url=${encodeURIComponent(`${baseUrl}/api/v3/movie`)}&apiKey=${arrConfig.radarr.apiKey}`
          : `${baseUrl}/api/v3/movie?apikey=${arrConfig.radarr.apiKey}`;

        const addRes = await fetch(addUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tmdbId: item.id,
            title: item.title,
            qualityProfileId: profiles[0].id,
            rootFolderPath: rootFolders[0].path,
            monitored: true,
            addOptions: { searchForMovie: true }
          })
        });

        if (!addRes.ok) {
          const err = await addRes.json();
          throw new Error(err.message || 'Failed to add movie');
        }

        setAdded(true);
        if (onAdded) onAdded(item.id);

      } else {
        // Add to Sonarr - need to get TVDB ID first
        const extRes = await fetch(`https://api.themoviedb.org/3/tv/${item.id}/external_ids?api_key=${tmdbApiKey}`);
        if (!extRes.ok) throw new Error('Failed to get TVDB ID');
        const extIds = await extRes.json();

        if (!extIds.tvdb_id) throw new Error('No TVDB ID found for this show');

        const baseUrl = arrConfig.sonarr.url.replace(/\/$/, '');

        // Get root folders and quality profiles
        const [rootFoldersRes, profilesRes] = await Promise.all([
          fetch(import.meta.env.DEV
            ? `/api/proxy?url=${encodeURIComponent(`${baseUrl}/api/v3/rootfolder`)}&apiKey=${arrConfig.sonarr.apiKey}`
            : `${baseUrl}/api/v3/rootfolder?apikey=${arrConfig.sonarr.apiKey}`
          ),
          fetch(import.meta.env.DEV
            ? `/api/proxy?url=${encodeURIComponent(`${baseUrl}/api/v3/qualityprofile`)}&apiKey=${arrConfig.sonarr.apiKey}`
            : `${baseUrl}/api/v3/qualityprofile?apikey=${arrConfig.sonarr.apiKey}`
          )
        ]);

        if (!rootFoldersRes.ok || !profilesRes.ok) throw new Error('Failed to get Sonarr config');

        const rootFolders = await rootFoldersRes.json();
        const profiles = await profilesRes.json();

        if (!rootFolders.length || !profiles.length) throw new Error('No root folder or quality profile configured');

        // Add series
        const addUrl = import.meta.env.DEV
          ? `/api/proxy?url=${encodeURIComponent(`${baseUrl}/api/v3/series`)}&apiKey=${arrConfig.sonarr.apiKey}`
          : `${baseUrl}/api/v3/series?apikey=${arrConfig.sonarr.apiKey}`;

        const addRes = await fetch(addUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tvdbId: extIds.tvdb_id,
            title: item.name || item.title,
            qualityProfileId: profiles[0].id,
            rootFolderPath: rootFolders[0].path,
            monitored: true,
            seasonFolder: true,
            addOptions: { searchForMissingEpisodes: true }
          })
        });

        if (!addRes.ok) {
          const err = await addRes.json();
          throw new Error(err.message || 'Failed to add series');
        }

        setAdded(true);
        if (onAdded) onAdded(item.id);
      }
    } catch (err) {
      console.error('[Poster] Add failed:', err);
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setAdding(false);
    }
  };

  if (added) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 12px',
        background: 'var(--success)',
        color: '#000',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '600'
      }}>
        <Check size={12} />
        Added!
      </span>
    );
  }

  return (
    <button
      onClick={handleAdd}
      disabled={adding}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 12px',
        background: error ? 'var(--danger)' : 'var(--accent-primary)',
        color: '#000',
        border: 'none',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '600',
        cursor: adding ? 'wait' : 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      {adding ? (
        <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Adding...</>
      ) : error ? (
        <><AlertCircle size={12} /> {error}</>
      ) : (
        <><PlusCircle size={12} /> Add to {item.media_type === 'movie' ? 'Radarr' : 'Sonarr'}</>
      )}
    </button>
  );
};

// Full-panel poster card
const PosterCard = ({ item, displayMode, arrConfig, tmdbApiKey, onAdded, isActive, isExiting }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Choose image based on display mode
  const getImageUrl = () => {
    if (displayMode === 'poster') {
      return item.poster_path
        ? `${TMDB_IMG_BASE}/w780${item.poster_path}`
        : item.backdrop_path
          ? `${TMDB_IMG_BASE}/w1280${item.backdrop_path}`
          : null;
    }
    // Default: backdrop
    return item.backdrop_path
      ? `${TMDB_IMG_BASE}/w1280${item.backdrop_path}`
      : item.poster_path
        ? `${TMDB_IMG_BASE}/w780${item.poster_path}`
        : null;
  };

  const imageUrl = getImageUrl();
  const isPosterMode = displayMode === 'poster';

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'var(--bg-card)',
      overflow: 'hidden',
      opacity: isExiting ? 0 : 1,
      transform: isActive && !isExiting ? 'scale(1)' : 'scale(1.02)',
      transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
      zIndex: isExiting ? 1 : 2
    }}>
      {/* Background Image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          onLoad={() => setImageLoaded(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: isPosterMode ? 'center top' : 'center',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.5s ease'
          }}
        />
      )}

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: isPosterMode
          ? 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.8) 25%, transparent 50%)'
          : 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.5) 100%)'
      }} />

      {/* Content */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Source badge at top - but show library status if available */}
        <div style={{ marginBottom: '4px' }}>
          {item.inLibrary && item.available ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#22c55e',
              borderRadius: '4px',
              fontSize: '9px',
              fontWeight: '700',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              <Check size={10} />
              AVAILABLE
            </span>
          ) : item.inLibrary ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              background: 'rgba(234, 179, 8, 0.2)',
              color: '#eab308',
              borderRadius: '4px',
              fontSize: '9px',
              fontWeight: '700',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              <Clock size={10} />
              IN LIBRARY
            </span>
          ) : item.source ? (
            <SourceBadge source={item.source} />
          ) : null}
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <TypeBadge type={item.media_type} />
          <RatingBadge rating={item.vote_average} />
          {item.release_date && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '2px 6px',
              background: 'rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)',
              borderRadius: '4px',
              fontSize: '9px',
              fontWeight: '500'
            }}>
              <Calendar size={9} />
              {formatRelativeDate(item.release_date)}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: '700',
          color: '#fff',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          lineHeight: 1.2
        }}>
          {item.title || item.name}
        </h3>

        {/* Year and genres */}
        <div style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {item.release_date && (
            <span>{new Date(item.release_date).getFullYear()}</span>
          )}
          {item.genres && item.genres.length > 0 && (
            <>
              <span>•</span>
              <span>{item.genres.slice(0, 3).join(', ')}</span>
            </>
          )}
        </div>

        {/* Overview */}
        {item.overview && (
          <p style={{
            margin: 0,
            fontSize: '11px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            maxWidth: '90%'
          }}>
            {item.overview}
          </p>
        )}

        {/* Add to Library button */}
        {!item.inLibrary && (
          <div style={{ marginTop: '8px' }}>
            <AddToLibraryButton
              item={item}
              arrConfig={arrConfig}
              tmdbApiKey={tmdbApiKey}
              onAdded={onAdded}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Preload image utility
const preloadImage = (url) => {
  if (!url) return;
  const img = new Image();
  img.src = url;
};

export default function PosterPanel({ config }) {
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const { integrations, settings } = useDashboardStore();
  const lastRefreshRef = useRef(Date.now());
  const hasFetchedRef = useRef(false);
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  const posterConfig = integrations.poster || {};
  const tmdbApiKey = posterConfig.tmdbApiKey;
  const displayMode = posterConfig.displayMode || 'backdrop'; // 'backdrop' or 'poster'
  const sourcesKey = JSON.stringify(posterConfig.sources || ['upcoming', 'popular', 'trending']);

  // Genre map for TMDB
  const [genreMap, setGenreMap] = useState({});

  // Mark item as added
  const handleItemAdded = (itemId) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, inLibrary: true } : item
    ));
  };

  // Fetch genres
  const fetchGenres = useCallback(async () => {
    if (!tmdbApiKey) return;

    try {
      const [movieGenres, tvGenres] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${tmdbApiKey}`).then(r => r.json()),
        fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${tmdbApiKey}`).then(r => r.json())
      ]);

      const map = {};
      [...(movieGenres.genres || []), ...(tvGenres.genres || [])].forEach(g => {
        map[g.id] = g.name;
      });
      setGenreMap(map);
    } catch (e) {
      console.warn('[Poster] Failed to fetch genres:', e);
    }
  }, [tmdbApiKey]);

  // Check if item exists in Radarr/Sonarr
  const checkLibraryStatus = useCallback(async (items) => {
    const arr = integrations.arr || {};
    const checkedItems = [...items];

    console.log('[Poster] Checking library status...', {
      radarrEnabled: arr.radarr?.enabled,
      radarrUrl: arr.radarr?.url,
      sonarrEnabled: arr.sonarr?.enabled,
      sonarrUrl: arr.sonarr?.url,
      itemCount: items.length
    });

    // Check Radarr for movies
    if (arr.radarr?.enabled && arr.radarr?.url && arr.radarr?.apiKey) {
      try {
        const baseUrl = arr.radarr.url.replace(/\/$/, '');
        const proxyUrl = import.meta.env.DEV
          ? `/api/proxy?url=${encodeURIComponent(`${baseUrl}/api/v3/movie`)}&apiKey=${arr.radarr.apiKey}`
          : `${baseUrl}/api/v3/movie?apikey=${arr.radarr.apiKey}`;

        console.log('[Poster] Fetching Radarr library...');
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const radarrMovies = await res.json();
          console.log(`[Poster] Radarr has ${radarrMovies.length} movies`);
          const tmdbIds = new Set(radarrMovies.map(m => m.tmdbId));

          let matchCount = 0;
          checkedItems.forEach(item => {
            if (item.media_type === 'movie' && tmdbIds.has(item.id)) {
              item.inLibrary = true;
              const radarrMovie = radarrMovies.find(m => m.tmdbId === item.id);
              item.available = radarrMovie?.hasFile || false;
              matchCount++;
            }
          });
          console.log(`[Poster] Found ${matchCount} movies in Radarr library`);
        } else {
          console.warn('[Poster] Radarr request failed:', res.status, await res.text());
        }
      } catch (e) {
        console.warn('[Poster] Radarr check failed:', e);
      }
    } else {
      console.log('[Poster] Radarr not configured or disabled');
    }

    // Check Sonarr for TV shows
    if (arr.sonarr?.enabled && arr.sonarr?.url && arr.sonarr?.apiKey) {
      try {
        const baseUrl = arr.sonarr.url.replace(/\/$/, '');
        const proxyUrl = import.meta.env.DEV
          ? `/api/proxy?url=${encodeURIComponent(`${baseUrl}/api/v3/series`)}&apiKey=${arr.sonarr.apiKey}`
          : `${baseUrl}/api/v3/series?apikey=${arr.sonarr.apiKey}`;

        console.log('[Poster] Fetching Sonarr library...');
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const sonarrShows = await res.json();
          console.log(`[Poster] Sonarr has ${sonarrShows.length} shows`);
          const tvdbIds = new Set(sonarrShows.map(s => s.tvdbId));

          // For TV shows, we need to get external IDs from TMDB
          let matchCount = 0;
          for (const item of checkedItems) {
            if (item.media_type === 'tv' && tmdbApiKey) {
              try {
                const extRes = await fetch(`https://api.themoviedb.org/3/tv/${item.id}/external_ids?api_key=${tmdbApiKey}`);
                if (extRes.ok) {
                  const extIds = await extRes.json();
                  if (tvdbIds.has(extIds.tvdb_id)) {
                    item.inLibrary = true;
                    const sonarrShow = sonarrShows.find(s => s.tvdbId === extIds.tvdb_id);
                    item.available = sonarrShow?.statistics?.percentOfEpisodes >= 50 || false;
                    matchCount++;
                  }
                }
              } catch (e) {
                // Ignore individual lookup failures
              }
            }
          }
          console.log(`[Poster] Found ${matchCount} shows in Sonarr library`);
        } else {
          console.warn('[Poster] Sonarr request failed:', res.status);
        }
      } catch (e) {
        console.warn('[Poster] Sonarr check failed:', e);
      }
    } else {
      console.log('[Poster] Sonarr not configured or disabled');
    }

    return checkedItems;
  }, [integrations.arr, tmdbApiKey]);

  // Fetch from Trakt API
  const fetchFromTrakt = useCallback(async (source) => {
    const traktClientId = posterConfig.traktClientId;
    if (!traktClientId || !tmdbApiKey) return [];

    const traktHeaders = encodeURIComponent(JSON.stringify({
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': traktClientId
    }));

    let traktUrl;
    switch (source) {
      case 'trakt_trending':
        traktUrl = 'https://api.trakt.tv/movies/trending?limit=20';
        break;
      case 'trakt_popular':
        traktUrl = 'https://api.trakt.tv/movies/popular?limit=20';
        break;
      case 'trakt_anticipated':
        traktUrl = 'https://api.trakt.tv/movies/anticipated?limit=20';
        break;
      default:
        return [];
    }

    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(traktUrl)}&headers=${traktHeaders}`);
      if (!res.ok) throw new Error('Trakt API error');

      const data = await res.json();
      const items = [];

      // Trakt returns different structure, need to get TMDB info
      for (const entry of data.slice(0, 10)) {
        const movie = entry.movie || entry;
        if (!movie.ids?.tmdb) continue;

        try {
          const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.ids.tmdb}?api_key=${tmdbApiKey}`);
          if (tmdbRes.ok) {
            const tmdbData = await tmdbRes.json();
            items.push({
              ...tmdbData,
              media_type: 'movie',
              release_date: tmdbData.release_date,
              genres: (tmdbData.genres || []).map(g => g.name),
              source: source
            });
          }
        } catch (e) {
          console.warn(`[Poster] Failed to get TMDB data for ${movie.ids.tmdb}`);
        }
      }

      return items;
    } catch (e) {
      console.warn(`[Poster] Trakt ${source} failed:`, e);
      return [];
    }
  }, [posterConfig.traktClientId, tmdbApiKey]);

  // Fetch content from TMDB and Trakt
  const fetchContent = useCallback(async () => {
    if (!tmdbApiKey) return;

    setLoading(true);
    setError(null);

    try {
      const allItems = [];
      const sources = posterConfig.sources || ['upcoming', 'popular', 'trending'];

      // Fetch from each enabled source
      for (const source of sources) {
        // Handle Trakt sources
        if (source.startsWith('trakt_')) {
          const traktItems = await fetchFromTrakt(source);
          allItems.push(...traktItems);
          continue;
        }

        let url;
        switch (source) {
          case 'upcoming':
            url = `https://api.themoviedb.org/3/movie/upcoming?api_key=${tmdbApiKey}&region=US`;
            break;
          case 'popular':
            url = `https://api.themoviedb.org/3/trending/all/week?api_key=${tmdbApiKey}`;
            break;
          case 'trending':
            url = `https://api.themoviedb.org/3/trending/all/day?api_key=${tmdbApiKey}`;
            break;
          case 'now_playing':
            url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${tmdbApiKey}&region=US`;
            break;
          case 'on_air':
            url = `https://api.themoviedb.org/3/tv/on_the_air?api_key=${tmdbApiKey}`;
            break;
          default:
            continue;
        }

        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const results = (data.results || []).map(item => ({
              ...item,
              media_type: item.media_type || (item.first_air_date ? 'tv' : 'movie'),
              release_date: item.release_date || item.first_air_date,
              genres: (item.genre_ids || []).map(id => genreMap[id]).filter(Boolean),
              source: source // Add source label
            }));
            allItems.push(...results);
          }
        } catch (e) {
          console.warn(`[Poster] Failed to fetch ${source}:`, e);
        }
      }

      // Genre IDs to exclude (reality, talk shows, news, soap operas)
      const EXCLUDED_GENRES = new Set([10764, 10767, 10763, 10766]);

      // Dedupe by ID and type, filter out junk
      const seen = new Set();
      const uniqueItems = allItems.filter(item => {
        const key = `${item.media_type}-${item.id}`;
        if (seen.has(key)) return false;
        seen.add(key);

        // Must have an image
        if (!item.backdrop_path && !item.poster_path) return false;

        // Exclude trash genres
        if ((item.genre_ids || []).some(id => EXCLUDED_GENRES.has(id))) return false;

        // Minimum rating filter (skip unrated or very low rated)
        if (item.vote_average && item.vote_average < 4) return false;

        // Must have some votes (filters out obscure junk)
        if (item.vote_count !== undefined && item.vote_count < 10) return false;

        return true;
      });

      // Shuffle
      const shuffled = uniqueItems.sort(() => Math.random() - 0.5);

      // Check library status
      const withStatus = await checkLibraryStatus(shuffled.slice(0, 50));

      // Filter based on settings
      let filtered = withStatus;
      if (posterConfig.hideInLibrary) {
        filtered = filtered.filter(item => !item.inLibrary);
      }

      setItems(filtered.slice(0, 30));
      setCurrentIndex(0);

    } catch (err) {
      console.error('[Poster] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmdbApiKey, sourcesKey, posterConfig.hideInLibrary, posterConfig.traktClientId, genreMap, checkLibraryStatus, fetchFromTrakt]);

  // Initial load
  useEffect(() => {
    fetchGenres();
  }, [fetchGenres]);

  useEffect(() => {
    if (Object.keys(genreMap).length > 0 && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchContent();
    }
  }, [genreMap, fetchContent]);

  // Re-fetch when config changes (sources, trakt, etc.)
  useEffect(() => {
    if (hasFetchedRef.current && Object.keys(genreMap).length > 0) {
      fetchContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcesKey, posterConfig.traktClientId, posterConfig.hideInLibrary]);

  // Preload next images
  useEffect(() => {
    if (items.length === 0) return;

    // Preload next 2 images
    const nextIndices = [
      (currentIndex + 1) % items.length,
      (currentIndex + 2) % items.length
    ];

    nextIndices.forEach(idx => {
      const item = items[idx];
      if (item) {
        const url = displayMode === 'poster'
          ? item.poster_path ? `${TMDB_IMG_BASE}/w780${item.poster_path}` : null
          : item.backdrop_path ? `${TMDB_IMG_BASE}/w1280${item.backdrop_path}` : null;
        preloadImage(url);
      }
    });
  }, [currentIndex, items, displayMode]);

  // Transition helper - smooth crossfade
  const transitionTo = useCallback((newIndex) => {
    if (transitioning || items.length <= 1) return;
    setPrevIndex(currentIndex);
    setTransitioning(true);
    setCurrentIndex(newIndex);

    // End transition after animation completes
    setTimeout(() => {
      setTransitioning(false);
      setPrevIndex(null);
    }, 800);
  }, [transitioning, items.length, currentIndex]);

  // Auto-rotate
  useEffect(() => {
    if (items.length <= 1) return;

    const interval = posterConfig.rotateInterval || 15000;
    const timer = setInterval(() => {
      const newIndex = (currentIndex + 1) % items.length;
      transitionTo(newIndex);
    }, interval);

    return () => clearInterval(timer);
  }, [items.length, posterConfig.rotateInterval, currentIndex, transitionTo]);

  // Periodic content refresh (every 30 minutes)
  useEffect(() => {
    const refreshInterval = 30 * 60 * 1000; // 30 minutes

    const checkRefresh = setInterval(() => {
      const now = Date.now();
      if (now - lastRefreshRef.current >= refreshInterval) {
        console.log('[Poster] Periodic refresh triggered');
        lastRefreshRef.current = now;
        fetchContent();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkRefresh);
  }, [fetchContent]);

  // Manual navigation
  const goNext = () => {
    if (items.length <= 1 || transitioning) return;
    const newIndex = (currentIndex + 1) % items.length;
    transitionTo(newIndex);
  };

  const goPrev = () => {
    if (items.length <= 1 || transitioning) return;
    const newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
    transitionTo(newIndex);
  };

  if (!tmdbApiKey) {
    const hasTraktOnly = posterConfig.traktClientId && !tmdbApiKey;
    return (
      <div className="panel">
        <PanelHeader icon={Film} title={t('posters')} />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '14px' }}>
            <Film size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>{t('configurePosterInSetup')}</div>
            <div style={{ fontSize: '11px', marginTop: '8px', maxWidth: '280px', margin: '8px auto 0' }}>
              {hasTraktOnly
                ? t('tmdbRequired')
                : t('posterHint')
              }
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <div className="panel" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Header overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Film size={16} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff', letterSpacing: '1px' }}>
            DISCOVER
          </span>
          {loading && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {currentIndex + 1} / {items.length}
          </span>
          <button onClick={goPrev} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: '#fff', display: 'flex' }}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={goNext} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: '#fff', display: 'flex' }}>
            <ChevronRight size={14} />
          </button>
          <button onClick={fetchContent} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: '#fff', display: 'flex' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {error && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-card)',
            color: 'var(--danger)',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 10
          }}>
            <AlertCircle size={24} />
            <span style={{ fontSize: '12px' }}>{error}</span>
          </div>
        )}

        {/* Previous card (fading out) */}
        {transitioning && prevIndex !== null && items[prevIndex] && (
          <PosterCard
            key={`prev-${items[prevIndex].id}`}
            item={items[prevIndex]}
            displayMode={displayMode}
            arrConfig={integrations.arr}
            tmdbApiKey={tmdbApiKey}
            onAdded={handleItemAdded}
            isActive={false}
            isExiting={true}
          />
        )}

        {/* Current card (fading in) */}
        {currentItem && (
          <PosterCard
            key={`current-${currentItem.id}`}
            item={currentItem}
            displayMode={displayMode}
            arrConfig={integrations.arr}
            tmdbApiKey={tmdbApiKey}
            onAdded={handleItemAdded}
            isActive={true}
            isExiting={false}
          />
        )}

        {!currentItem && !loading && !error && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-card)',
            color: 'var(--text-muted)'
          }}>
            <span style={{ fontSize: '12px' }}>{t('noContentToDisplay')}</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
