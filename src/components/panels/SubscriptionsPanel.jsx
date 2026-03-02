import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';

const ITEMS_PER_PAGE = 6;

const CURRENCY_SYMBOLS = { GBP: '£', USD: '$', EUR: '€' };

function getNextBillingDate(billingDay, billingCycle) {
  const now = new Date();
  const today = now.getDate();
  const day = Math.min(billingDay, 28);
  let next;

  if (billingCycle === 'yearly') {
    next = new Date(now.getFullYear(), now.getMonth(), day);
    if (next <= now) next = new Date(now.getFullYear() + 1, now.getMonth(), day);
  } else {
    next = new Date(now.getFullYear(), now.getMonth(), day);
    if (day <= today) next.setMonth(next.getMonth() + 1);
  }
  return next;
}

const CATEGORY_COLORS = {
  Streaming: '#e50914',
  Software: '#4285f4',
  Utilities: '#34a853',
  Gaming: '#9c27b0',
  Other: '#78909c'
};

export default function SubscriptionsPanel({ config }) {
  const { integrations, settings } = useDashboardStore();
  const [currentPage, setCurrentPage] = useState(0);
  const language = settings?.language || 'en-GB';

  const subs = (integrations.subscriptions || []).filter(s => s.enabled && s.name && s.amount);

  const enriched = subs.map(s => ({
    ...s,
    nextDate: getNextBillingDate(s.billingDay || 1, s.billingCycle || 'monthly'),
    monthlyAmount: s.billingCycle === 'yearly' ? parseFloat(s.amount) / 12 : parseFloat(s.amount)
  })).sort((a, b) => a.nextDate - b.nextDate);

  const monthlyTotal = enriched.reduce((sum, s) => sum + (s.monthlyAmount || 0), 0);
  const yearlyTotal = monthlyTotal * 12;

  const totalPages = Math.ceil(enriched.length / ITEMS_PER_PAGE);
  const paginated = enriched.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const handlePrev = () => setCurrentPage(p => p > 0 ? p - 1 : totalPages - 1);
  const handleNext = () => setCurrentPage(p => p < totalPages - 1 ? p + 1 : 0);

  const sym = CURRENCY_SYMBOLS[subs[0]?.currency] || CURRENCY_SYMBOLS.GBP;

  const formatDate = (date) => date.toLocaleDateString(language, { month: 'short', day: 'numeric' });

  return (
    <div className="panel">
      <PanelHeader
        icon={CreditCard}
        title="Subscriptions"
        currentPage={currentPage + 1}
        totalPages={totalPages}
        onPrev={handlePrev}
        onNext={handleNext}
        extra={enriched.length > 0 ? (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
            {sym}{monthlyTotal.toFixed(2)}/mo
          </span>
        ) : null}
      />
      <div className="panel-content">
        {enriched.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {paginated.map((sub) => {
              const csym = CURRENCY_SYMBOLS[sub.currency] || sym;
              return (
                <div
                  key={sub.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', background: 'var(--bg-card)',
                    borderRadius: '8px', borderLeft: `3px solid ${sub.color || 'var(--accent-primary)'}`
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sub.name}
                      </span>
                      {sub.category && (
                        <span style={{
                          fontSize: '9px', padding: '1px 6px', borderRadius: '10px',
                          background: `${CATEGORY_COLORS[sub.category] || 'var(--accent-primary)'}20`,
                          color: CATEGORY_COLORS[sub.category] || 'var(--accent-primary)',
                          fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
                          flexShrink: 0
                        }}>
                          {sub.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600', fontFamily: 'var(--font-mono, monospace)', flexShrink: 0 }}>
                    {csym}{parseFloat(sub.amount).toFixed(2)}
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '400' }}>
                      /{sub.billingCycle === 'yearly' ? 'yr' : 'mo'}
                    </span>
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'var(--font-mono, monospace)' }}>
                    {formatDate(sub.nextDate)}
                  </span>
                </div>
              );
            })}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 10px', marginTop: '2px',
              borderTop: '1px solid var(--border-color)',
              fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)'
            }}>
              <span>Monthly: {sym}{monthlyTotal.toFixed(2)}</span>
              <span>Yearly: {sym}{yearlyTotal.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '14px' }}>
            <CreditCard size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <div>No subscriptions</div>
            <div style={{ fontSize: '12px', marginTop: '8px' }}>Add subscriptions in Setup</div>
          </div>
        )}
      </div>
    </div>
  );
}
