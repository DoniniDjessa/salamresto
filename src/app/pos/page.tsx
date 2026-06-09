"use client";
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { OrderStatus } from '@/types';
import {
  TrendingUp, ShoppingBag, Clock, CheckCircle2,
  CreditCard, Search, Monitor, Smartphone, Utensils,
  Truck, MapPin, X, Pencil, Trash2, Check, Calendar, ChevronLeft, ChevronRight,
  Eye, User, Phone, ArrowUpDown, GitMerge
} from 'lucide-react';
import RoleGuard from '@/components/RoleGuard';
import ModalPortal from '@/components/ModalPortal';
import { useAuth } from '@/context/AuthContext';

/* ─── helpers ──────────────────────────────────────────────── */
const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const yesterdayStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const monthStart = () => {
  const d = new Date();
  d.setDate(1); d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const CAT_GROUPS: Record<string, string[]> = {
  nourriture: ['plat principal', 'dessert', 'collation', 'garniture', 'garnitures', 'autres'],
  boisson:    ['boissons', 'boisson', 'the/cafe', 'thé/café', 'the / cafe', 'café', 'cafe', 'tea'],
  vin:        ['cave', 'vins', 'vin'],
};

const PAID = (s: string) => s === 'termine' || s === 'paye';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  en_attente:    { label: 'En attente',     cls: 'badge-warning' },
  en_preparation:{ label: 'En préparation', cls: 'badge-info'    },
  pret:          { label: 'Prête ✓',        cls: 'badge-success' },
  termine:       { label: 'Réglée',         cls: 'badge-neutral' },
  paye:          { label: 'Clôturée',       cls: 'badge-neutral' },
  en_livraison:  { label: 'En livraison',   cls: 'badge-warning' },
  livre:         { label: 'Livrée',         cls: 'badge-success' },
};

const sourceLabel = (o: any) => {
  if (o.type === 'salle')    return { icon: <Monitor size={14}/>,    text: `Table ${o.tablenumber}` };
  if (o.type === 'comptoir') return { icon: <Utensils size={14}/>,   text: o.customername || 'Comptoir' };
  return                            { icon: <Smartphone size={14}/>, text: o.customername || 'Livraison' };
};

const thStyle: React.CSSProperties = {
  padding: '0.7rem 1rem', textAlign: 'left', fontWeight: '800',
  fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em',
  textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)',
  background: 'var(--bg-secondary)', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-color)',
  fontSize: '0.82rem', verticalAlign: 'middle',
};

/* ─── category helper ────────────────────────────────────────── */
function getItemCat(i: any, lookup: Record<string, string>): string {
  const stored = (i.category || '').toLowerCase().trim();
  if (stored) return stored;
  return lookup[i.id?.split?.('__')?.[0]] ?? lookup[i.name?.toLowerCase?.()?.trim?.()] ?? '';
}

/* ─── helpers for display-row grouping ──────────────────────── */
function mergeGroupIntoRow(grp: any[], idSuffix: string): any {
  const itemMap = new Map<string, any>();
  grp.forEach(o =>
    (o.items || []).forEach((it: any) => {
      const k = (it.name || '').toLowerCase().trim();
      if (itemMap.has(k)) itemMap.get(k).quantity += (it.quantity || 1);
      else itemMap.set(k, { ...it });
    })
  );
  const earliest = grp.reduce((a, b) =>
    new Date(a.created_at) <= new Date(b.created_at) ? a : b
  );
  const latest = grp.reduce((a, b) =>
    new Date(a.created_at) >= new Date(b.created_at) ? a : b
  );
  const STATUS_PRIORITY = ['pret', 'en_preparation', 'en_attente', 'en_livraison', 'livre', 'termine', 'paye'];
  let groupStatus = grp[0].status;
  for (const s of STATUS_PRIORITY) {
    if (grp.some(o => o.status === s)) { groupStatus = s; break; }
  }
  return {
    _isGroup: true,
    _orders: grp,
    _orderCount: grp.length,
    _latestAt: latest.created_at,
    id: 'group_' + idSuffix,
    session_id: grp.find(o => o.session_id)?.session_id ?? null,
    type: 'salle',
    tablenumber: grp[0].tablenumber,
    customername: null, deliveryaddress: null, contactphone: null,
    items: Array.from(itemMap.values()),
    total: grp.reduce((s, o) => s + (o.total || 0), 0),
    status: groupStatus,
    payment_method: grp.find(o => o.payment_method)?.payment_method ?? null,
    created_at: earliest.created_at,
  };
}

/* ─── group salle orders: session_id first, table+day fallback ── */
function buildDisplayRows(sorted: any[]): any[] {
  // Single-pass: collect groups maintaining first-seen order
  const groupMap  = new Map<string, any[]>();
  const keyOrder: string[] = [];

  sorted.forEach(o => {
    let k: string;
    if (o.type !== 'salle' || o.tablenumber == null) {
      // Non-table orders: one slot per order
      k = `__${o.id}`;
    } else if (o.session_id) {
      k = `s_${o.session_id}`;
    } else {
      // Legacy orders without session_id: group by table + calendar day
      k = `td_${o.tablenumber}_${new Date(o.created_at).toDateString()}`;
    }
    if (!groupMap.has(k)) {
      groupMap.set(k, []);
      keyOrder.push(k);
    }
    groupMap.get(k)!.push(o);
  });

  return keyOrder.map(k => {
    const grp = groupMap.get(k)!;
    if (grp.length === 1) return grp[0];
    return mergeGroupIntoRow(grp, k);
  });
}

/* ─── main content ─────────────────────────────────────────── */
function VentesContent() {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'superAdmin';

  const [orders,     setOrders]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [period,     setPeriod]     = useState<'today' | 'yesterday' | 'month' | 'month-pick' | 'range'>('today');
  const [monthPick,  setMonthPick]  = useState<string>(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; });
  const [catFilter,  setCatFilter]  = useState<'all' | 'nourriture' | 'boisson' | 'vin'>('all');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [search,     setSearch]     = useState('');

  const [detailOrder, setDetailOrder] = useState<any | null>(null);

  // superAdmin edit modal (total + date)
  interface EditModalState { id: string; session_id?: string | null; total: string; date: string; }
  const [editModal, setEditModal] = useState<EditModalState | null>(null);

  // pagination + sort
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(false); // false = newest first (default)

  const [showDuplicates, setShowDuplicates] = useState(false);
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryOrder, setDeliveryOrder] = useState<any | null>(null);
  const [deliveryForm, setDeliveryForm] = useState({ customername: '', contactphone: '', deliveryaddress: '', startNow: true });

  const [allProducts, setAllProducts] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('resto-products').select('id,name,category').then(({ data }) => {
      if (data) setAllProducts(data);
    });
  }, []);

  // name/id → category lookup for orders that predate the category field on items
  const prodCatLookup = allProducts.reduce<Record<string, string>>((acc, p) => {
    if (p.id)   acc[p.id]                          = (p.category || '').toLowerCase().trim();
    if (p.name) acc[p.name.toLowerCase().trim()]   = (p.category || '').toLowerCase().trim();
    return acc;
  }, {});

  useEffect(() => {
    fetchOrders();
    const ch = supabase.channel('ventes-live')
      .on('postgres_changes', { event: '*', table: 'resto-orders', schema: 'public' }, fetchOrders)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [period, startDate, endDate, monthPick]);

  async function fetchOrders() {
    setLoading(true);
    let q = supabase.from('resto-orders').select('*').order('created_at', { ascending: false });

    if (period === 'today') {
      q = q.gte('created_at', todayStart());
    } else if (period === 'yesterday') {
      q = q.gte('created_at', yesterdayStart()).lt('created_at', todayStart());
    } else if (period === 'month') {
      q = q.gte('created_at', monthStart());
    } else if (period === 'month-pick' && monthPick) {
      const [y, m] = monthPick.split('-').map(Number);
      q = q.gte('created_at', new Date(y, m-1, 1).toISOString())
           .lte('created_at', new Date(y, m, 0, 23, 59, 59).toISOString());
    } else if (period === 'range' && startDate && endDate) {
      const end = new Date(endDate); end.setDate(end.getDate() + 1);
      q = q.gte('created_at', new Date(startDate).toISOString()).lte('created_at', end.toISOString());
    } else if (period === 'range') {
      q = q.gte('created_at', todayStart());
    }

    const { data } = await q;
    if (data) setOrders(data);
    setLoading(false);
  }

  async function encaisser(id: string) {
    await supabase.from('resto-orders').update({ status: 'termine' as OrderStatus }).eq('id', id);
    fetchOrders();
  }

  async function encaisserExternal(id: string) {
    await supabase.from('resto-orders').update({ status: 'paye' as OrderStatus }).eq('id', id);
    fetchOrders();
  }

  async function encaisserGroup(grpOrders: any[]) {
    const pretOnes = grpOrders.filter(o => o.status === 'pret');
    await Promise.all(pretOnes.map(o =>
      supabase.from('resto-orders').update({ status: 'termine' as OrderStatus }).eq('id', o.id)
    ));
    fetchOrders();
  }

  const toDatetimeLocal = (iso: string) => {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const openEditModal = (o: any) => {
    setEditModal({ id: o.id, session_id: o.session_id ?? null, total: String(o.total ?? 0), date: toDatetimeLocal(o.created_at) });
  };

  const saveEdit = async () => {
    if (!editModal) return;
    const total = parseFloat(editModal.total);
    if (isNaN(total) || total < 0) { alert('Montant invalide'); return; }
    const newDate = new Date(editModal.date).toISOString();

    if (editModal.session_id) {
      // Total → this sub-order only; Date → every order in the session
      const [r1, r2] = await Promise.all([
        supabase.from('resto-orders').update({ total }).eq('id', editModal.id),
        supabase.from('resto-orders').update({ created_at: newDate }).eq('session_id', editModal.session_id),
      ]);
      if (r1.error) { alert('Erreur sauvegarde: ' + r1.error.message); return; }
      if (r2.error) { alert('Erreur sauvegarde: ' + r2.error.message); return; }
    } else {
      const { error } = await supabase.from('resto-orders')
        .update({ total, created_at: newDate })
        .eq('id', editModal.id);
      if (error) { alert('Erreur sauvegarde: ' + error.message); return; }
    }

    setEditModal(null);
    fetchOrders();
  };

  async function deleteOrder(o: any) {
    const label = o._isGroup
      ? `Supprimer la session complète (${(o._orders || []).length} commandes) ?`
      : 'Supprimer cette commande ?';
    if (!window.confirm(label)) return;
    if (o._isGroup) {
      const ids = (o._orders || []).map((r: any) => r.id);
      await supabase.from('resto-orders').delete().in('id', ids);
    } else {
      await supabase.from('resto-orders').delete().eq('id', o.id);
    }
    fetchOrders();
  }

  async function deleteItemFromOrder(orderId: string, itemIndex: number, currentItems: any[]) {
    const newItems = currentItems.filter((_, i) => i !== itemIndex);
    const newTotal = newItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    const { error } = await supabase.from('resto-orders')
      .update({ items: newItems, total: newTotal })
      .eq('id', orderId);
    if (error) { alert('Erreur: ' + error.message); return; }
    // Refresh detail view and list
    setDetailOrder((prev: any) => prev ? { ...prev, items: newItems, total: newTotal } : prev);
    fetchOrders();
  }

  const openDeliveryModal = (o: any) => {
    setDeliveryOrder(o);
    setDeliveryForm({ customername: o.customername || '', contactphone: o.contactphone || '', deliveryaddress: o.deliveryaddress || '', startNow: true });
    setShowDeliveryModal(true);
  };

  const saveDelivery = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!deliveryOrder) return;
    const updates: any = {
      customername: deliveryForm.customername,
      contactphone: deliveryForm.contactphone,
      deliveryaddress: deliveryForm.deliveryaddress,
    };
    if (deliveryForm.startNow) updates.status = 'en_livraison';
    await supabase.from('resto-orders').update(updates).eq('id', deliveryOrder.id);
    setShowDeliveryModal(false);
    setDeliveryOrder(null);
    fetchOrders();
  };

  async function mergeSelected() {
    const toMerge = orders.filter(o => selectedIds.has(o.id));
    if (toMerge.length < 2) return;

    // Combine items — sum quantities for same product name
    const itemMap = new Map<string, any>();
    toMerge.forEach(o => {
      (o.items || []).forEach((item: any) => {
        const key = (item.name || '').toLowerCase().trim();
        if (itemMap.has(key)) {
          itemMap.get(key).quantity = (itemMap.get(key).quantity || 1) + (item.quantity || 1);
        } else {
          itemMap.set(key, { ...item });
        }
      });
    });

    const mergedItems = Array.from(itemMap.values());
    const mergedTotal = toMerge.reduce((s, o) => s + (o.total || 0), 0);
    const base = toMerge.reduce((a, b) =>
      new Date(a.created_at) <= new Date(b.created_at) ? a : b
    );
    const allLivre  = toMerge.every(o => o.status === 'livre');
    const allPaid   = toMerge.every(o => PAID(o.status));
    const mergedStatus = allLivre ? 'livre' : allPaid ? 'termine' : base.status;

    const newOrder = {
      type: base.type,
      tablenumber:     base.tablenumber     ?? null,
      customername:    base.customername    ?? null,
      deliveryaddress: base.deliveryaddress ?? null,
      contactphone:    base.contactphone    ?? null,
      items:           mergedItems,
      total:           mergedTotal,
      status:          mergedStatus,
      payment_method:  base.payment_method  ?? null,
      created_at:      base.created_at,
    };

    const { error } = await supabase.from('resto-orders').insert([newOrder]);
    if (error) { alert('Erreur lors de la fusion: ' + error.message); return; }

    await supabase.from('resto-orders').delete().in('id', toMerge.map(o => o.id));

    setSelectedIds(new Set());
    setShowMergeModal(false);
    fetchOrders();
  }

  // Reset page whenever filter or sort changes
  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [search, period, startDate, endDate, monthPick, sortAsc, catFilter]);

  // Client-side filter — table, client name, item name, price
  const filtered = orders.filter(o => {
    if (!search.trim()) return true;
    const s = search.toLowerCase().trim();
    return (
      String(o.tablenumber || '').includes(s) ||
      (o.customername || '').toLowerCase().includes(s) ||
      (o.status || '').toLowerCase().includes(s) ||
      (o.items || []).some((i: any) => (i.name || '').toLowerCase().includes(s)) ||
      String(o.total ?? '').includes(s)
    );
  });

  // Table list: unaffected by category filter
  const sorted = [...filtered].sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sortAsc ? diff : -diff;
  });
  const displayRows = search.trim() ? sorted : buildDisplayRows(sorted);
  const totalPages  = Math.max(1, Math.ceil(displayRows.length / PAGE_SIZE));
  const paginated   = displayRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Category-aware stat calculations — only tiles are affected, not the list
  const orderHasCat = (o: any) =>
    catFilter === 'all' ||
    (o.items || []).some((i: any) => CAT_GROUPS[catFilter].includes(getItemCat(i, prodCatLookup)));

  const revenue = filtered.filter(o => PAID(o.status)).reduce((a, o) => {
    if (catFilter === 'all') return a + (o.total || 0);
    // Sum only the matching items' amounts, not the whole order total
    return a + (o.items || []).reduce((s: number, i: any) =>
      CAT_GROUPS[catFilter].includes(getItemCat(i, prodCatLookup))
        ? s + (i.price || 0) * (i.quantity || 1)
        : s
    , 0);
  }, 0);

  const toSettle  = filtered.filter(o => o.status === 'pret' && orderHasCat(o));
  const inKitchen = filtered.filter(o => ['en_attente', 'en_preparation'].includes(o.status) && orderHasCat(o));
  const settled   = filtered.filter(o => PAID(o.status) && orderHasCat(o));
  const commandeCount = catFilter === 'all' ? filtered.length : filtered.filter(orderHasCat).length;

  const tiles = [
    { label: "CA ENCAISSÉ",         value: `${revenue.toLocaleString()} F`, icon: <TrendingUp size={18}/>, color: 'var(--accent-primary)',  bg: 'rgba(249,115,22,0.09)'  },
    { label: "COMMANDES",           value: `${commandeCount}`,               icon: <ShoppingBag size={18}/>, color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.09)'  },
    { label: "À ENCAISSER",         value: `${toSettle.length}`,             icon: <CreditCard size={18}/>, color: 'var(--accent-warning)', bg: 'rgba(245,158,11,0.09)'  },
    { label: "EN CUISINE",          value: `${inKitchen.length}`,            icon: <Clock size={18}/>,      color: '#6366F1',               bg: 'rgba(99,102,241,0.09)'  },
  ];

  const periodLabel: Record<string, string> = { today: "Aujourd'hui", yesterday: 'Hier', month: 'Ce mois', 'month-pick': monthPick ? new Date(monthPick + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Mois', range: 'Période' };

  return (
    <RoleGuard allowedRoles={['superAdmin', 'admin', 'manager', 'caisse']}>
    <div className="page-wrap animate-fade-in">

      {/* Header */}
      <header className="page-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900' }}>Ventes</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
            <span className="live-dot" />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Caisse en temps réel · {periodLabel[period]}
            </p>
          </div>
        </div>
      </header>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>

        {/* Row 1: period + search */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Period selector */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border-color)', gap: '2px' }}>
            {(['today', 'yesterday', 'month', 'month-pick', 'range'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{ padding: '0.5rem 1rem', borderRadius: '9px', background: period === p ? 'white' : 'transparent', color: period === p ? 'var(--text-primary)' : 'var(--text-secondary)', border: 'none', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s', boxShadow: period === p ? 'var(--shadow-sm)' : 'none', whiteSpace: 'nowrap' }}>
                {p === 'today' ? "Aujourd'hui" : p === 'yesterday' ? 'Hier' : p === 'month' ? 'Ce Mois' : p === 'month-pick' ? 'Mois ↓' : 'Période'}
              </button>
            ))}
          </div>

          {/* Month picker */}
          {period === 'month-pick' && (
            <input
              type="month"
              value={monthPick}
              onChange={e => { if (e.target.value) setMonthPick(e.target.value); }}
              style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--accent-primary)', borderRadius: '9px', fontSize: '0.78rem', fontFamily: 'var(--font-body)', color: 'var(--text-primary)', background: 'white', outline: 'none', cursor: 'pointer' }}
            />
          )}

          {/* Date range inputs */}
          {period === 'range' && (
            <>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--border-color)', borderRadius: '9px', fontSize: '0.78rem', fontFamily: 'var(--font-body)', color: 'var(--text-primary)', background: 'white', outline: 'none' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--border-color)', borderRadius: '9px', fontSize: '0.78rem', fontFamily: 'var(--font-body)', color: 'var(--text-primary)', background: 'white', outline: 'none' }} />
            </>
          )}

          {/* Search + duplicate detector */}
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1.5px solid var(--border-color)', borderRadius: '10px', padding: '0.5rem 0.875rem', boxShadow: 'var(--shadow-sm)' }}>
              <Search size={14} color="var(--text-muted)" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Table, client, plat…"
                style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.8rem', width: '190px', fontFamily: 'var(--font-body)' }} />
            </div>
            <button onClick={() => setShowDuplicates(true)}
              title="Détecter les doublons"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.52rem 0.875rem', borderRadius: '10px', background: 'white', border: '1.5px solid var(--border-color)', cursor: 'pointer', fontWeight: '800', fontSize: '0.7rem', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-sm)', whiteSpace: 'nowrap' }}>
              <ArrowUpDown size={13} /> Doublons
            </button>
          </div>
        </div>

        {/* Row 2: category filter chips */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em', paddingRight: '0.25rem' }}>CATÉGORIE</span>
          {([
            { key: 'all',       label: 'Tout',       emoji: '📋' },
            { key: 'nourriture', label: 'Nourritures', emoji: '🍽️' },
            { key: 'boisson',   label: 'Boissons',    emoji: '🥤' },
            { key: 'vin',       label: 'Vins',        emoji: '🍷' },
          ] as const).map(({ key, label, emoji }) => {
            const active = catFilter === key;
            return (
              <button key={key} onClick={() => setCatFilter(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.38rem 0.875rem', borderRadius: '100px',
                  border: active ? '1.5px solid var(--accent-primary)' : '1.5px solid var(--border-color)',
                  background: active ? 'rgba(249,115,22,0.08)' : 'white',
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: '800', fontSize: '0.72rem', cursor: 'pointer',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                  boxShadow: active ? '0 0 0 3px rgba(249,115,22,0.12)' : 'var(--shadow-sm)',
                }}>
                <span style={{ fontSize: '0.8rem' }}>{emoji}</span> {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Stat tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
        {tiles.map(t => (
          <div key={t.label} className="stat-tile">
            <div className="stat-tile-top" style={{ background: t.color }} />
            <div className="stat-tile-icon" style={{ background: t.bg, color: t.color }}>{t.icon}</div>
            <p className="stat-tile-value">{t.value}</p>
            <p className="stat-tile-label">{t.label}</p>
          </div>
        ))}
      </div>

      {/* ── Orders table ── */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>

        {/* Table header bar */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontWeight: '800', fontSize: '0.9rem' }}>
            Commandes
            <span style={{ marginLeft: '0.5rem', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '0.1rem 0.5rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '700' }}>
              {displayRows.length}
            </span>
          </p>
          {toSettle.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-primary)' }}>
              <CreditCard size={12}/> {toSettle.length} à encaisser
            </span>
          )}
        </div>

        {/* Selection action bar */}
        {selectedIds.size > 0 && (
          <div style={{ padding: '0.6rem 1.25rem', background: 'rgba(99,102,241,0.06)', borderBottom: '1px solid rgba(99,102,241,0.18)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#6366F1', flex: 1 }}>
              {selectedIds.size} commande{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
            </span>
            {selectedIds.size >= 2 && (
              <button onClick={() => setShowMergeModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.42rem 1rem', background: '#6366F1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.72rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.35)', whiteSpace: 'nowrap' }}>
                <GitMerge size={13} /> Fusionner
              </button>
            )}
            <button onClick={() => setSelectedIds(new Set())}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.42rem 0.75rem', background: 'transparent', color: '#6366F1', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '8px', fontWeight: '700', fontSize: '0.72rem', cursor: 'pointer' }}>
              <X size={12} /> Tout déselectionner
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShoppingBag size={36} style={{ opacity: 0.25, marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.85rem' }}>Aucune commande sur cette période</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '36px', paddingRight: '0' }}>
                    <input type="checkbox"
                      checked={paginated.length > 0 && paginated.every(o => selectedIds.has(o.id))}
                      onChange={e => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) paginated.forEach(o => next.add(o.id));
                        else paginated.forEach(o => next.delete(o.id));
                        setSelectedIds(next);
                      }}
                      style={{ accentColor: '#6366F1', cursor: 'pointer', width: '14px', height: '14px' }}
                    />
                  </th>
                  <th style={thStyle}>
                    <button onClick={() => setSortAsc(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: '800', fontSize: '0.65rem', letterSpacing: '0.08em', padding: 0 }}>
                      DATE / HEURE
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <span style={{ color: !sortAsc ? 'var(--accent-primary)' : 'var(--border-color)', fontSize: '0.55rem', lineHeight: 1 }}>▼</span>
                        <span style={{ color:  sortAsc ? 'var(--accent-primary)' : 'var(--border-color)', fontSize: '0.55rem', lineHeight: 1 }}>▲</span>
                      </span>
                    </button>
                  </th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Articles <Eye size={10} style={{ opacity: 0.4, verticalAlign: 'middle', marginLeft: '0.25rem' }} /></th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                  <th style={thStyle}>Statut</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((o, idx) => {
                  const src    = sourceLabel(o);
                  const meta   = STATUS_META[o.status] || { label: o.status, cls: 'badge-neutral' };
                  const isPret = o.status === 'pret';
                  const time   = new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  const timeEnd = o._isGroup && o._latestAt !== o.created_at
                    ? new Date(o._latestAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    : null;
                  const date   = new Date(o.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                  const items  = o.items || [];
                  const totalQty = items.reduce((s: number, i: any) => s + (i.quantity || 1), 0);

                  // For groups, rowIds covers all sub-orders; for singles, just the one ID
                  const rowIds: string[] = o._isGroup ? o._orders.map((x: any) => x.id) : [o.id];
                  const isSelected = rowIds.length > 0 && rowIds.every(id => selectedIds.has(id));
                  const baseBg = isSelected ? 'rgba(99,102,241,0.05)'
                    : o._isGroup ? 'rgba(16,185,129,0.02)'
                    : isPret ? 'rgba(249,115,22,0.02)'
                    : idx % 2 === 0 ? 'white' : 'var(--bg-secondary)';

                  return (
                    <tr key={o.id}
                      onClick={() => setDetailOrder(o)}
                      style={{ background: baseBg, transition: 'background 0.1s', cursor: 'pointer' }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(249,115,22,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = baseBg; }}
                    >
                      {/* Checkbox */}
                      <td style={{ ...tdStyle, width: '36px', paddingRight: '0' }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox"
                          checked={isSelected}
                          onChange={e => {
                            const next = new Set(selectedIds);
                            rowIds.forEach(id => { if (e.target.checked) next.add(id); else next.delete(id); });
                            setSelectedIds(next);
                          }}
                          style={{ accentColor: '#6366F1', cursor: 'pointer', width: '14px', height: '14px' }}
                        />
                      </td>
                      {/* Time */}
                      <td style={tdStyle}>
                        <p style={{ fontWeight: '700' }}>{time}{timeEnd ? ` – ${timeEnd}` : ''}</p>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{date}</p>
                      </td>

                      {/* Source */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                          {src.icon}
                          <div>
                            <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{src.text}</span>
                            {o.type === 'salle' && (
                              <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '700', marginTop: '0.05rem', fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                                #{(o.session_id || o.id).slice(0, 6).toUpperCase()}
                                {o._isGroup && ` · ${o._orderCount} services`}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Articles — compact full list */}
                      <td style={{ ...tdStyle, maxWidth: '240px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {items.slice(0, 3).map((item: any, i: number) => (
                            <p key={i} style={{ fontSize: '0.78rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <span style={{ fontWeight: '900', color: 'var(--accent-primary)' }}>{item.quantity}×</span>
                              {' '}<span style={{ fontWeight: '700' }}>{item.name}</span>
                            </p>
                          ))}
                          {items.length > 3 && (
                            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>+{items.length - 3} autre(s)…</p>
                          )}
                        </div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {items.length} plat(s) · {totalQty} unité(s)
                        </p>
                      </td>

                      {/* Total */}
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '900', fontSize: '0.9rem', color: PAID(o.status) ? 'var(--accent-success)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {(o.total || 0).toLocaleString()} F
                      </td>

                      {/* Status */}
                      <td style={tdStyle}>
                        <span className={`badge ${meta.cls}`}>{meta.label}</span>
                      </td>

                      {/* Action */}
                      <td style={tdStyle} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          {o._isGroup ? (
                            <>
                              {isPret && (
                                <button onClick={() => encaisserGroup(o._orders)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.68rem', cursor: 'pointer', boxShadow: 'var(--shadow-glow)', whiteSpace: 'nowrap' }}>
                                  <CreditCard size={12}/> ENCAISSER
                                </button>
                              )}
                              {isSuperAdmin && (
                                <>
                                  <button onClick={() => setDetailOrder(o)} title="Modifier (SuperAdmin)"
                                    style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6366F1', flexShrink: 0 }}>
                                    <Pencil size={13} />
                                  </button>
                                  <button onClick={() => deleteOrder(o)} title="Supprimer (SuperAdmin)"
                                    style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent-danger)', flexShrink: 0 }}>
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              {o.type === 'external' && (
                                <>
                                  <button title="Ajouter / démarrer livraison" onClick={() => openDeliveryModal(o)}
                                    style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <Truck size={15} color="var(--text-secondary)" />
                                  </button>
                                  {!PAID(o.status) && (
                                    <button onClick={() => encaisserExternal(o.id)}
                                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.65rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.68rem', cursor: 'pointer', boxShadow: 'var(--shadow-glow)', whiteSpace: 'nowrap' }}>
                                      <CreditCard size={12}/> ENCAISSER
                                    </button>
                                  )}
                                </>
                              )}
                              {o.type !== 'external' && isPret && (
                                <button onClick={() => encaisser(o.id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.68rem', cursor: 'pointer', boxShadow: 'var(--shadow-glow)', whiteSpace: 'nowrap' }}>
                                  <CreditCard size={12}/> ENCAISSER
                                </button>
                              )}
                              {isSuperAdmin && (
                                <>
                                  <button onClick={() => openEditModal(o)} title="Modifier montant / date (SuperAdmin)"
                                    style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6366F1', flexShrink: 0 }}>
                                    <Pencil size={13} />
                                  </button>
                                  <button onClick={() => deleteOrder(o)} title="Supprimer (SuperAdmin)"
                                    style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent-danger)', flexShrink: 0 }}>
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700' }}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, displayRows.length)} sur {displayRows.length} commandes
            </span>
            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
              <button onClick={() => setPage(1)} disabled={page === 1}
                style={{ width: '30px', height: '30px', borderRadius: '7px', border: '1px solid var(--border-color)', background: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.75rem' }}>
                «
              </button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ width: '30px', height: '30px', borderRadius: '7px', border: '1px solid var(--border-color)', background: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ padding: '0 0.75rem', fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                {page} / {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ width: '30px', height: '30px', borderRadius: '7px', border: '1px solid var(--border-color)', background: 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={14} />
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                style={{ width: '30px', height: '30px', borderRadius: '7px', border: '1px solid var(--border-color)', background: 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.75rem' }}>
                »
              </button>
            </div>
          </div>
        )}
      </div>

      <ModalPortal>

      {/* ── Merge Confirmation Modal ── */}
      {showMergeModal && (() => {
        const toMerge = orders.filter(o => selectedIds.has(o.id));
        const itemMap = new Map<string, any>();
        toMerge.forEach(o => {
          (o.items || []).forEach((item: any) => {
            const key = (item.name || '').toLowerCase().trim();
            if (itemMap.has(key)) {
              itemMap.get(key).quantity = (itemMap.get(key).quantity || 1) + (item.quantity || 1);
            } else {
              itemMap.set(key, { ...item });
            }
          });
        });
        const mergedItems = Array.from(itemMap.values());
        const mergedTotal = toMerge.reduce((s, o) => s + (o.total || 0), 0);
        return (
          <div onClick={() => setShowMergeModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '520px', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>

              {/* Header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <GitMerge size={18} color="#6366F1" />
                    <h3 style={{ fontWeight: '900', fontSize: '1rem', margin: 0 }}>Fusionner les commandes</h3>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {toMerge.length} commandes → 1 vente combinée · Articles additionnés · Totaux sommés
                  </p>
                </div>
                <button onClick={() => setShowMergeModal(false)} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', flexShrink: 0 }}>
                  <X size={16} color="var(--text-secondary)" />
                </button>
              </div>

              {/* Orders being merged */}
              <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
                <p style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>COMMANDES À FUSIONNER</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {toMerge.map((o, i) => {
                    const src = sourceLabel(o);
                    return (
                      <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: '9px', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>#{o.id.slice(0,6).toUpperCase()}</span>
                          {src.icon}
                          <span style={{ fontWeight: '800' }}>{src.text}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span style={{ fontWeight: '900', color: 'var(--accent-primary)' }}>{(o.total || 0).toLocaleString()} F</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Combined items preview */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem 1.5rem' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                  RÉSULTAT — {mergedItems.length} article{mergedItems.length > 1 ? 's' : ''} combiné{mergedItems.length > 1 ? 's' : ''}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {mergedItems.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '9px', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: '900', color: '#6366F1', flexShrink: 0 }}>{item.quantity}×</span>
                        <span style={{ fontWeight: '700' }}>{item.name}</span>
                      </div>
                      {(item.price ?? 0) > 0 && (
                        <span style={{ fontWeight: '800', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          {((item.price ?? 0) * item.quantity).toLocaleString()} F
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer: total + actions */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>TOTAL FUSIONNÉ</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#6366F1' }}>{mergedTotal.toLocaleString()} F</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={mergeSelected}
                    style={{ flex: 1, padding: '0.875rem', background: '#6366F1', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
                    <GitMerge size={15} /> CONFIRMER LA FUSION
                  </button>
                  <button onClick={() => setShowMergeModal(false)}
                    style={{ padding: '0.875rem 1.1rem', background: 'white', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Duplicate Detection Modal ── */}
      {showDuplicates && (() => {
        const WINDOW_MIN = 5; // minutes
        const groups: Array<{ key: string; orders: any[] }> = [];
        const seen = new Set<string>();

        // Group by table/customer + total, within WINDOW_MIN of each other
        const allOrders = [...orders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        allOrders.forEach(o => {
          if (seen.has(o.id)) return;
          const key = `${o.tablenumber ?? o.customername ?? ''}_${o.total}`;
          const twins = allOrders.filter(x =>
            !seen.has(x.id) &&
            x.id !== o.id &&
            (x.tablenumber ?? x.customername ?? '') === (o.tablenumber ?? o.customername ?? '') &&
            x.total === o.total &&
            Math.abs(new Date(x.created_at).getTime() - new Date(o.created_at).getTime()) <= WINDOW_MIN * 60 * 1000
          );
          if (twins.length > 0) {
            const group = [o, ...twins];
            group.forEach(x => seen.add(x.id));
            groups.push({ key, orders: group });
          }
        });

        return (
          <div onClick={() => setShowDuplicates(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '560px', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>

              {/* Header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <h3 style={{ fontWeight: '900', fontSize: '1rem', margin: 0 }}>Détection des doublons</h3>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Même source + même montant dans un intervalle de {WINDOW_MIN} min</p>
                </div>
                <button onClick={() => setShowDuplicates(false)} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer' }}>
                  <X size={16} color="var(--text-secondary)" />
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {groups.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <CheckCircle2 size={36} color="var(--accent-success)" style={{ marginBottom: '0.75rem' }} />
                    <p style={{ fontWeight: '800', color: 'var(--accent-success)' }}>Aucun doublon détecté</p>
                    <p style={{ fontSize: '0.72rem', marginTop: '0.3rem' }}>Sur la période affichée</p>
                  </div>
                ) : (
                  groups.map((g, gi) => (
                    <div key={gi} style={{ border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: '14px', overflow: 'hidden', background: 'rgba(239,68,68,0.03)' }}>
                      <div style={{ padding: '0.6rem 1rem', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '900', fontSize: '0.75rem', color: 'var(--accent-danger)' }}>DOUBLON POSSIBLE — {g.orders.length} commandes</span>
                        <span style={{ fontWeight: '900', fontSize: '0.82rem' }}>{(g.orders[0].total ?? 0).toLocaleString()} F</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {g.orders.map((o, oi) => {
                          const src = sourceLabel(o);
                          const meta = STATUS_META[o.status] || { label: o.status, cls: 'badge-neutral' };
                          return (
                            <div key={o.id} onClick={() => { setShowDuplicates(false); setDetailOrder(o); }}
                              style={{ padding: '0.65rem 1rem', borderTop: oi > 0 ? '1px solid rgba(239,68,68,0.1)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: '1rem' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', minWidth: 0 }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>#{o.id.slice(0, 6).toUpperCase()}</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src.text}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                                <span className={`badge ${meta.cls}`}>{meta.label}</span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                  {new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Order Detail Modal ── */}
      {detailOrder && (() => {
        const d = detailOrder;

        if (d._isGroup) {
          const grpOrders: any[] = d._orders;
          const allPaidGrp = grpOrders.every((o: any) => PAID(o.status));
          return (
            <div onClick={() => setDetailOrder(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '520px', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>

                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                      <Monitor size={16} color="var(--accent-primary)" />
                      <h3 style={{ fontWeight: '900', fontSize: '1rem', margin: 0 }}>Table {d.tablenumber}</h3>
                      {d.session_id && (
                        <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: '900', color: 'var(--accent-primary)', background: 'rgba(249,115,22,0.08)', padding: '0.15rem 0.5rem', borderRadius: '6px', letterSpacing: '0.04em' }}>
                          #{d.session_id.slice(0, 6).toUpperCase()}
                        </span>
                      )}
                      <span style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-success)', fontSize: '0.65rem', fontWeight: '900', padding: '0.15rem 0.5rem', borderRadius: '100px' }}>
                        {d._orderCount} services
                      </span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(d.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <button onClick={() => setDetailOrder(null)} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', flexShrink: 0 }}>
                    <X size={16} color="var(--text-secondary)" />
                  </button>
                </div>

                {/* Sub-orders */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {grpOrders.map((o: any, gi: number) => {
                    const subMeta = STATUS_META[o.status] || { label: o.status, cls: 'badge-neutral' };
                    const subItems = o.items || [];
                    const hasPrices = subItems.some((i: any) => (i.price ?? 0) > 0);
                    return (
                      <div key={o.id} style={{ border: '1.5px solid var(--border-color)', borderRadius: '14px', overflow: 'hidden' }}>
                        {/* Sub-order header */}
                        <div style={{ padding: '0.6rem 0.875rem', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                              #{o.id.slice(0,6).toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              {new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`badge ${subMeta.cls}`}>{subMeta.label}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: '900', fontSize: '0.88rem' }}>{(o.total || 0).toLocaleString()} F</span>
                            {isSuperAdmin && (
                              <button onClick={() => { setDetailOrder(null); openEditModal(o); }}
                                title="Modifier"
                                style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6366F1', flexShrink: 0 }}>
                                <Pencil size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Sub-order items */}
                        <div style={{ padding: '0.5rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {subItems.map((item: any, ii: number) => (
                            <div key={ii} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontWeight: '900', color: 'var(--accent-primary)' }}>{item.quantity}× </span>
                                <span style={{ fontWeight: '700' }}>{item.name}</span>
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                              {hasPrices && (item.price ?? 0) > 0 && (
                                <span style={{ fontWeight: '800', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                                  {((item.price ?? 0) * item.quantity).toLocaleString()} F
                                </span>
                              )}
                              {isSuperAdmin && (
                                <button onClick={() => deleteItemFromOrder(o.id, ii, subItems)}
                                  title="Supprimer cet article"
                                  style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent-danger)', flexShrink: 0 }}>
                                  <Trash2 size={11} />
                                </button>
                              )}
                              </div>
                            </div>
                          ))}
                          {subItems.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aucun article</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total footer */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <p style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>TOTAL TABLE</p>
                  <span style={{ fontSize: '1.3rem', fontWeight: '900', color: allPaidGrp ? 'var(--accent-success)' : 'var(--text-primary)' }}>
                    {(d.total ?? 0).toLocaleString()} F
                  </span>
                </div>
              </div>
            </div>
          );
        }

        const items = d.items || [];
        const meta  = STATUS_META[d.status] || { label: d.status, cls: 'badge-neutral' };
        const src   = sourceLabel(d);
        const hasItemPrices = items.some((i: any) => (i.price ?? 0) > 0);
        return (
          <div onClick={() => setDetailOrder(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>

              {/* ── Modal header ── */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontWeight: '900', fontSize: '1rem', margin: 0 }}>#{d.id.slice(0, 6).toUpperCase()}</h3>
                    <span className={`badge ${meta.cls}`}>{meta.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>{src.icon} {src.text}</span>
                    <span>·</span>
                    <span>{new Date(d.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <button onClick={() => setDetailOrder(null)} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', flexShrink: 0 }}>
                  <X size={16} color="var(--text-secondary)" />
                </button>
              </div>

              {/* ── Client info (if external/comptoir) ── */}
              {(d.customername || d.contactphone || d.deliveryaddress) && (
                <div style={{ padding: '0.875rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
                  {d.customername && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: '800', marginBottom: '0.25rem' }}>
                      <User size={13} color="var(--accent-primary)" /> {d.customername}
                    </div>
                  )}
                  {d.contactphone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      <Phone size={12} /> {d.contactphone}
                    </div>
                  )}
                  {d.deliveryaddress && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      <MapPin size={12} style={{ marginTop: '0.1rem', flexShrink: 0 }} color="var(--accent-primary)" /> {d.deliveryaddress}
                    </div>
                  )}
                </div>
              )}

              {/* ── Items list ── */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                  COMMANDE — {items.length} plat(s)
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {items.map((item: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.875rem', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                        <span style={{ fontWeight: '900', color: 'var(--accent-primary)', fontSize: '0.85rem', flexShrink: 0 }}>{item.quantity}×</span>
                        <span style={{ fontWeight: '700', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '0.75rem' }}>
                        {hasItemPrices && (item.price ?? 0) > 0 && (
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontWeight: '800', fontSize: '0.82rem' }}>{((item.price ?? 0) * item.quantity).toLocaleString()} F</p>
                            {item.quantity > 1 && <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{(item.price ?? 0).toLocaleString()} F / u.</p>}
                          </div>
                        )}
                        {isSuperAdmin && (
                          <button onClick={() => deleteItemFromOrder(d.id, i, items)}
                            title="Supprimer cet article"
                            style={{ width: '26px', height: '26px', borderRadius: '7px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent-danger)', flexShrink: 0 }}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem', fontSize: '0.82rem' }}>Aucun article</p>
                  )}
                </div>
              </div>

              {/* ── Total footer ── */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <p style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>TOTAL</p>
                  {d.payment_method && (
                    <p style={{ fontSize: '0.68rem', color: 'var(--accent-success)', fontWeight: '800', marginTop: '0.1rem' }}>
                      {{ cash: 'Espèces', wave: 'Wave', orange: 'Orange Money' }[d.payment_method as string] ?? d.payment_method}
                    </p>
                  )}
                </div>
                <span style={{ fontSize: '1.3rem', fontWeight: '900', color: PAID(d.status) ? 'var(--accent-success)' : 'var(--text-primary)' }}>
                  {(d.total ?? 0).toLocaleString()} F
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── SuperAdmin Edit Modal (total + date) ── */}
      {editModal && (
        <div onClick={() => setEditModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', padding: '1.75rem', width: '380px', maxWidth: '90vw', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontWeight: '900', fontSize: '1rem', margin: 0 }}>Modifier la commande</h3>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>SuperAdmin — #{editModal.id.slice(0,6).toUpperCase()}</p>
              </div>
              <button onClick={() => setEditModal(null)} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer' }}>
                <X size={16} color="var(--text-secondary)" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>MONTANT TOTAL (F)</label>
                <input type="number" min={0} value={editModal.total} autoFocus
                  onChange={e => setEditModal(m => m ? { ...m, total: e.target.value } : m)}
                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', fontSize: '1rem', fontWeight: '800', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)', transition: 'border-color 0.15s' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent-primary)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  <Calendar size={11} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
                  DATE ET HEURE
                </label>
                <input type="datetime-local" value={editModal.date}
                  onChange={e => setEditModal(m => m ? { ...m, date: e.target.value } : m)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', fontSize: '0.875rem', fontWeight: '700', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)', transition: 'border-color 0.15s' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent-primary)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button onClick={saveEdit}
                  style={{ flex: 1, padding: '0.875rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: 'var(--shadow-glow)' }}>
                  <Check size={15} /> ENREGISTRER
                </button>
                <button onClick={() => setEditModal(null)}
                  style={{ padding: '0.875rem 1.1rem', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery modal */}
      {showDeliveryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={saveDelivery} style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', width: '420px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '900' }}><Truck size={18} /> Détails Livraison</h3>
              <button type="button" onClick={() => setShowDeliveryModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <input placeholder="Nom du client" value={deliveryForm.customername} onChange={e => setDeliveryForm(f => ({ ...f, customername: e.target.value }))} style={{ padding: '0.7rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', background: 'var(--bg-tertiary)' }} required />
              <input placeholder="Téléphone" value={deliveryForm.contactphone} onChange={e => setDeliveryForm(f => ({ ...f, contactphone: e.target.value }))} style={{ padding: '0.7rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', background: 'var(--bg-tertiary)' }} />
              <textarea placeholder="Adresse de livraison" value={deliveryForm.deliveryaddress} onChange={e => setDeliveryForm(f => ({ ...f, deliveryaddress: e.target.value }))} style={{ padding: '0.7rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', background: 'var(--bg-tertiary)' }} rows={3} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={deliveryForm.startNow} onChange={e => setDeliveryForm(f => ({ ...f, startNow: e.target.checked }))} />
                <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>Démarrer la livraison maintenant</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Enregistrer</button>
                <button type="button" onClick={() => setShowDeliveryModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Annuler</button>
              </div>
            </div>
          </form>
        </div>
      )}

      </ModalPortal>
    </div>
    </RoleGuard>
  );
}

export default function VentesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Chargement…</div>}>
      <VentesContent />
    </Suspense>
  );
}
