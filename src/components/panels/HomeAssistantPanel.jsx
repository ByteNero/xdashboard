import { useState, useEffect, useCallback, useRef } from 'react';
import { Home, Lightbulb, Bed, ChefHat, Lock, Thermometer, Tv, DoorOpen, Fan, Power, Loader2, Sun, X } from 'lucide-react';
import { homeAssistant } from '../../services';
import PanelHeader from './PanelHeader';
import { useDashboardStore } from '../../store/dashboardStore';
import { getLabel } from '../../utils/translations';

const iconMap = { Lightbulb, Bed, ChefHat, Lock, Thermometer, Tv, DoorOpen, Fan, Power, Home };
const LONG_PRESS_DURATION = 500; // ms

export default function HomeAssistantPanel({ config }) {
  const { settings, integrations, connectHomeAssistant } = useDashboardStore();

  // Dynamic items per page based on panel height (3 columns × rows that fit)
  const panelH = settings?.panelHeight && settings.panelHeight !== 'auto'
    ? parseInt(settings.panelHeight) : window.innerHeight;
  const ITEMS_PER_PAGE = Math.max(9, Math.floor((panelH - 80) / (84 + 8)) * 3);
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  const [entityStates, setEntityStates] = useState({});
  const [loading, setLoading] = useState({});
  const [isConnected, setIsConnected] = useState(homeAssistant.isConnected());
  const [currentPage, setCurrentPage] = useState(0);
  const [brightnessModal, setBrightnessModal] = useState(null); // { entityId, name }
  const [brightness, setBrightness] = useState(100);
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);
  const reconnectAttemptRef = useRef(false);
  const entities = config?.entities || [];

  const totalPages = Math.ceil(entities.length / ITEMS_PER_PAGE);
  const paginatedEntities = entities.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  // Poll connection status and auto-reconnect if configured but disconnected
  useEffect(() => {
    const haConfig = integrations?.homeAssistant;
    const checkConnection = () => {
      const connected = homeAssistant.isConnected();
      setIsConnected(connected);

      // Auto-reconnect: if HA is configured+enabled but not connected, try to reconnect
      if (!connected && haConfig?.enabled && haConfig?.url && haConfig?.token && !reconnectAttemptRef.current) {
        reconnectAttemptRef.current = true;
        console.log('[HA Panel] Not connected but configured — attempting reconnect...');
        connectHomeAssistant().finally(() => {
          // Allow another attempt after 30 seconds
          setTimeout(() => { reconnectAttemptRef.current = false; }, 30000);
        });
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 2000);
    return () => clearInterval(interval);
  }, [integrations?.homeAssistant, connectHomeAssistant]);

  // Load states from HA service
  const loadStates = useCallback(() => {
    if (!homeAssistant.isConnected()) return;

    const states = {};
    entities.forEach(entity => {
      const state = homeAssistant.getEntity(entity.id);
      if (state) states[entity.id] = state;
    });
    setEntityStates(states);
  }, [entities]);

  // Subscribe to entity updates
  useEffect(() => {
    if (!isConnected) return;

    // Load initial states
    loadStates();

    // Subscribe to updates for each entity
    const unsubscribes = entities.map(entity =>
      homeAssistant.subscribe(entity.id, (state) => {
        setEntityStates(prev => ({ ...prev, [entity.id]: state }));
      })
    );

    return () => unsubscribes.forEach(unsub => unsub?.());
  }, [isConnected, entities, loadStates]);

  const vibrate = (pattern = 30) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  const handleToggle = async (entity) => {
    if (!homeAssistant.isConnected()) return;
    vibrate(30);
    setLoading(prev => ({ ...prev, [entity.id]: true }));
    try {
      if (entity.type === 'scene') {
        await homeAssistant.activateScene(entity.id);
      } else {
        await homeAssistant.toggle(entity.id);
      }
    } catch (error) {
      console.error('Failed to toggle:', error);
    } finally {
      setLoading(prev => ({ ...prev, [entity.id]: false }));
    }
  };

  const isLightEntity = (entity) => {
    return entity.id.startsWith('light.') || entity.icon === 'Lightbulb';
  };

  const handlePointerDown = (entity) => {
    if (!isLightEntity(entity) || entity.type === 'display') return;

    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      vibrate([30, 50, 30]); // double buzz for long press
      // Open brightness modal
      const state = entityStates[entity.id];
      const currentBrightness = state?.attributes?.brightness
        ? Math.round((state.attributes.brightness / 255) * 100)
        : 100;
      setBrightness(currentBrightness);
      setBrightnessModal({ entityId: entity.id, name: entity.name });
    }, LONG_PRESS_DURATION);
  };

  const handlePointerUp = (entity) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Only toggle if it wasn't a long press
    if (!isLongPress.current && entity.type !== 'display') {
      handleToggle(entity);
    }
  };

  const handlePointerLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleBrightnessChange = async (value) => {
    setBrightness(value);
    if (!brightnessModal || !homeAssistant.isConnected()) return;

    try {
      // Convert 0-100 to 0-255 for HA
      const haValue = Math.round((value / 100) * 255);
      await homeAssistant.callService('light', 'turn_on', {
        entity_id: brightnessModal.entityId,
        brightness: haValue
      });
    } catch (error) {
      console.error('Failed to set brightness:', error);
    }
  };

  const getEntityValue = (entityId) => {
    const state = entityStates[entityId];
    if (!state) return null;
    if (state.attributes?.current_temperature) return `${Math.round(state.attributes.current_temperature)}°`;
    if (state.attributes?.unit_of_measurement) return `${state.state}${state.attributes.unit_of_measurement}`;
    return state.state;
  };

  const isEntityOn = (entityId) => {
    const state = entityStates[entityId];
    if (!state) return false;
    const s = state.state?.toLowerCase();
    return ['on', 'unlocked', 'open', 'home', 'playing', 'above_horizon'].includes(s);
  };

  const getBrightnessDisplay = (entityId) => {
    const state = entityStates[entityId];
    if (!state?.attributes?.brightness) return null;
    return Math.round((state.attributes.brightness / 255) * 100);
  };

  const handlePrev = () => setCurrentPage(p => p > 0 ? p - 1 : totalPages - 1);
  const handleNext = () => setCurrentPage(p => p < totalPages - 1 ? p + 1 : 0);

  // No entities configured
  if (entities.length === 0) {
    return (
      <div className="panel">
        <PanelHeader icon={Home} title={t('smartHome')} />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px', fontSize: '14px' }}>
            {isConnected ? t('addEntitiesInSetup') : t('connectHomeAssistantInSetup')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <PanelHeader
        icon={Home}
        title={t('smartHome')}
        currentPage={currentPage + 1}
        totalPages={totalPages}
        onPrev={handlePrev}
        onNext={handleNext}
        badge={!isConnected && (
          <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--warning)', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> {t('connecting')}
          </span>
        )}
      />
      <div className="panel-content">
        <div className="ha-grid">
          {paginatedEntities.map((entity) => {
            const IconComponent = iconMap[entity.icon] || Home;
            const isOn = isEntityOn(entity.id);
            const isDisplay = entity.type === 'display';
            const isLoading = loading[entity.id];
            const displayValue = getEntityValue(entity.id);
            const isLight = isLightEntity(entity);
            const brightnessValue = isLight && isOn ? getBrightnessDisplay(entity.id) : null;

            return (
              <button
                key={entity.id}
                className={`touch-button ${isOn ? 'active' : ''}`}
                onPointerDown={() => handlePointerDown(entity)}
                onPointerUp={() => handlePointerUp(entity)}
                onPointerLeave={handlePointerLeave}
                onContextMenu={(e) => e.preventDefault()}
                disabled={isLoading || !isConnected}
                style={isDisplay ? { cursor: 'default' } : {}}
              >
                {isLoading ? (
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <IconComponent size={24} className="button-icon" />
                )}
                <span className="button-label">{entity.name}</span>
                {isDisplay && displayValue && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent-primary)' }}>{displayValue}</span>
                )}
                {brightnessValue !== null && !isDisplay && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{brightnessValue}%</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Brightness Modal */}
      {brightnessModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setBrightnessModal(null)}
        >
          <div
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '24px',
              width: '280px',
              textAlign: 'center'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sun size={20} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{brightnessModal.name}</span>
              </div>
              <button
                onClick={() => setBrightnessModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              fontSize: '48px',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-primary)',
              marginBottom: '20px'
            }}>
              {brightness}%
            </div>

            <input
              type="range"
              min="1"
              max="100"
              value={brightness}
              onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${brightness}%, var(--bg-secondary) ${brightness}%, var(--bg-secondary) 100%)`,
                appearance: 'none',
                cursor: 'pointer',
                marginBottom: '16px'
              }}
            />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {[25, 50, 75, 100].map(val => (
                <button
                  key={val}
                  onClick={() => { vibrate(20); handleBrightnessChange(val); }}
                  style={{
                    padding: '8px 12px',
                    background: brightness === val ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: brightness === val ? '#000' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {val}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          background: var(--accent-primary);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 10px var(--accent-glow-strong);
        }
      `}</style>
    </div>
  );
}
