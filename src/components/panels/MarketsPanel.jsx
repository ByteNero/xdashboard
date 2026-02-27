import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Loader2, DollarSign, Bitcoin, Coins } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';
import { getLabel } from '../../utils/translations';

// Format price with appropriate decimals
const formatPrice = (price, currency = 'USD') => {
  if (!price && price !== 0) return '-';
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';

  if (price >= 1000) {
    return `${symbol}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `${symbol}${price.toFixed(2)}`;
  } else if (price >= 0.01) {
    return `${symbol}${price.toFixed(4)}`;
  } else {
    return `${symbol}${price.toFixed(6)}`;
  }
};

// Format percentage change
const formatChange = (change) => {
  if (!change && change !== 0) return '-';
  const prefix = change >= 0 ? '+' : '';
  return `${prefix}${change.toFixed(2)}%`;
};

// Format market cap
const formatMarketCap = (cap) => {
  if (!cap) return '-';
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  return `$${cap.toLocaleString()}`;
};

// Mini sparkline chart component
const Sparkline = ({ data, color, width = 60, height = 20 }) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Asset row component
const AssetRow = ({ asset, currency }) => {
  const isPositive = asset.change24h >= 0;
  const changeColor = isPositive ? 'var(--success)' : 'var(--danger)';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 10px',
      background: 'var(--bg-card)',
      borderRadius: '8px',
      borderLeft: `3px solid ${changeColor}`
    }}>
      {/* Icon/Logo */}
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        {asset.image ? (
          <img src={asset.image} alt={asset.symbol} style={{ width: '20px', height: '20px' }} />
        ) : asset.type === 'crypto' ? (
          <Bitcoin size={14} style={{ color: 'var(--accent-primary)' }} />
        ) : (
          <DollarSign size={14} style={{ color: 'var(--accent-primary)' }} />
        )}
      </div>

      {/* Symbol & Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          textTransform: 'uppercase'
        }}>
          {asset.symbol}
        </div>
        <div style={{
          fontSize: '9px',
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {asset.name}
        </div>
      </div>

      {/* Sparkline */}
      {asset.sparkline && (
        <div style={{ flexShrink: 0 }}>
          <Sparkline data={asset.sparkline} color={changeColor} />
        </div>
      )}

      {/* Price & Change */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono, monospace)'
        }}>
          {formatPrice(asset.price, currency)}
        </div>
        <div style={{
          fontSize: '10px',
          fontWeight: '600',
          color: changeColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '2px'
        }}>
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {formatChange(asset.change24h)}
        </div>
      </div>
    </div>
  );
};

// Market summary stats
const MarketSummary = ({ stats }) => {
  if (!stats) return null;

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      marginBottom: '10px',
      flexWrap: 'wrap'
    }}>
      {stats.totalMarketCap && (
        <div style={{
          padding: '4px 8px',
          background: 'var(--bg-card)',
          borderRadius: '4px',
          fontSize: '9px'
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Cap: </span>
          <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
            {formatMarketCap(stats.totalMarketCap)}
          </span>
        </div>
      )}
      {stats.btcDominance && (
        <div style={{
          padding: '4px 8px',
          background: 'var(--bg-card)',
          borderRadius: '4px',
          fontSize: '9px'
        }}>
          <span style={{ color: 'var(--text-muted)' }}>BTC: </span>
          <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
            {stats.btcDominance.toFixed(1)}%
          </span>
        </div>
      )}
      {stats.marketChange24h !== undefined && (
        <div style={{
          padding: '4px 8px',
          background: 'var(--bg-card)',
          borderRadius: '4px',
          fontSize: '9px'
        }}>
          <span style={{ color: 'var(--text-muted)' }}>24h: </span>
          <span style={{
            color: stats.marketChange24h >= 0 ? 'var(--success)' : 'var(--danger)',
            fontWeight: '600'
          }}>
            {formatChange(stats.marketChange24h)}
          </span>
        </div>
      )}
    </div>
  );
};

export default function MarketsPanel({ config }) {
  const [assets, setAssets] = useState([]);
  const [marketStats, setMarketStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const { integrations, settings } = useDashboardStore();
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  const marketsConfig = integrations.markets || {};
  const currency = marketsConfig.currency || 'usd';
  const watchlist = marketsConfig.watchlist || ['bitcoin', 'ethereum'];
  const customAssets = marketsConfig.customAssets || [];
  const refreshInterval = marketsConfig.refreshInterval || 60000; // 1 minute default

  // Fetch crypto data from CoinGecko (free, no API key needed)
  const fetchCoinGecko = useCallback(async () => {
    if (watchlist.length === 0 && customAssets.length === 0) return [];

    try {
      // Fetch prices for watchlist
      const ids = watchlist.join(',');
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&ids=${ids}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`;

      const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limited - try again in a minute');
        }
        throw new Error(`CoinGecko error: ${response.status}`);
      }

      const data = await response.json();

      return data.map(coin => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h,
        marketCap: coin.market_cap,
        image: coin.image,
        sparkline: coin.sparkline_in_7d?.price?.slice(-24) || null, // Last 24 data points
        type: 'crypto'
      }));
    } catch (err) {
      throw err;
    }
  }, [watchlist, currency]);

  // Fetch global market stats
  const fetchMarketStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/proxy?url=${encodeURIComponent('https://api.coingecko.com/api/v3/global')}`);
      if (!response.ok) return null;

      const data = await response.json();
      return {
        totalMarketCap: data.data.total_market_cap?.usd,
        btcDominance: data.data.market_cap_percentage?.btc,
        marketChange24h: data.data.market_cap_change_percentage_24h_usd
      };
    } catch (err) {
      return null;
    }
  }, []);

  // Fetch stocks/ETFs from Alpha Vantage (requires API key)
  const fetchAlphaVantage = useCallback(async () => {
    const apiKey = marketsConfig.alphaVantageKey;
    if (!apiKey || customAssets.length === 0) return [];

    const stockAssets = customAssets.filter(a => a.type === 'stock' || a.type === 'etf');
    if (stockAssets.length === 0) return [];

    const results = [];

    for (const asset of stockAssets) {
      try {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${asset.symbol}&apikey=${apiKey}`;
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        const data = await response.json();

        if (data['Global Quote']) {
          const quote = data['Global Quote'];
          results.push({
            id: asset.symbol.toLowerCase(),
            symbol: asset.symbol,
            name: asset.name || asset.symbol,
            price: parseFloat(quote['05. price']),
            change24h: parseFloat(quote['10. change percent']?.replace('%', '')),
            type: asset.type || 'stock'
          });
        }
      } catch (err) {
      }
    }

    return results;
  }, [marketsConfig.alphaVantageKey, customAssets]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (watchlist.length === 0 && customAssets.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const [cryptoData, stockData, stats] = await Promise.all([
        fetchCoinGecko(),
        fetchAlphaVantage(),
        fetchMarketStats()
      ]);

      // Combine and sort by market cap / custom order
      const allAssets = [...cryptoData, ...stockData];
      setAssets(allAssets);
      setMarketStats(stats);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchCoinGecko, fetchAlphaVantage, fetchMarketStats, watchlist, customAssets]);

  // Initial fetch and polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  // Empty state
  if (watchlist.length === 0 && customAssets.length === 0) {
    return (
      <div className="panel">
        <PanelHeader icon={TrendingUp} title={t('markets')} />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '14px' }}>
            <Coins size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>{t('configureMarketsInSetup')}</div>
            <div style={{ fontSize: '11px', marginTop: '8px' }}>{t('marketsHint')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <PanelHeader
        icon={TrendingUp}
        title={t('markets')}
        onRefresh={fetchData}
      >
        {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
        {lastUpdate && !loading && (
          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
            {lastUpdate.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </PanelHeader>

      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Market stats summary */}
        <MarketSummary stats={marketStats} />

        {/* Error message */}
        {error && (
          <div style={{
            padding: '8px 10px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger)',
            borderRadius: '6px',
            fontSize: '11px',
            color: 'var(--danger)',
            marginBottom: '10px'
          }}>
            {error}
          </div>
        )}

        {/* Asset list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {assets.length > 0 ? (
            assets.map(asset => (
              <AssetRow key={asset.id} asset={asset} currency={currency.toUpperCase()} />
            ))
          ) : !loading && !error ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '12px' }}>
              <Coins size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div>{t('noMarketData')}</div>
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
