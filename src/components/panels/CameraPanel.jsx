import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Loader2, Maximize2, Grid, RefreshCw, X, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { homeAssistant } from '../../services';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';
import { getLabel } from '../../utils/translations';

const vibrate = (pattern = 20) => {
  if (navigator.vibrate) navigator.vibrate(pattern);
};

// ========================
// go2rtc stream management
// ========================
const registerGo2rtcStream = async (streamName, rtspUrl) => {
  if (!rtspUrl) return false;
  // Convert rtsps:// to rtspx:// for go2rtc (handles self-signed certs like UniFi)
  let source = rtspUrl.trim();
  if (source.startsWith('rtsps://')) {
    source = source.replace('rtsps://', 'rtspx://');
  }
  // Remove ?enableSrtp if present (UniFi adds it but go2rtc doesn't need it)
  source = source.replace(/[?&]enableSrtp\b/i, '');

  try {
    const res = await fetch('/api/go2rtc/streams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streams: { [streamName]: source } })
    });
    const data = await res.json();
    console.log('[go2rtc] Register stream:', streamName, data);
    return data.results?.[streamName]?.ok !== false;
  } catch (err) {
    console.error('[go2rtc] Failed to register stream:', err);
    return false;
  }
};

// Load go2rtc video-rtc.js web component (once)
let go2rtcScriptLoaded = false;
const loadGo2rtcPlayer = () => {
  if (go2rtcScriptLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    if (document.querySelector('script[data-go2rtc]')) {
      go2rtcScriptLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.setAttribute('data-go2rtc', 'true');
    script.src = '/go2rtc/www/video-rtc.js';
    script.onload = () => { go2rtcScriptLoaded = true; resolve(); };
    script.onerror = () => {
      console.warn('[go2rtc] video-rtc.js not available, falling back to snapshot polling');
      resolve();
    };
    document.head.appendChild(script);
  });
};

// ========================
// Fullscreen Camera Modal with double-buffered live polling
// ========================
function CameraModal({ cameras, initialCameraId, haBaseUrl, scryptedConfig, integrations, onClose }) {
  const [activeCamId, setActiveCamId] = useState(initialCameraId);
  const [isLive, setIsLive] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [fps, setFps] = useState(0);
  const [go2rtcReady, setGo2rtcReady] = useState(false);
  const [liveError, setLiveError] = useState(null);
  const visibleImgRef = useRef(null);
  const go2rtcContainerRef = useRef(null);
  const liveRunningRef = useRef(false);
  const touchStartRef = useRef(null);

  const activeIdx = cameras.findIndex(c => c.id === activeCamId);
  const camera = cameras[activeIdx] || cameras[0];

  // Check if this camera supports go2rtc (has RTSP URL configured)
  const hasRtsp = !!(camera.rtspUrl || camera.streamType === 'go2rtc');

  // Get the raw snapshot URL for a camera (no cache buster)
  const getRawSnapshotUrl = useCallback((cam) => {
    if (cam.source === 'ha') {
      if (!haBaseUrl || !cam.entityPicture) return null;
      return cam.entityPicture.startsWith('http')
        ? cam.entityPicture
        : `${haBaseUrl}${cam.entityPicture}`;
    }
    if (cam.source === 'scrypted' && cam.webhookUrl) {
      return cam.webhookUrl;
    }
    if (cam.source === 'scrypted' && cam.scryptedId) {
      const baseUrl = scryptedConfig?.url?.replace(/\/$/, '');
      if (!baseUrl) return null;
      return `${baseUrl}/endpoint/@scrypted/nvr/public/thumbnail/${cam.scryptedId}.jpg`;
    }
    return cam.url || null;
  }, [haBaseUrl, scryptedConfig]);

  // Proxy a URL — always go through the server proxy since the browser
  // may be on a different host (e.g. Docker on Proxmox LXC) and can't
  // reach camera IPs directly due to CORS
  const proxyUrl = useCallback((rawUrl) => {
    if (!rawUrl) return null;
    let pUrl = `/api/proxy?url=${encodeURIComponent(rawUrl)}`;
    // Add auth
    if (camera.source === 'ha') {
      const haToken = integrations?.homeAssistant?.token;
      if (haToken) pUrl += `&token=${encodeURIComponent(haToken)}`;
    } else if (camera.source === 'scrypted' && camera.scryptedId) {
      const token = camera.token || scryptedConfig?.token;
      if (token?.startsWith('cookie:')) pUrl += `&cookie=${encodeURIComponent(token.replace('cookie:', ''))}`;
      else if (token) pUrl += `&token=${encodeURIComponent(token)}`;
    }
    return pUrl;
  }, [camera, integrations, scryptedConfig]);

  // go2rtc MSE live streaming — or fallback to snapshot polling
  useEffect(() => {
    if (!isLive) {
      liveRunningRef.current = false;
      setGo2rtcReady(false);
      setLiveError(null);
      // Clean up go2rtc element
      if (go2rtcContainerRef.current) {
        go2rtcContainerRef.current.innerHTML = '';
      }
      return;
    }

    let cancelled = false;
    liveRunningRef.current = true;

    const startLive = async () => {
      // If camera has RTSP URL, use go2rtc for true live streaming
      if (hasRtsp && camera.rtspUrl) {
        setLiveError(null);
        const streamName = `cam_${camera.id.replace(/[^a-zA-Z0-9]/g, '_')}`;

        // 1. Register the RTSP stream with go2rtc
        const ok = await registerGo2rtcStream(streamName, camera.rtspUrl);
        if (cancelled) return;

        if (!ok) {
          setLiveError('Failed to connect to go2rtc. Is it running?');
          return;
        }

        // 2. Load the video-rtc.js player
        await loadGo2rtcPlayer();
        if (cancelled) return;

        // 3. Create <video-rtc> element in the container
        if (go2rtcContainerRef.current && customElements.get('video-rtc')) {
          go2rtcContainerRef.current.innerHTML = '';
          const el = document.createElement('video-rtc');
          // Point src to our proxied WebSocket endpoint
          const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
          el.setAttribute('src', `${wsProto}//${location.host}/go2rtc/api/ws?src=${streamName}`);
          el.setAttribute('mode', 'mse,webrtc,mp4,mjpeg');
          el.style.width = '100%';
          el.style.maxHeight = '80vh';
          el.style.borderRadius = '12px';
          el.style.display = 'block';
          go2rtcContainerRef.current.appendChild(el);
          setGo2rtcReady(true);
          setImgLoaded(true);
        } else {
          setLiveError('go2rtc player not available');
        }
        return;
      }

      // Fallback: snapshot polling for cameras without RTSP
      let frameCount = 0;
      let fpsStart = performance.now();

      const fetchNextFrame = async () => {
        if (!liveRunningRef.current || cancelled) return;

        const rawUrl = getRawSnapshotUrl(camera);
        if (!rawUrl) return;

        const baseUrl = proxyUrl(rawUrl);
        if (!baseUrl) return;

        const cacheBuster = `_=${Date.now()}&r=${Math.random()}`;
        const frameUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${cacheBuster}`;

        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = frameUrl;
          });

          if (!liveRunningRef.current || cancelled) return;
          if (visibleImgRef.current) {
            visibleImgRef.current.src = frameUrl;
            setImgLoaded(true);
          }

          frameCount++;
          const elapsed = performance.now() - fpsStart;
          if (elapsed >= 1000) {
            setFps(Math.round(frameCount * 1000 / elapsed));
            frameCount = 0;
            fpsStart = performance.now();
          }
        } catch {
          // Frame failed, try again
        }

        if (liveRunningRef.current && !cancelled) {
          requestAnimationFrame(() => setTimeout(fetchNextFrame, 50));
        }
      };

      fetchNextFrame();
    };

    startLive();

    return () => {
      cancelled = true;
      liveRunningRef.current = false;
      if (go2rtcContainerRef.current) {
        go2rtcContainerRef.current.innerHTML = '';
      }
    };
  }, [isLive, activeCamId, camera, hasRtsp, getRawSnapshotUrl, proxyUrl]);

  // Get initial snapshot URL (with proxy, for non-live display)
  const getSnapshotUrl = () => {
    const rawUrl = getRawSnapshotUrl(camera);
    if (!rawUrl) return null;
    const pUrl = proxyUrl(rawUrl);
    return `${pUrl}${pUrl.includes('?') ? '&' : '?'}_=${Date.now()}`;
  };

  // Reset when switching cameras
  useEffect(() => {
    setImgLoaded(false);
    setFps(0);
  }, [activeCamId]);

  const goPrev = () => {
    vibrate();
    const newIdx = activeIdx > 0 ? activeIdx - 1 : cameras.length - 1;
    setActiveCamId(cameras[newIdx].id);
  };

  const goNext = () => {
    vibrate();
    const newIdx = activeIdx < cameras.length - 1 ? activeIdx + 1 : 0;
    setActiveCamId(cameras[newIdx].id);
  };

  // Swipe handling
  const handleTouchStart = (e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) goPrev();
      else goNext();
    }
    touchStartRef.current = null;
  };

  const snapshotUrl = !isLive ? getSnapshotUrl() : null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center'
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => { if (e.target === e.currentTarget) { vibrate(); onClose(); } }}
    >
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', zIndex: 2
      }}>
        <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={16} />
          {camera.name}
          {isLive && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#ff3333', fontWeight: '700' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff3333', animation: 'pulse-danger 1.5s ease-in-out infinite' }} />
              LIVE
            </span>
          )}
          {isLive && go2rtcReady && hasRtsp && (
            <span style={{ fontSize: '9px', color: 'rgba(100,255,100,0.6)', fontFamily: 'monospace' }}>
              MSE
            </span>
          )}
          {isLive && fps > 0 && !go2rtcReady && (
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
              {fps} fps
            </span>
          )}
        </div>
        <button
          onClick={() => { vibrate(); onClose(); }}
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
            width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Camera image / video */}
      <div style={{ position: 'relative', maxWidth: '95vw', maxHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* go2rtc MSE live mode */}
        {isLive && hasRtsp ? (
          <>
            <div
              ref={go2rtcContainerRef}
              style={{
                maxWidth: '95vw', maxHeight: '80vh',
                borderRadius: '12px', overflow: 'hidden',
                display: go2rtcReady ? 'block' : 'none'
              }}
            />
            {!go2rtcReady && !liveError && (
              <div style={{ width: '300px', height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Connecting to stream...</span>
              </div>
            )}
            {liveError && (
              <div style={{ width: '300px', padding: '20px', textAlign: 'center', color: 'var(--danger)', fontSize: '13px' }}>
                <Camera size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                <div>{liveError}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>Check RTSP URL in Setup</div>
              </div>
            )}
          </>
        ) : isLive ? (
          /* Snapshot polling fallback for cameras without RTSP */
          <>
            <img
              ref={visibleImgRef}
              alt={camera.name}
              style={{
                maxWidth: '95vw', maxHeight: '80vh', objectFit: 'contain',
                borderRadius: '12px', display: imgLoaded ? 'block' : 'none'
              }}
            />
            {!imgLoaded && (
              <div style={{ width: '300px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
              </div>
            )}
          </>
        ) : snapshotUrl ? (
          <>
            <img
              src={snapshotUrl}
              alt={camera.name}
              onLoad={() => setImgLoaded(true)}
              onError={() => {}}
              style={{
                maxWidth: '95vw', maxHeight: '80vh', objectFit: 'contain',
                borderRadius: '12px', display: imgLoaded ? 'block' : 'none'
              }}
            />
            {!imgLoaded && (
              <div style={{ width: '300px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
              </div>
            )}
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '16px' }}>No stream available</div>
        )}

        {/* Nav arrows */}
        {cameras.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              style={{
                position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', backdropFilter: 'blur(4px)'
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              style={{
                position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', backdropFilter: 'blur(4px)'
              }}
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* Bottom controls */}
      <div style={{
        position: 'absolute', bottom: '20px', left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px'
      }}>
        {/* Live toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            vibrate(30);
            setIsLive(!isLive);
            setImgLoaded(false);
            setGo2rtcReady(false);
            setLiveError(null);
            setFps(0);
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 20px',
            background: isLive ? 'rgba(255,51,51,0.2)' : hasRtsp ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.1)',
            border: `1px solid ${isLive ? '#ff3333' : hasRtsp ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.2)'}`,
            borderRadius: '24px',
            color: isLive ? '#ff3333' : hasRtsp ? '#22c55e' : '#fff',
            fontSize: '13px', fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          {isLive ? <><Pause size={14} /> Stop</> : <><Play size={14} /> {hasRtsp ? 'Live Stream' : 'Go Live'}</>}
        </button>

        {/* Camera dots */}
        {cameras.length > 1 && (
          <div style={{ display: 'flex', gap: '6px' }}>
            {cameras.map((cam, i) => (
              <button
                key={cam.id}
                onClick={(e) => { e.stopPropagation(); vibrate(); setActiveCamId(cam.id); }}
                style={{
                  width: i === activeIdx ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i === activeIdx ? 'var(--accent-primary)' : 'rgba(255,255,255,0.3)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: 0
                }}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes pulse-danger { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

export default function CameraPanel({ config }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [viewMode, setViewMode] = useState(config?.defaultView || 'grid');
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalCameraId, setModalCameraId] = useState(null);
  const { integrations, connectionStatus, settings } = useDashboardStore();
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  const haConnected = connectionStatus.homeAssistant?.connected;
  const haBaseUrl = integrations.homeAssistant?.url?.replace(/\/$/, '') || '';
  const configuredCameras = integrations.cameras || [];
  const scryptedConfig = integrations.scrypted || {};

  // Load cameras from config, HA auto-discover, and Scrypted
  useEffect(() => {
    const loadCameras = () => {
      const cameraList = [];

      // First, add configured cameras
      configuredCameras.forEach(cam => {
        if (!cam.enabled) return;

        if (cam.source === 'ha' && cam.entityId) {
          // Home Assistant camera
          const entity = homeAssistant.getEntity(cam.entityId);
          cameraList.push({
            id: cam.id,
            name: cam.name || entity?.attributes?.friendly_name || cam.entityId,
            source: 'ha',
            entityId: cam.entityId,
            entityPicture: entity?.attributes?.entity_picture,
            state: entity?.state,
            streamType: cam.streamType || 'snapshot',
            rtspUrl: cam.rtspUrl
          });
        } else if (cam.source === 'scrypted' && (cam.scryptedId || cam.webhookUrl)) {
          // Scrypted camera from config - supports webhook URLs or device IDs
          cameraList.push({
            id: cam.id,
            name: cam.name,
            source: 'scrypted',
            scryptedId: cam.scryptedId,
            webhookUrl: cam.webhookUrl,
            streamType: cam.streamType || 'snapshot',
            rtspUrl: cam.rtspUrl
          });
        } else if (cam.url || cam.rtspUrl) {
          // Direct URL camera (RTSP proxy, HLS, snapshot) or go2rtc
          cameraList.push({
            id: cam.id,
            name: cam.name,
            source: cam.source,
            url: cam.url,
            streamType: cam.streamType || detectStreamType(cam.url),
            rtspUrl: cam.rtspUrl
          });
        }
      });

      // If no configured cameras and HA is connected, auto-discover
      if (cameraList.length === 0 && haConnected) {
        Object.entries(homeAssistant.entities || {})
          .filter(([id]) => id.startsWith('camera.'))
          .forEach(([id, state]) => {
            cameraList.push({
              id: id,
              name: state.attributes?.friendly_name || id.split('.')[1].replace(/_/g, ' '),
              source: 'ha',
              entityId: id,
              entityPicture: state.attributes?.entity_picture,
              state: state.state,
              streamType: 'snapshot'
            });
          });
      }

      setCameras(cameraList);
      if (cameraList.length > 0 && !selectedCamera) {
        setSelectedCamera(cameraList[0].id);
      }
    };

    loadCameras();

    // Refresh when HA entities change
    if (haConnected) {
      const interval = setInterval(loadCameras, 5000);
      return () => clearInterval(interval);
    }
  }, [configuredCameras, haConnected, selectedCamera]);

  // Auto-refresh camera images (snapshot mode only — MJPEG streams are continuous)
  useEffect(() => {
    // Only poll for cameras using snapshot mode; true MJPEG streams don't need polling
    const hasSnapshotCamera = cameras.some(c => c.streamType === 'snapshot' || !c.streamType);
    if (!hasSnapshotCamera) return;
    const interval = config?.refreshInterval || 5000;
    const timer = setInterval(() => {
      setRefreshKey(k => k + 1);
    }, interval);
    return () => clearInterval(timer);
  }, [config?.refreshInterval, cameras]);

  const isConfigured = configuredCameras.length > 0 || haConnected || scryptedConfig.enabled;

  // Get current camera index for pagination
  const currentCameraIndex = cameras.findIndex(c => c.id === selectedCamera);
  const currentIdx = currentCameraIndex >= 0 ? currentCameraIndex : 0;

  const handlePrevCamera = () => {
    const newIdx = currentIdx > 0 ? currentIdx - 1 : cameras.length - 1;
    setSelectedCamera(cameras[newIdx].id);
  };

  const handleNextCamera = () => {
    const newIdx = currentIdx < cameras.length - 1 ? currentIdx + 1 : 0;
    setSelectedCamera(cameras[newIdx].id);
  };

  // Not configured
  if (!isConfigured) {
    return (
      <div className="panel">
        <PanelHeader
          icon={Camera}
          title={t('cameras')}
          badge={
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px' }}>
              {t('notConnected')}
            </span>
          }
        />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px', fontSize: '14px' }}>
            {t('addCamerasInSetup')}
          </div>
        </div>
      </div>
    );
  }

  // No cameras found
  if (cameras.length === 0) {
    return (
      <div className="panel">
        <PanelHeader icon={Camera} title={t('cameras')} />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px', fontSize: '14px' }}>
            {haConnected ? t('noCamerasFound') : t('waitingForConnection')}
          </div>
        </div>
      </div>
    );
  }

  const currentCamera = cameras.find(c => c.id === selectedCamera) || cameras[0];

  return (
    <div className="panel">
      <PanelHeader
        icon={Camera}
        title={t('cameras')}
        currentPage={currentIdx + 1}
        totalPages={cameras.length}
        onPrev={handlePrevCamera}
        onNext={handleNextCamera}
        onRefresh={() => setRefreshKey(k => k + 1)}
      >
        {cameras.length > 1 && (
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'single' : 'grid')}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '4px 6px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
              }}
              title={viewMode === 'grid' ? 'Single view' : 'Grid view'}
            >
              {viewMode === 'grid' ? <Maximize2 size={12} /> : <Grid size={12} />}
            </button>
          )}
      </PanelHeader>
      <div className="panel-content">
        {viewMode === 'single' ? (
          <div style={{ position: 'relative' }}>
            {cameras.length > 1 && (
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                {cameras.map(cam => (
                  <button
                    key={cam.id}
                    onClick={() => setSelectedCamera(cam.id)}
                    style={{
                      padding: '4px 10px',
                      background: selectedCamera === cam.id ? 'var(--accent-glow)' : 'var(--bg-card)',
                      border: `1px solid ${selectedCamera === cam.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      borderRadius: '4px',
                      color: selectedCamera === cam.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                      fontSize: '10px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {cam.name}
                  </button>
                ))}
              </div>
            )}

            <div
              style={{ cursor: 'pointer' }}
              onClick={() => { vibrate(); setModalCameraId(currentCamera.id); }}
            >
              <CameraView
                camera={currentCamera}
                haBaseUrl={haBaseUrl}
                scryptedConfig={scryptedConfig}
                integrations={integrations}
                refreshKey={refreshKey}
                showOverlay={true}
              />
            </div>

          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: cameras.length <= 2 ? '1fr' : 'repeat(2, 1fr)',
            gap: '8px'
          }}>
            {cameras.slice(0, 4).map(cam => (
              <div
                key={cam.id}
                style={{ cursor: 'pointer' }}
                onClick={() => { vibrate(); setModalCameraId(cam.id); }}
              >
                <CameraView
                  camera={cam}
                  haBaseUrl={haBaseUrl}
                  scryptedConfig={scryptedConfig}
                  integrations={integrations}
                  refreshKey={refreshKey}
                  compact={true}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen camera modal */}
      {modalCameraId && (
        <CameraModal
          cameras={cameras}
          initialCameraId={modalCameraId}
          haBaseUrl={haBaseUrl}
          scryptedConfig={scryptedConfig}
          integrations={integrations}
          onClose={() => setModalCameraId(null)}
        />
      )}
    </div>
  );
}

// Detect stream type from URL
function detectStreamType(url) {
  if (!url) return 'snapshot';
  const lower = url.toLowerCase();
  if (lower.includes('.m3u8')) return 'hls';
  if (lower.includes('rtsp://')) return 'rtsp';
  if (lower.includes('/webrtc') || lower.includes('go2rtc')) return 'webrtc';
  if (lower.includes('.mjpeg') || lower.includes('/mjpeg') || lower.includes('mjpg')) return 'mjpeg';
  return 'snapshot';
}

// Camera view component supporting multiple stream types
function CameraView({ camera, haBaseUrl, refreshKey, scryptedConfig, integrations, compact = false, showOverlay = false }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get the appropriate URL based on stream type
  const getStreamUrl = () => {
    const streamType = camera.streamType || 'snapshot';
    // go2rtc cameras show snapshots in grid — live stream only in modal
    const effectiveType = streamType === 'go2rtc' ? 'snapshot' : streamType;
    const isLive = effectiveType === 'mjpeg';

    // Home Assistant cameras
    if (camera.source === 'ha') {
      if (!haBaseUrl) return null;

      if (isLive && camera.entityId) {
        // True MJPEG stream from HA — continuous multipart stream, no polling needed
        const mjpegUrl = `${haBaseUrl}/api/camera_proxy_stream/${camera.entityId}`;
        let proxyUrl = `/api/proxy?url=${encodeURIComponent(mjpegUrl)}`;
        const haToken = integrations?.homeAssistant?.token;
        if (haToken) proxyUrl += `&token=${encodeURIComponent(haToken)}`;
        return proxyUrl;
      }

      // Snapshot mode
      if (!camera.entityPicture) return null;
      const baseUrl = camera.entityPicture.startsWith('http')
        ? camera.entityPicture
        : `${haBaseUrl}${camera.entityPicture}`;
      return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}_=${refreshKey}`;
    }

    // Scrypted cameras - support both webhook URLs and device IDs
    if (camera.source === 'scrypted') {
      let streamUrl;

      if (camera.webhookUrl) {
        streamUrl = camera.webhookUrl;

        if (isLive && !streamUrl.includes('/getVideoStream')) {
          // Append /getVideoStream for MJPEG stream from Scrypted webhook
          streamUrl = streamUrl.replace(/\/$/, '') + '/getVideoStream';
        }
      } else if (camera.scryptedId) {
        const baseUrl = scryptedConfig?.url?.replace(/\/$/, '');
        if (!baseUrl) return null;

        const token = camera.token || scryptedConfig?.token;
        const deviceId = camera.scryptedId;

        if (streamType === 'hls') {
          streamUrl = `${baseUrl}/endpoint/@scrypted/nvr/public/${deviceId}/channel/0/hls/index.m3u8`;
        } else if (isLive) {
          streamUrl = `${baseUrl}/endpoint/@scrypted/nvr/public/${deviceId}/channel/0/mjpeg`;
        } else {
          streamUrl = `${baseUrl}/endpoint/@scrypted/nvr/public/thumbnail/${deviceId}.jpg`;
        }

        let proxyUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}`;
        if (token?.startsWith('cookie:')) {
          proxyUrl += `&cookie=${encodeURIComponent(token.replace('cookie:', ''))}`;
        } else if (token) {
          proxyUrl += `&token=${encodeURIComponent(token)}`;
        }

        // Only add cache buster for snapshots — MJPEG is a continuous stream
        if (!isLive) proxyUrl += `&_=${refreshKey}`;
        return proxyUrl;
      } else {
        return null;
      }

      // Proxy webhook URLs
      if (camera.webhookUrl) {
        streamUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}`;
      }

      // Only add cache buster for snapshots — MJPEG is continuous
      if (!isLive) {
        streamUrl += `${streamUrl.includes('?') ? '&' : '?'}_=${refreshKey}`;
      }
      return streamUrl;
    }

    if (!camera.url) return null;

    // Direct URL camera
    let finalUrl = `/api/proxy?url=${encodeURIComponent(camera.url)}`;

    // Only add cache buster for snapshots — MJPEG streams are continuous
    if (!isLive) {
      finalUrl += `${finalUrl.includes('?') ? '&' : '?'}_=${refreshKey}`;
    }

    return finalUrl;
  };

  const streamUrl = getStreamUrl();
  const streamType = camera.streamType || 'snapshot';

  // Handle HLS streams
  useEffect(() => {
    if (streamType === 'hls' && streamUrl && videoRef.current) {
      // Native HLS support (Safari) or needs HLS.js
      if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = streamUrl;
      } else {
        // Would need HLS.js here - for now fall back to native
        videoRef.current.src = streamUrl;
      }
    }
  }, [streamType, streamUrl]);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const containerStyle = {
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden',
    background: 'var(--bg-card)'
  };

  const overlayStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: compact ? '4px 8px' : '8px 12px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
    color: '#fff',
    fontSize: compact ? '10px' : '12px',
    fontWeight: '500'
  };

  // Error state
  if (error || !streamUrl) {
    return (
      <div style={containerStyle}>
        <div style={{ padding: compact ? '30px 10px' : '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Camera size={compact ? 24 : 32} style={{ opacity: 0.3, marginBottom: '8px' }} />
          <div>{error ? 'Camera unavailable' : 'No stream URL'}</div>
        </div>
        <div style={overlayStyle}>
          {camera.name}
        </div>
      </div>
    );
  }

  // HLS / Video stream
  if (streamType === 'hls' || streamType === 'webrtc') {
    return (
      <div style={containerStyle}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onLoadedData={handleLoad}
          onError={handleError}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
          </div>
        )}
        <div style={overlayStyle}>
          {camera.name}
          <span style={{ marginLeft: '8px', fontSize: '9px', opacity: 0.7, textTransform: 'uppercase' }}>
            {streamType}
          </span>
        </div>
      </div>
    );
  }

  // MJPEG stream (continuous image stream — browser handles multipart natively)
  if (streamType === 'mjpeg') {
    return (
      <div style={containerStyle}>
        <img
          src={streamUrl}
          alt={camera.name}
          onLoad={() => { setLoading(false); setError(false); }}
          onError={() => {
            // For MJPEG, the stream may end and that triggers onerror
            // Only show error if we never loaded successfully
            if (loading) { setLoading(false); setError(true); }
          }}
          style={{ width: '100%', height: 'auto', display: loading ? 'none' : 'block' }}
        />
        {loading && (
          <div style={{ padding: compact ? '30px 10px' : '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
          </div>
        )}
        <div style={overlayStyle}>
          {camera.name}
          <span style={{ marginLeft: '8px', fontSize: '9px', opacity: 0.7, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff3333', display: 'inline-block', animation: 'pulse-danger 1.5s ease-in-out infinite' }} />
            LIVE
          </span>
        </div>
      </div>
    );
  }

  // Default: Snapshot (polling images)
  return (
    <div style={containerStyle}>
      <img
        src={streamUrl}
        alt={camera.name}
        onLoad={handleLoad}
        onError={handleError}
        style={{ width: '100%', height: 'auto', display: loading && !error ? 'none' : 'block' }}
      />
      {loading && (
        <div style={{ padding: compact ? '30px 10px' : '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
        </div>
      )}
      <div style={overlayStyle}>
        {camera.name}
        {camera.streamType === 'go2rtc' && camera.rtspUrl ? (
          <span style={{ marginLeft: '8px', fontSize: '9px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Play size={8} style={{ fill: '#22c55e', color: '#22c55e' }} />
            <span style={{ color: '#22c55e', fontWeight: '600' }}>RTSP</span>
          </span>
        ) : camera.source !== 'ha' && (
          <span style={{ marginLeft: '8px', fontSize: '9px', opacity: 0.7 }}>
            ({camera.source})
          </span>
        )}
      </div>
    </div>
  );
}
