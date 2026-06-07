"use client";
import { useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import ModalPortal from './ModalPortal';

export interface ReceiptOrder {
  id: string;
  session_id?: string | null;
  type: string;
  tablenumber?: number | null;
  customername?: string | null;
  deliveryaddress?: string | null;
  contactphone?: string | null;
  items?: Array<{ name: string; quantity: number; price?: number }>;
  total?: number | null;
  created_at: string;
  payment_method?: string | null;
}

const PAY_LABELS: Record<string, string> = {
  cash: 'Espèces',
  wave: 'Wave',
  orange: 'Orange Money',
};

function Divider() {
  return <div style={{ borderTop: '1.5px dashed #E7E5E4', margin: '1rem 0' }} />;
}

function MetaRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.72rem', marginBottom: '0.3rem', gap: '1.5rem' }}>
      <span style={{ color: '#A8A29E', fontWeight: '700', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: '800', color: accent ? '#F97316' : '#1C1917', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function ReceiptModal({ order, onClose }: { order: ReceiptOrder; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handlePrint = () => {
    document.body.classList.add('receipt-printing');
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('receipt-printing');
    }, { once: true });
    window.print();
  };

  const d = new Date(order.created_at);
  const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const typeLabel =
    order.type === 'salle'    ? `Table ${order.tablenumber}`
    : order.type === 'comptoir' ? 'Emporté'
    : 'Livraison';

  const items = order.items ?? [];
  const hasItemPrices = items.some(i => (i.price ?? 0) > 0);

  return (
    <ModalPortal>
    {/* Backdrop */}
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
      zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      {/* Wrapper — stops click propagation */}
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '0.75rem',
      }}>

        {/* Top controls (hidden at print time) */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={handlePrint} style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            padding: '0.6rem 1.25rem', borderRadius: '10px',
            background: '#F97316', color: 'white', border: 'none',
            fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(249,115,22,0.38)',
            letterSpacing: '0.02em',
          }}>
            <Printer size={15} /> Imprimer
          </button>
          <button onClick={onClose} style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Receipt paper — this is what gets printed */}
        <div id="receipt-content" style={{
          background: 'white', borderRadius: '16px', padding: '1.75rem 1.5rem',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          fontFamily: '"Courier New", Courier, monospace',
          maxHeight: '80vh', overflowY: 'auto',
        }}>
          {/* ── Header ── */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{
              width: '54px', height: '54px', borderRadius: '15px',
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 0.875rem',
              boxShadow: '0 6px 22px rgba(249,115,22,0.32)',
            }}>
              <span style={{ fontSize: '1.65rem' }}>🍲</span>
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '900', margin: '0 0 0.2rem', letterSpacing: '0.04em' }}>
              Marmite d'Or
            </h2>
            <p style={{ fontSize: '0.58rem', color: '#A8A29E', margin: 0, letterSpacing: '0.12em', fontWeight: '700' }}>
              RESTAURANT · BAR
            </p>
          </div>

          <Divider />

          {/* ── Order meta ── */}
          <MetaRow label="N° commande" value={`#${(order.session_id || order.id).slice(0, 6).toUpperCase()}`} />
          <MetaRow label="Date" value={dateStr} />
          <MetaRow label="Heure" value={timeStr} />
          <MetaRow label="Type" value={typeLabel} accent />
          {order.customername  && <MetaRow label="Client"     value={order.customername} />}
          {order.contactphone  && <MetaRow label="Téléphone"  value={order.contactphone} />}
          {order.deliveryaddress && <MetaRow label="Adresse"  value={order.deliveryaddress} />}

          <Divider />

          {/* ── Items ── */}
          <p style={{ fontSize: '0.58rem', fontWeight: '900', color: '#A8A29E', letterSpacing: '0.12em', marginBottom: '0.6rem' }}>
            ARTICLES COMMANDÉS
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', gap: '0.45rem', flex: 1, minWidth: 0 }}>
                  <span style={{ color: '#F97316', fontWeight: '900', flexShrink: 0 }}>{item.quantity}×</span>
                  <span style={{ fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                </div>
                {hasItemPrices && (item.price ?? 0) > 0 && (
                  <span style={{ fontWeight: '800', flexShrink: 0, marginLeft: '1rem', color: '#1C1917' }}>
                    {((item.price ?? 0) * item.quantity).toLocaleString()} F
                  </span>
                )}
              </div>
            ))}
          </div>

          <Divider />

          {/* ── Total ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '900', color: '#78716C', letterSpacing: '0.1em' }}>
              TOTAL À PAYER
            </span>
            <span style={{ fontSize: '1.45rem', fontWeight: '900', color: '#1C1917' }}>
              {(order.total ?? 0).toLocaleString()} F
            </span>
          </div>
          {order.payment_method && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
              <span style={{ color: '#A8A29E', fontWeight: '700' }}>Règlement</span>
              <span style={{ fontWeight: '900', color: '#10B981' }}>
                {PAY_LABELS[order.payment_method] ?? order.payment_method}
              </span>
            </div>
          )}

          <Divider />

          {/* ── Footer ── */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#1C1917', marginBottom: '0.3rem' }}>
              Merci de votre visite ! 🙏
            </p>
            <p style={{ fontSize: '0.58rem', color: '#A8A29E', letterSpacing: '0.12em', fontWeight: '700' }}>
              MARMITE D'OR · À BIENTÔT
            </p>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
