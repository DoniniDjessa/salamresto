"use client";
import { useEffect, useState } from 'react';
import { X, Printer } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

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
  cash:   'ESPECES',
  wave:   'WAVE',
  orange: 'ORANGE MONEY',
};

const BEBAS  = 'var(--font-bebas), "Bebas Neue", sans-serif';
const OSWALD = 'var(--font-oswald), "Oswald", sans-serif';
const MONO   = '"Courier New", Courier, monospace';
const SEP    = '- '.repeat(80);

function Sep({ big = false }: { big?: boolean }) {
  return (
    <p style={{
      fontSize: '8px', overflow: 'hidden', whiteSpace: 'nowrap',
      margin: big ? '10px 0' : '6px 0',
      lineHeight: 1, color: '#888', padding: 0, letterSpacing: '0.02em',
    }}>
      {SEP}
    </p>
  );
}

function fmt(n: number) { return n.toLocaleString('fr-FR') + ' CFA'; }

export default function ReceiptModal({ order, onClose }: { order: ReceiptOrder; onClose: () => void }) {
  const { profile } = useAuth();

  const [promotionPct, setPromotionPct] = useState(0);
  const [address,      setAddress]      = useState('Abidjan, Cocody Angré');
  const [phone,        setPhone]        = useState('+225 07 67 06 13 00');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    supabase.from('resto-settings').select('key,value')
      .in('key', ['promotion_pct', 'restaurant_address', 'restaurant_phone'])
      .then(({ data }) => {
        if (!data) return;
        const m = Object.fromEntries(data.map((r: any) => [r.key, r.value]));
        if (m.promotion_pct)      setPromotionPct(Number(m.promotion_pct));
        if (m.restaurant_address) setAddress(m.restaurant_address);
        if (m.restaurant_phone)   setPhone(m.restaurant_phone);
      });
  }, []);

  const handlePrint = () => {
    document.body.classList.add('receipt-printing');
    window.addEventListener('afterprint', () => document.body.classList.remove('receipt-printing'), { once: true });
    window.print();
  };

  const d        = new Date(order.created_at);
  const dateStr  = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr  = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const ticketCode = (order.session_id || order.id).slice(0, 10).toUpperCase();

  const items     = order.items ?? [];
  const subtotal  = order.total ?? 0;
  const reduction = promotionPct > 0 ? Math.round(subtotal * promotionPct / 100) : 0;
  const netAmount = subtotal - reduction;

  const cashierName = (profile?.name || 'ADMIN').toUpperCase();

  const paper: React.CSSProperties = {
    fontFamily: OSWALD,
    fontSize: '11px', lineHeight: 1.4, color: '#1a1a1a',
    background: 'white', borderRadius: '12px', padding: '14px 12px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
    maxHeight: '85vh', overflowY: 'auto',
  };

  const colCode: React.CSSProperties = { width: '24px', flexShrink: 0 };
  const colName: React.CSSProperties = { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
  const colAmt:  React.CSSProperties = { width: '58px', textAlign: 'right', flexShrink: 0 };

  return (
    <ModalPortal>
    <div className="receipt-backdrop" onClick={onClose} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
      zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '0.75rem',
      }}>

        {/* Controls */}
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={handlePrint} style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            padding: '0.6rem 1.25rem', borderRadius: '10px',
            background: '#F97316', color: 'white', border: 'none',
            fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(249,115,22,0.38)',
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

        {/* ── Receipt paper ── */}
        <div id="receipt-print" style={paper}>

          {/* HEADER */}
          <div style={{ textAlign: 'center', paddingBottom: '8px', paddingTop: '4px' }}>
            <p style={{ fontFamily: BEBAS, fontSize: '26px', letterSpacing: '0.12em', lineHeight: 1, margin: 0 }}>
              MARMITE D'OR
            </p>
            <p style={{ fontFamily: BEBAS, fontSize: '10px', letterSpacing: '0.18em', color: '#555', margin: '1px 0 3px' }}>
              RESTAURANT · BAR
            </p>
            <p style={{ fontFamily: MONO, fontSize: '9px', color: '#444', margin: '1px 0' }}>{address}</p>
            <p style={{ fontFamily: MONO, fontSize: '9px', color: '#444', margin: '1px 0', fontWeight: '600' }}>{phone}</p>
          </div>

          {/* CLIENT INFO — only for external/delivery orders */}
          {(order.customername || order.contactphone || order.deliveryaddress) && (
            <>
              <Sep />
              {order.customername && (
                <p style={{ fontFamily: MONO, fontSize: '9px', color: '#444', margin: '1px 0' }}>
                  CLIENT : {order.customername.toUpperCase()}
                </p>
              )}
              {order.contactphone && (
                <p style={{ fontFamily: MONO, fontSize: '9px', color: '#444', margin: '1px 0' }}>
                  TÉL : {order.contactphone}
                </p>
              )}
            </>
          )}

          <Sep />

          {/* COLUMN HEADERS */}
          <div style={{ display: 'flex', fontFamily: BEBAS, fontSize: '10px', letterSpacing: '0.08em', color: '#444', paddingTop: '3px', paddingBottom: '3px' }}>
            <span style={colCode}>CODE</span>
            <span style={colName}>NOM DU PRODUIT</span>
            <span style={colAmt}>MONTANT</span>
          </div>

          <Sep />

          {/* LINE ITEMS */}
          <div style={{ padding: '6px 0' }}>
            {items.map((item, i) => {
              const lineTotal = (item.price ?? 0) * item.quantity;
              const label = item.quantity > 1
                ? `${item.name.toUpperCase()} X${item.quantity}`
                : item.name.toUpperCase();
              return (
                <div key={i} style={{ display: 'flex', fontSize: '10px', fontWeight: 400, marginBottom: '2px' }}>
                  <span style={{ ...colCode, color: '#888' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={colName} title={label}>{label}</span>
                  <span style={{ ...colAmt, fontWeight: 400 }}>
                    {lineTotal > 0 ? lineTotal.toLocaleString('fr-FR') : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          <Sep />

          {/* TOTAL */}
          <div style={{ padding: '5px 0' }}>
            <div style={{ display: 'flex', fontFamily: BEBAS, fontSize: '13px', letterSpacing: '0.08em', marginBottom: '4px' }}>
              <span style={{ flex: 1 }}>TOTAL</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <p style={{ fontFamily: BEBAS, fontSize: '13px', letterSpacing: '0.08em', margin: '0 0 2px' }}>MONTANT TOTAL</p>
            <p style={{ fontFamily: BEBAS, fontSize: '45px', letterSpacing: '0.04em', lineHeight: 1, margin: 0 }}>
              {fmt(subtotal)}
            </p>
          </div>

          {/* RÉDUCTION */}
          {reduction > 0 && (
            <>
              <Sep />
              <div style={{ display: 'flex', fontSize: '10px', fontWeight: 400 }}>
                <span style={{ flex: 1 }}>RÉDUCTION ({promotionPct}%)</span>
                <span style={{ color: '#C00' }}>-{fmt(reduction)}</span>
              </div>
              <div style={{ display: 'flex', fontFamily: BEBAS, fontSize: '14px', letterSpacing: '0.04em' }}>
                <span style={{ flex: 1 }}>NET À PAYER</span>
                <span>{fmt(netAmount)}</span>
              </div>
            </>
          )}

          <Sep big />

          {/* TICKET CODE */}
          <p style={{ textAlign: 'center', fontFamily: MONO, fontSize: '10px', fontWeight: 400, letterSpacing: '0.14em', margin: '4px 0' }}>
            {ticketCode}
          </p>

          {/* METADATA */}
          <div style={{ textAlign: 'center', fontSize: '9px', fontWeight: 400, color: '#444', lineHeight: 1.5 }}>
            <p style={{ margin: 0 }}>
              CAISSE 01 &nbsp;·&nbsp; CAISSIER {cashierName} &nbsp;·&nbsp; TICKET {ticketCode}
            </p>
            <p style={{ margin: 0 }}>
              MARMITE D'OR LE {dateStr} À {timeStr}
            </p>
          </div>

          {/* THANK YOU */}
          <p style={{ textAlign: 'center', fontSize: '11px', paddingTop: '8px', paddingBottom: '4px', margin: 0 }}>
            Merci de votre fidélité !
          </p>

        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
