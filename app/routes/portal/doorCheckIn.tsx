import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
    Container, Typography, Box, Button, Paper, TextField, Alert, Chip,
    CircularProgress, IconButton, List, ListItem, ListItemText, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/auth-context';
import { formatMoney, type Order, type TicketedEvent } from '../../utils/tickets';

// The door is the worst network environment the site will ever run in, so this
// screen is list-first and cache-backed: it downloads the attendee list once,
// keeps it in localStorage, and queues check-ins when the request fails.

interface QueuedAction { orderId: string; at: string; }

const cacheKey = (eventId: string) => `gw_door_${eventId}`;
const queueKey = (eventId: string) => `gw_door_queue_${eventId}`;

const readCache = <T,>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch { return null; }
};

const writeCache = (key: string, value: unknown) => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota — not fatal */ }
};

export default function DoorCheckIn() {
    const { eventId = '' } = useParams();
    const [searchParams] = useSearchParams();
    const scannedToken = searchParams.get('t');
    const { user, loading: authLoading, session, hasRole } = useAuth();
    const navigate = useNavigate();

    const [search, setSearch] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [flash, setFlash] = useState<{ tone: 'success' | 'warning' | 'error'; text: string } | null>(null);
    const [localOrders, setLocalOrders] = useState<Order[]>([]);
    const [queue, setQueue] = useState<QueuedAction[]>([]);
    const [busyId, setBusyId] = useState<string | null>(null);

    const isEventAdmin = hasRole('event_admin');

    useEffect(() => {
        if (!authLoading && !user) navigate('/login');
    }, [user, authLoading, navigate]);

    // Seed from cache immediately so the list is usable before (or without) a
    // successful fetch.
    useEffect(() => {
        if (!eventId) return;
        const cached = readCache<{ orders: Order[]; event: TicketedEvent }>(cacheKey(eventId));
        if (cached?.orders) setLocalOrders(cached.orders);
        setQueue(readCache<QueuedAction[]>(queueKey(eventId)) || []);
    }, [eventId]);

    const { data, isLoading, refetch, isFetching } = useQuery<{ event: TicketedEvent; orders: Order[] }>({
        queryKey: ['door-orders', eventId],
        queryFn: async () => {
            const res = await fetch(`/.netlify/functions/admin-list-orders?eventId=${eventId}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            if (!res.ok) throw new Error('Failed to load the attendee list');
            return res.json();
        },
        enabled: !!user && !!session && !!eventId && isEventAdmin,
        staleTime: 30_000,
    });

    useEffect(() => {
        if (!data || !eventId) return;
        setLocalOrders(data.orders);
        writeCache(cacheKey(eventId), { orders: data.orders, event: data.event, at: Date.now() });
    }, [data, eventId]);

    const applyLocal = useCallback((orderId: string) => {
        setLocalOrders((current) => {
            const next = current.map((o) =>
                o.id === orderId
                    ? { ...o, checked_in_at: o.checked_in_at || new Date().toISOString(), checked_in_count: o.quantity }
                    : o,
            );
            if (eventId) writeCache(cacheKey(eventId), { orders: next, event: data?.event, at: Date.now() });
            return next;
        });
    }, [eventId, data?.event]);

    const enqueue = useCallback((orderId: string) => {
        setQueue((current) => {
            const next = [...current, { orderId, at: new Date().toISOString() }];
            writeCache(queueKey(eventId), next);
            return next;
        });
    }, [eventId]);

    const postCheckIn = useCallback(async (orderId: string) => {
        const res = await fetch('/.netlify/functions/admin-check-in', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${session?.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ orderId, action: 'in' }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Check-in failed');
        return res.json();
    }, [session?.access_token]);

    const checkIn = useCallback(async (order: Order) => {
        setError(null);
        setBusyId(order.id);

        if (order.checked_in_at) {
            setFlash({ tone: 'warning', text: `${order.buyer_name} was already admitted` });
            setBusyId(null);
            return;
        }

        // Optimistic: the doorkeeper sees the result instantly regardless of signal.
        applyLocal(order.id);

        try {
            const result = await postCheckIn(order.id);
            setFlash(
                result.alreadyCheckedIn
                    ? { tone: 'warning', text: `${order.buyer_name} was already admitted` }
                    : { tone: 'success', text: `${order.buyer_name} — ${order.quantity} admitted` },
            );
        } catch {
            enqueue(order.id);
            setFlash({ tone: 'warning', text: `${order.buyer_name} admitted — will sync when back online` });
        } finally {
            setBusyId(null);
        }
    }, [applyLocal, enqueue, postCheckIn]);

    // Flush the queue whenever connectivity returns.
    const flushQueue = useCallback(async () => {
        if (!queue.length) return;
        const remaining: QueuedAction[] = [];
        for (const item of queue) {
            try { await postCheckIn(item.orderId); }
            catch { remaining.push(item); }
        }
        setQueue(remaining);
        writeCache(queueKey(eventId), remaining);
        if (remaining.length === 0) refetch();
    }, [queue, postCheckIn, eventId, refetch]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onOnline = () => { flushQueue(); };
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, [flushQueue]);

    // A QR scan lands here with ?t=<token>. Resolve it against the cached list
    // first so a scan works with no signal at all.
    useEffect(() => {
        if (!scannedToken || !localOrders.length) return;
        const match = localOrders.find((o) => o.checkin_token === scannedToken);
        if (match) {
            setSearch(match.reference);
            if (!match.checked_in_at) checkIn(match);
        } else {
            setFlash({ tone: 'error', text: 'That ticket is not on this event’s list' });
        }
        // Intentionally runs only when a new token arrives.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scannedToken, localOrders.length]);

    const visible = useMemo(() => {
        const needle = search.trim().toLowerCase();
        const rows = localOrders.filter((o) => o.payment_status === 'paid' || o.payment_status === 'pending');
        const filtered = needle
            ? rows.filter((o) =>
                o.buyer_name.toLowerCase().includes(needle) ||
                o.reference.toLowerCase().includes(needle) ||
                (o.buyer_phone || '').includes(needle))
            : rows;
        return [...filtered].sort((a, b) => a.buyer_name.localeCompare(b.buyer_name));
    }, [localOrders, search]);

    const admitted = localOrders.reduce((n, o) => n + (o.checked_in_at ? o.checked_in_count || o.quantity : 0), 0);
    const expected = localOrders
        .filter((o) => o.payment_status === 'paid' || o.payment_status === 'pending')
        .reduce((n, o) => n + o.quantity, 0);

    if (authLoading) {
        return <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Container>;
    }
    if (!user) return null;

    if (!isEventAdmin) {
        return (
            <Container maxWidth="sm" sx={{ py: 8 }}>
                <Alert severity="warning">You need the Event Admin role to run door check-in.</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }} className="no-print">
                <IconButton onClick={() => navigate(`/portal/events/${eventId}/orders`)} aria-label="Back to payments">
                    <ArrowBackIcon />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" component="h1" fontWeight="bold">Door check-in</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {data?.event.title || 'Loading…'}
                    </Typography>
                </Box>
                <IconButton onClick={() => refetch()} disabled={isFetching} aria-label="Refresh list">
                    <RefreshIcon />
                </IconButton>
                <IconButton onClick={() => window.print()} aria-label="Print list">
                    <PrintIcon />
                </IconButton>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }} className="no-print">
                <Chip label={`${admitted} / ${expected} admitted`} color="primary" />
                {queue.length > 0 && (
                    <Chip
                        label={`${queue.length} pending sync`}
                        color="warning"
                        onClick={flushQueue}
                    />
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            {flash && (
                <Alert severity={flash.tone} sx={{ mb: 2 }} onClose={() => setFlash(null)}>
                    {flash.text}
                </Alert>
            )}

            <TextField
                fullWidth
                className="no-print"
                placeholder="Search by name, reference or phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ mb: 2 }}
                slotProps={{ htmlInput: { 'aria-label': 'Search attendees' } }}
            />

            <Paper elevation={2}>
                {isLoading && localOrders.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
                ) : visible.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">No matching attendees.</Typography>
                    </Box>
                ) : (
                    <List disablePadding>
                        {visible.map((o, i) => {
                            const unpaid = o.payment_status !== 'paid';
                            const done = Boolean(o.checked_in_at);
                            return (
                                <Box key={o.id}>
                                    {i > 0 && <Divider />}
                                    <ListItem
                                        sx={{ py: 1.5, gap: 1, opacity: done ? 0.6 : 1 }}
                                        secondaryAction={
                                            <Button
                                                variant={done ? 'outlined' : 'contained'}
                                                color={done ? 'inherit' : unpaid ? 'warning' : 'primary'}
                                                disabled={busyId === o.id}
                                                onClick={() => checkIn(o)}
                                                sx={{ minWidth: 96, minHeight: 44 }}
                                                startIcon={
                                                    busyId === o.id ? <CircularProgress size={16} />
                                                        : done ? <CheckCircleIcon /> : undefined
                                                }
                                            >
                                                {done ? 'In' : unpaid ? 'Collect' : 'Check in'}
                                            </Button>
                                        }
                                    >
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                    <Typography sx={{ fontWeight: 600 }}>{o.buyer_name}</Typography>
                                                    {o.quantity > 1 && <Chip size="small" label={`×${o.quantity}`} />}
                                                </Box>
                                            }
                                            secondary={
                                                unpaid
                                                    ? `${o.reference} · UNPAID — collect ${formatMoney(o.amount_cents)}`
                                                    : `${o.reference} · paid`
                                            }
                                            slotProps={{
                                                secondary: {
                                                    sx: unpaid ? { color: 'error.main', fontWeight: 600 } : undefined,
                                                },
                                            }}
                                        />
                                    </ListItem>
                                </Box>
                            );
                        })}
                    </List>
                )}
            </Paper>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }} className="no-print">
                The list works offline once loaded. Check-ins taken without signal are queued and sync
                automatically. If the phone dies, use Print for a paper list.
            </Typography>

            {/* Paper fallback: what actually runs the door when the battery goes. */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: #fff; }
                }
            `}</style>
        </Container>
    );
}
