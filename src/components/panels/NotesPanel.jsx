import { useState } from 'react';
import { StickyNote } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';
import { getLabel } from '../../utils/translations';

const ITEMS_PER_PAGE = 5;

export default function NotesPanel({ config }) {
  const { integrations, settings } = useDashboardStore();
  const [currentPage, setCurrentPage] = useState(0);
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  const notes = (integrations.notes || []).filter(n => n.text?.trim());
  const totalPages = Math.ceil(notes.length / ITEMS_PER_PAGE);
  const paginatedNotes = notes.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const handlePrev = () => setCurrentPage(p => p > 0 ? p - 1 : totalPages - 1);
  const handleNext = () => setCurrentPage(p => p < totalPages - 1 ? p + 1 : 0);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(language, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="panel">
      <PanelHeader
        icon={StickyNote}
        title={t('notes')}
        currentPage={currentPage + 1}
        totalPages={totalPages}
        onPrev={handlePrev}
        onNext={handleNext}
      />
      <div className="panel-content">
        {notes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {paginatedNotes.map((note) => (
              <div
                key={note.id}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  padding: '12px',
                  borderLeft: `3px solid ${note.color || 'var(--accent-primary)'}`
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: '1.4'
                  }}
                >
                  {note.text}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {formatDate(note.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '14px' }}>
            <StickyNote size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <div>{t('noNotes')}</div>
            <div style={{ fontSize: '12px', marginTop: '8px' }}>{t('addNotesInSetup')}</div>
          </div>
        )}
      </div>
    </div>
  );
}
