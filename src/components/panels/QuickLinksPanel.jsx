import { useState } from 'react';
import {
  Link, ExternalLink, Plus, Trash2, Edit3, Check, X,
  Home, Server, Database, Cloud, Monitor, Settings,
  Shield, Film, Music, Tv, HardDrive, Wifi, Globe,
  Github, Mail, Calendar, FileText, Folder, Terminal,
  Play, Camera, Cpu, Activity, BarChart2, Lock
} from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';
import { getLabel } from '../../utils/translations';

// Icon options for quick links
const ICONS = {
  link: Link,
  home: Home,
  server: Server,
  database: Database,
  cloud: Cloud,
  monitor: Monitor,
  settings: Settings,
  shield: Shield,
  film: Film,
  music: Music,
  tv: Tv,
  harddrive: HardDrive,
  wifi: Wifi,
  globe: Globe,
  github: Github,
  mail: Mail,
  calendar: Calendar,
  file: FileText,
  folder: Folder,
  terminal: Terminal,
  play: Play,
  camera: Camera,
  cpu: Cpu,
  activity: Activity,
  chart: BarChart2,
  lock: Lock
};

// Color presets
const COLORS = [
  '#4285f4', // Blue
  '#00d4ff', // Cyan
  '#34a853', // Green
  '#fbbc04', // Yellow
  '#ea4335', // Red
  '#9333ea', // Purple
  '#f97316', // Orange
  '#ec4899', // Pink
  '#6b7280', // Gray
];

// Quick link card
const LinkCard = ({ link, onEdit, onDelete }) => {
  const Icon = ICONS[link.icon] || Link;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        background: 'var(--bg-card)',
        borderRadius: '8px',
        borderLeft: `3px solid ${link.color || 'var(--accent-primary)'}`,
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
        width: '32px',
        height: '32px',
        borderRadius: '6px',
        background: `${link.color || 'var(--accent-primary)'}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={16} style={{ color: link.color || 'var(--accent-primary)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {link.name}
        </div>
        {link.description && (
          <div style={{
            fontSize: '9px',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {link.description}
          </div>
        )}
      </div>
      <ExternalLink size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </a>
  );
};

// Add/Edit link form
const LinkForm = ({ link, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: link?.name || '',
    url: link?.url || '',
    description: link?.description || '',
    icon: link?.icon || 'link',
    color: link?.color || '#00d4ff'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name && formData.url) {
      onSave({
        ...link,
        id: link?.id || Date.now().toString(),
        ...formData
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <input
        type="text"
        placeholder="Name"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        style={{
          padding: '8px 10px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          color: 'var(--text-primary)',
          fontSize: '11px'
        }}
        required
      />
      <input
        type="url"
        placeholder="URL (https://...)"
        value={formData.url}
        onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
        style={{
          padding: '8px 10px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          color: 'var(--text-primary)',
          fontSize: '11px'
        }}
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={formData.description}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        style={{
          padding: '8px 10px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          color: 'var(--text-primary)',
          fontSize: '11px'
        }}
      />

      {/* Icon selection */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
        {Object.entries(ICONS).map(([key, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, icon: key }))}
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: formData.icon === key ? formData.color + '30' : 'transparent',
              border: `1px solid ${formData.icon === key ? formData.color : 'transparent'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              color: formData.icon === key ? formData.color : 'var(--text-muted)'
            }}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>

      {/* Color selection */}
      <div style={{ display: 'flex', gap: '6px', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
        {COLORS.map(color => (
          <button
            key={color}
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, color }))}
            style={{
              width: '24px',
              height: '24px',
              background: color,
              border: formData.color === color ? '2px solid white' : 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              boxShadow: formData.color === color ? '0 0 0 2px var(--bg-primary)' : 'none'
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button
          type="submit"
          style={{
            flex: 1,
            padding: '8px',
            background: 'var(--accent-primary)',
            border: 'none',
            borderRadius: '4px',
            color: '#000',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <Check size={12} />
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            color: 'var(--text-muted)',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <X size={12} />
          Cancel
        </button>
      </div>
    </form>
  );
};

export default function QuickLinksPanel({ config }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const { integrations, updateIntegration, settings } = useDashboardStore();
  const language = settings?.language || 'en-GB';
  const t = (key) => getLabel(key, language);

  const quickLinks = integrations.quickLinks || [];

  const handleSave = (link) => {
    const exists = quickLinks.find(l => l.id === link.id);
    if (exists) {
      updateIntegration('quickLinks', quickLinks.map(l => l.id === link.id ? link : l));
    } else {
      updateIntegration('quickLinks', [...quickLinks, link]);
    }
    setIsAdding(false);
    setEditingLink(null);
  };

  const handleDelete = (linkId) => {
    updateIntegration('quickLinks', quickLinks.filter(l => l.id !== linkId));
  };

  return (
    <div className="panel">
      <PanelHeader icon={Link} title={t('quickLinks')}>
        {!isAdding && !editingLink && (
          <button
            onClick={() => setIsAdding(true)}
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
            title="Add Link"
          >
            <Plus size={12} />
          </button>
        )}
      </PanelHeader>

      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'auto' }}>
        {(isAdding || editingLink) ? (
          <LinkForm
            link={editingLink}
            onSave={handleSave}
            onCancel={() => {
              setIsAdding(false);
              setEditingLink(null);
            }}
          />
        ) : quickLinks.length > 0 ? (
          quickLinks.map(link => (
            <LinkCard
              key={link.id}
              link={link}
              onEdit={() => setEditingLink(link)}
              onDelete={() => handleDelete(link.id)}
            />
          ))
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '14px' }}>
            <Link size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>{t('noQuickLinks')}</div>
            <div style={{ fontSize: '11px', marginTop: '8px' }}>{t('clickToAddLink')}</div>
          </div>
        )}
      </div>
    </div>
  );
}
