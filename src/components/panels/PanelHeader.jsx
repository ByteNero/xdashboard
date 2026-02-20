import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

// Reusable panel header with navigation arrows
export default function PanelHeader({
  icon: Icon,
  title,
  badge,
  currentPage,
  totalPages,
  onPrev,
  onNext,
  onRefresh,
  children
}) {
  const showNav = totalPages > 1;

  return (
    <div className="panel-header">
      {Icon && <Icon size={18} className="panel-icon" />}
      <h2>{title}</h2>

      {badge}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {children}

        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '4px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Refresh"
          >
            <RefreshCw size={12} />
          </button>
        )}

        {showNav && (
          <>
            <button
              onClick={onPrev}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '4px',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', minWidth: '32px', textAlign: 'center' }}>
              {currentPage}/{totalPages}
            </span>
            <button
              onClick={onNext}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '4px',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ChevronRight size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
