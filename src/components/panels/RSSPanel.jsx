import { useState, useEffect, useCallback } from 'react';
import { Rss, ExternalLink, Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';
import { getLabel } from '../../utils/translations';

// Format relative time
const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// Strip HTML tags and decode entities
const stripHtml = (html) => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

// Feed item card
const FeedItem = ({ item, feedColor }) => {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        padding: '10px',
        background: 'var(--bg-card)',
        borderRadius: '8px',
        borderLeft: `3px solid ${feedColor || 'var(--accent-primary)'}`,
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-secondary)';
        e.currentTarget.style.transform = 'translateX(2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-card)';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '8px',
        marginBottom: '4px'
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {item.title}
        </div>
        <ExternalLink size={10} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />
      </div>

      {item.description && (
        <div style={{
          fontSize: '9px',
          color: 'var(--text-muted)',
          marginBottom: '6px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {stripHtml(item.description).slice(0, 150)}
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '9px',
        color: 'var(--text-muted)'
      }}>
        {item.feedName && (
          <span style={{
            padding: '1px 5px',
            background: `${feedColor || 'var(--accent-primary)'}20`,
            color: feedColor || 'var(--accent-primary)',
            borderRadius: '3px',
            fontSize: '8px',
            fontWeight: '600'
          }}>
            {item.feedName}
          </span>
        )}
        {item.pubDate && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={9} />
            {formatRelativeTime(item.pubDate)}
          </span>
        )}
        {item.author && (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            by {item.author}
          </span>
        )}
      </div>
    </a>
  );
};

// Feed status chip with individual status (clickable for filtering)
const FeedStatusChip = ({ feed, status, isSelected, onClick }) => {
  const isError = status === 'error';
  const isLoading = status === 'loading';
  const isOk = status === 'ok';

  return (
    <span
      onClick={onClick}
      style={{
        padding: '3px 8px',
        background: isSelected
          ? (feed.color || 'var(--accent-primary)')
          : isError
            ? 'rgba(239, 68, 68, 0.2)'
            : `${feed.color || 'var(--accent-primary)'}20`,
        color: isSelected
          ? '#000'
          : isError
            ? 'var(--danger)'
            : feed.color || 'var(--accent-primary)',
        borderRadius: '4px',
        fontSize: '9px',
        fontWeight: '600',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        border: isError ? '1px solid var(--danger)' : isSelected ? `2px solid ${feed.color || 'var(--accent-primary)'}` : 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: isSelected ? 'scale(1.05)' : 'scale(1)'
      }}
    >
      {isLoading && <Loader2 size={8} style={{ animation: 'spin 1s linear infinite' }} />}
      {isOk && <CheckCircle size={8} />}
      {isError && <AlertCircle size={8} />}
      {feed.name}
    </span>
  );
};

export default function RSSPanel({ config }) {
  const [items, setItems] = useState([]);
  const [feedStatus, setFeedStatus] = useState({}); // Track individual feed status
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedFeed, setSelectedFeed] = useState(null); // null = all feeds
  const { integrations, settings } = useDashboardStore();
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  const feeds = integrations.rssFeeds || [];
  const enabledFeeds = feeds.filter(f => f.enabled && f.url);
  const itemsPerPage = 6;

  const fetchFeeds = useCallback(async () => {
    if (enabledFeeds.length === 0) return;

    setLoading(true);

    // Set all feeds to loading
    const initialStatus = {};
    enabledFeeds.forEach(f => { initialStatus[f.id] = 'loading'; });
    setFeedStatus(initialStatus);

    const allItems = [];
    const newStatus = {};

    for (const feed of enabledFeeds) {
      try {
        // Use a CORS proxy for RSS feeds
        const proxyUrl = import.meta.env.DEV
          ? `/api/proxy?url=${encodeURIComponent(feed.url)}`
          : feed.url;

        const res = await fetch(proxyUrl);
        if (!res.ok) {
          newStatus[feed.id] = 'error';
          continue;
        }

        const text = await res.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');

        // Check for parse errors
        const parseError = xml.querySelector('parsererror');
        if (parseError) {
          newStatus[feed.id] = 'error';
          console.warn(`[RSS] Parse error for ${feed.name}`);
          continue;
        }

        // Check for RSS or Atom
        const isAtom = xml.querySelector('feed');
        const entries = isAtom
          ? xml.querySelectorAll('entry')
          : xml.querySelectorAll('item');

        if (entries.length === 0) {
          // Check if it's actually a valid feed
          const hasChannel = xml.querySelector('channel') || xml.querySelector('feed');
          if (!hasChannel) {
            newStatus[feed.id] = 'error';
            console.warn(`[RSS] Invalid feed format for ${feed.name}`);
            continue;
          }
        }

        entries.forEach(entry => {
          const item = {
            id: `${feed.id}-${Date.now()}-${Math.random()}`,
            feedId: feed.id,
            feedName: feed.name,
            feedColor: feed.color,
            title: entry.querySelector('title')?.textContent || 'Untitled',
            link: isAtom
              ? entry.querySelector('link')?.getAttribute('href')
              : entry.querySelector('link')?.textContent,
            description: isAtom
              ? entry.querySelector('summary')?.textContent || entry.querySelector('content')?.textContent
              : entry.querySelector('description')?.textContent,
            pubDate: isAtom
              ? entry.querySelector('updated')?.textContent || entry.querySelector('published')?.textContent
              : entry.querySelector('pubDate')?.textContent,
            author: isAtom
              ? entry.querySelector('author name')?.textContent
              : entry.querySelector('author')?.textContent || entry.querySelector('dc\\:creator')?.textContent
          };
          allItems.push(item);
        });

        newStatus[feed.id] = 'ok';
      } catch (feedError) {
        console.warn(`[RSS] Failed to fetch ${feed.name}:`, feedError);
        newStatus[feed.id] = 'error';
      }
    }

    // Sort by date, newest first
    allItems.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate) : new Date(0);
      const dateB = b.pubDate ? new Date(b.pubDate) : new Date(0);
      return dateB - dateA;
    });

    setItems(allItems.slice(0, 50)); // Keep top 50 items
    setFeedStatus(newStatus);
    setLoading(false);
  }, [enabledFeeds.map(f => f.url).join(',')]);

  useEffect(() => {
    fetchFeeds();
    const interval = setInterval(fetchFeeds, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [fetchFeeds]);

  // Filter items by selected feed
  const filteredItems = selectedFeed
    ? items.filter(item => item.feedId === selectedFeed)
    : items;

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  // Reset page when filter changes
  const handleFeedClick = (feedId) => {
    setSelectedFeed(prev => prev === feedId ? null : feedId);
    setCurrentPage(0);
  };

  const handlePrev = () => setCurrentPage(p => p > 0 ? p - 1 : totalPages - 1);
  const handleNext = () => setCurrentPage(p => p < totalPages - 1 ? p + 1 : 0);

  // Count status
  const errorCount = Object.values(feedStatus).filter(s => s === 'error').length;
  const okCount = Object.values(feedStatus).filter(s => s === 'ok').length;

  if (enabledFeeds.length === 0) {
    return (
      <div className="panel">
        <PanelHeader icon={Rss} title={t('rssFeed')} />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '14px' }}>
            <Rss size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>{t('configureRssInSetup')}</div>
            <div style={{ fontSize: '11px', marginTop: '8px' }}>{t('rssHint')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <PanelHeader
        icon={Rss}
        title={t('rssFeed')}
        badge={errorCount > 0 && (
          <span style={{
            fontSize: '9px',
            padding: '2px 6px',
            background: 'rgba(239, 68, 68, 0.2)',
            color: 'var(--danger)',
            borderRadius: '4px',
            fontWeight: '600'
          }}>
            {errorCount} {t('failed')}
          </span>
        )}
        currentPage={currentPage + 1}
        totalPages={totalPages}
        onPrev={handlePrev}
        onNext={handleNext}
        onRefresh={fetchFeeds}
      >
        {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
      </PanelHeader>

      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Feed status chips - clickable to filter */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* All feeds chip */}
          <span
            onClick={() => { setSelectedFeed(null); setCurrentPage(0); }}
            style={{
              padding: '3px 8px',
              background: selectedFeed === null ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: selectedFeed === null ? '#000' : 'var(--text-muted)',
              borderRadius: '4px',
              fontSize: '9px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: selectedFeed === null ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)'
            }}
          >
            {t('all')} ({items.length})
          </span>
          {enabledFeeds.map(feed => (
            <FeedStatusChip
              key={feed.id}
              feed={feed}
              status={feedStatus[feed.id] || 'loading'}
              isSelected={selectedFeed === feed.id}
              onClick={() => handleFeedClick(feed.id)}
            />
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {paginatedItems.length > 0 ? (
            paginatedItems.map((item, index) => (
              <FeedItem key={`${item.id}-${index}`} item={item} feedColor={item.feedColor} />
            ))
          ) : !loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '12px' }}>
              <Rss size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div>{errorCount > 0 && okCount === 0 ? t('allFeedsFailedToLoad') : t('noFeedItems')}</div>
              {errorCount > 0 && (
                <div style={{ fontSize: '10px', marginTop: '4px', color: 'var(--danger)' }}>
                  {t('checkFeedUrlsInSetup')}
                </div>
              )}
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
