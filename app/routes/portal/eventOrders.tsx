import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
    Container, Typography, Box, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Alert, Chip, CircularProgress, Tooltip, Grid,
    ToggleButton, ToggleButtonGroup, MenuItem, FormControlLabel, Checkbox,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import PaidIcon from '@mui/icons-material/Paid';
import EmailIcon from '@mui/icons-material/Email';
import CancelIcon from '@mui/icons-material/Cancel';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SyncIcon from '@mui/icons-material/Sync';
import LinkIcon from '@mui/icons-material/Link';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/auth-context';
import {
    formatMoney, formatEventDate, isHoldExpired, statusColor,
    PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS,
    type Order, type OrderSummary, type PaymentMethod, type TicketedEvent,
} from '../../utils/tickets';

const METHOD_CHIP_COLOR: Record<PaymentMethod, 'primary' | 'warning' | 'success'> = {
    zeffy: 'primary',
    etransfer: 'warning',
    cash: 'success',
};

interface ZeffyPaymentRow {
    id: string;
    payer_name: string | null;
    payer_email: string | null;
    amount_cents: number;
    status: string | null;
    paid_at: string | null;
    received_at: string;
}

interface OrdersResponse {
    event: TicketedEvent;
    orders: Order[];
    summary: OrderSummary;
}

function SummaryCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'warning' }) {
    return (
        <Paper
            elevation={0}
            sx={{
                p: 2.5,
                height: '100%',
                backgroundColor: 'section.neutral',
                border: (theme) => `1px solid ${theme.palette.section.border}`,
            }}
        >
            <Typography sx={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'accent.gold' }}>
                {label}
            </Typography>
            <Typography sx={{
                fontFamily: '"Playfair Display", serif',
                fontSize: 28,
                mt: 0.5,
                color: tone === 'warning' ? 'warning.main' : 'text.primary',
            }}>
                {value}
            </Typography>
            {hint && <Typography sx={{ fontSize: 13, color: 'section.subtle' }}>{hint}</Typography>}
        </Paper>
    );
}

export default function EventOrders() {
    const { eventId } = useParams();
    const { user, loading: authLoading, session, hasRole } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [payTarget, setPayTarget] = useState<Order | null>(null);
    const [payReference, setPayReference] = useState('');
    const [payMethod, setPayMethod] = useState<PaymentMethod>('etransfer');
    const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [matchTarget, setMatchTarget] = useState<ZeffyPaymentRow | null>(null);
    const [matchOrderId, setMatchOrderId] = useState('');
    const [addForm, setAddForm] = useState({
        buyerName: '', buyerEmail: '', buyerPhone: '', quantity: '1',
        paymentMethod: 'cash' as PaymentMethod, paymentReference: '', markPaid: true, notes: '',
    });

    const isEventAdmin = hasRole('event_admin');

    useEffect(() => {
        if (!authLoading && !user) navigate('/login');
    }, [user, authLoading, navigate]);

    const authHeaders = {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
    };

    const { data, isLoading } = useQuery<OrdersResponse>({
        queryKey: ['event-orders', eventId],
        queryFn: async () => {
            const res = await fetch(`/.netlify/functions/admin-list-orders?eventId=${eventId}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to load orders');
            return res.json();
        },
        enabled: !!user && !!session && !!eventId && isEventAdmin,
    });

    const updateMutation = useMutation({
        mutationFn: async (body: Record<string, unknown>) => {
            const res = await fetch('/.netlify/functions/admin-update-order', {
                method: 'POST', headers: authHeaders, body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
            return res.json();
        },
        onSuccess: (_result, variables) => {
            queryClient.invalidateQueries({ queryKey: ['event-orders', eventId] });
            const action = (variables as { action?: string }).action;
            setSuccess(
                action === 'mark_paid' ? 'Payment recorded and the buyer has been emailed their ticket'
                : action === 'cancel' ? 'Order cancelled'
                : action === 'resend_email' ? 'Email resent'
                : 'Order updated',
            );
            setPayTarget(null);
            setCancelTarget(null);
        },
        onError: (err: any) => { setError(err.message); setPayTarget(null); setCancelTarget(null); },
    });

    const addMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/.netlify/functions/admin-create-order', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    eventId,
                    buyerName: addForm.buyerName,
                    buyerEmail: addForm.buyerEmail,
                    buyerPhone: addForm.buyerPhone,
                    notes: addForm.notes,
                    quantity: Number(addForm.quantity || 1),
                    paymentMethod: addForm.paymentMethod,
                    paymentReference: addForm.paymentReference,
                    markPaid: addForm.markPaid,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Could not record the payment');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-orders', eventId] });
            setSuccess('Payment recorded');
            setAddOpen(false);
            setAddForm({
                buyerName: '', buyerEmail: '', buyerPhone: '', quantity: '1',
                paymentMethod: 'cash', paymentReference: '', markPaid: true, notes: '',
            });
        },
        onError: (err: any) => setError(err.message),
    });

    // Zeffy hosts its own form, so a card payment does not carry our order
    // reference. Most are matched automatically on payer email and amount; what
    // lands here is the remainder that needs a human.
    const { data: zeffyData } = useQuery<{ payments: ZeffyPaymentRow[]; configured: boolean }>({
        queryKey: ['zeffy-unmatched'],
        queryFn: async () => {
            const res = await fetch('/.netlify/functions/admin-zeffy-payments', {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to load Zeffy payments');
            return res.json();
        },
        enabled: !!user && !!session && isEventAdmin,
    });

    const zeffyMutation = useMutation({
        mutationFn: async (body: Record<string, unknown>) => {
            const res = await fetch('/.netlify/functions/admin-zeffy-payments', {
                method: 'POST', headers: authHeaders, body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Zeffy action failed');
            return res.json();
        },
        onSuccess: (result, variables) => {
            queryClient.invalidateQueries({ queryKey: ['zeffy-unmatched'] });
            queryClient.invalidateQueries({ queryKey: ['event-orders', eventId] });
            const action = (variables as { action?: string }).action;
            setSuccess(
                action === 'refresh'
                    ? `Checked Zeffy: ${result.seen ?? 0} payment(s) seen, ${result.matched ?? 0} matched`
                    : action === 'match' ? 'Payment matched and the buyer has been emailed their ticket'
                    : 'Payment set aside',
            );
            setMatchTarget(null);
            setMatchOrderId('');
        },
        onError: (err: any) => { setError(err.message); setMatchTarget(null); },
    });

    const orders = data?.orders ?? [];
    const unmatchedZeffy = zeffyData?.payments ?? [];

    const visibleOrders = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return orders.filter((o) => {
            if (statusFilter !== 'all' && o.payment_status !== statusFilter) return false;
            if (!needle) return true;
            return (
                o.buyer_name.toLowerCase().includes(needle) ||
                o.buyer_email.toLowerCase().includes(needle) ||
                o.reference.toLowerCase().includes(needle) ||
                (o.buyer_phone || '').includes(needle)
            );
        });
    }, [orders, statusFilter, search]);

    const openPayDialog = (order: Order) => {
        setError(null); setSuccess(null);
        setPayReference('');
        setPayMethod(order.payment_method);
        setPayTarget(order);
    };

    const downloadCsv = async () => {
        setError(null);
        try {
            const res = await fetch(`/.netlify/functions/admin-export-orders?eventId=${eventId}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${data?.event.slug || 'event'}-orders.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err.message || 'Export failed');
        }
    };

    if (authLoading) {
        return <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Container>;
    }
    if (!user) return null;

    if (!isEventAdmin) {
        return (
            <Container maxWidth="sm" sx={{ py: 8 }}>
                <Alert severity="warning">
                    You need the Event Admin role to see payment records.
                </Alert>
                <Button sx={{ mt: 3 }} startIcon={<ArrowBackIcon />} onClick={() => navigate('/portal')}>
                    Back to Portal
                </Button>
            </Container>
        );
    }

    const summary = data?.summary;

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <IconButton onClick={() => navigate('/portal/events')} color="primary" aria-label="Back to events">
                    <ArrowBackIcon />
                </IconButton>
                <Box sx={{ flex: 1, minWidth: 240 }}>
                    <Typography variant="h4" component="h1" fontWeight="bold">
                        {data?.event.title || 'Event payments'}
                    </Typography>
                    {data?.event && (
                        <Typography variant="body2" color="text.secondary">
                            {formatEventDate(data.event.starts_at)}
                            {data.event.location ? ` · ${data.event.location}` : ''}
                        </Typography>
                    )}
                </Box>
                <Button startIcon={<QrCodeScannerIcon />} onClick={() => navigate(`/portal/events/${eventId}/door`)}>
                    Door check-in
                </Button>
                <Button startIcon={<DownloadIcon />} onClick={downloadCsv}>Export CSV</Button>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => { setError(null); setSuccess(null); setAddOpen(true); }}
                    sx={{ backgroundColor: 'accent.navy', '&:hover': { backgroundColor: 'primary.main' } }}
                >
                    Record Payment
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

            {/* Totals */}
            {summary && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 6, md: 3 }}>
                        <SummaryCard
                            label="Collected"
                            value={formatMoney(summary.paidCents)}
                            hint={`${summary.seatsPaid} seat${summary.seatsPaid === 1 ? '' : 's'} paid`}
                        />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                        <SummaryCard
                            label="Outstanding"
                            value={formatMoney(summary.outstandingCents)}
                            hint="Awaiting e-transfer or cash"
                            tone={summary.outstandingCents > 0 ? 'warning' : undefined}
                        />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                        <SummaryCard
                            label="Seats taken"
                            value={`${summary.seatsTaken}${data?.event.capacity ? ` / ${data.event.capacity}` : ''}`}
                            hint={`${summary.orderCount} order${summary.orderCount === 1 ? '' : 's'}`}
                        />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                        <SummaryCard
                            label="By method"
                            value={formatMoney(
                                summary.byMethod.etransfer.paidCents + summary.byMethod.cash.paidCents + summary.byMethod.zeffy.paidCents,
                            )}
                            hint={`Card ${formatMoney(summary.byMethod.zeffy.paidCents)} · E-T ${formatMoney(summary.byMethod.etransfer.paidCents)} · Cash ${formatMoney(summary.byMethod.cash.paidCents)}`}
                        />
                    </Grid>
                </Grid>
            )}

            {/* Unmatched Zeffy payments — money received that we could not attribute */}
            {(unmatchedZeffy.length > 0 || data?.event.zeffy_campaign_id) && (
                <Paper
                    elevation={0}
                    sx={{
                        mb: 3, p: 2.5,
                        backgroundColor: 'section.neutral',
                        border: (theme) => `1px solid ${theme.palette.section.border}`,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: unmatchedZeffy.length ? 2 : 0 }}>
                        <Box sx={{ flex: 1, minWidth: 220 }}>
                            <Typography sx={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'accent.gold' }}>
                                Zeffy payments to reconcile
                            </Typography>
                            <Typography sx={{ fontSize: 14, color: 'section.subtle', mt: 0.5 }}>
                                {unmatchedZeffy.length === 0
                                    ? 'Everything received from Zeffy has been matched to an order.'
                                    : 'Card payments we received but could not attribute automatically — usually because the buyer paid with a different email address.'}
                            </Typography>
                        </Box>
                        <Button
                            startIcon={zeffyMutation.isPending ? <CircularProgress size={16} /> : <SyncIcon />}
                            disabled={zeffyMutation.isPending}
                            onClick={() => { setError(null); setSuccess(null); zeffyMutation.mutate({ action: 'refresh', eventId }); }}
                        >
                            Check Zeffy now
                        </Button>
                    </Box>

                    {unmatchedZeffy.length > 0 && (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>Received</strong></TableCell>
                                        <TableCell><strong>Payer</strong></TableCell>
                                        <TableCell align="right"><strong>Amount</strong></TableCell>
                                        <TableCell align="right"><strong>Actions</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {unmatchedZeffy.map((p) => (
                                        <TableRow key={p.id} hover>
                                            <TableCell>{new Date(p.received_at).toLocaleDateString('en-CA')}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.payer_name || 'Unknown'}</Typography>
                                                <Typography variant="body2" color="text.secondary">{p.payer_email || '—'}</Typography>
                                            </TableCell>
                                            <TableCell align="right">{formatMoney(p.amount_cents)}</TableCell>
                                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                                <Tooltip title="Match to an order">
                                                    <IconButton
                                                        size="small" color="primary"
                                                        onClick={() => { setError(null); setSuccess(null); setMatchOrderId(''); setMatchTarget(p); }}
                                                    >
                                                        <LinkIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Not for this event — hide it">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => zeffyMutation.mutate({ action: 'ignore', paymentId: p.id })}
                                                    >
                                                        <VisibilityOffIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            )}

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={statusFilter}
                    onChange={(_e, v) => v && setStatusFilter(v)}
                    aria-label="Filter by payment status"
                >
                    <ToggleButton value="all">All</ToggleButton>
                    <ToggleButton value="pending">Unpaid</ToggleButton>
                    <ToggleButton value="paid">Paid</ToggleButton>
                    <ToggleButton value="cancelled">Cancelled</ToggleButton>
                    <ToggleButton value="refunded">Refunded</ToggleButton>
                </ToggleButtonGroup>
                <TextField
                    size="small"
                    placeholder="Search name, email or reference"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ minWidth: 260 }}
                />
            </Box>

            <TableContainer component={Paper} elevation={2}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'section.neutral' }}>
                            <TableCell><strong>Reference</strong></TableCell>
                            <TableCell><strong>Buyer</strong></TableCell>
                            <TableCell align="center"><strong>Qty</strong></TableCell>
                            <TableCell align="right"><strong>Amount</strong></TableCell>
                            <TableCell><strong>Method</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell><strong>Paid</strong></TableCell>
                            <TableCell><strong>Checked in</strong></TableCell>
                            <TableCell align="right"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell>
                            </TableRow>
                        ) : visibleOrders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">
                                        {orders.length === 0
                                            ? 'No orders yet. Use "Record Payment" to log an e-transfer or cash payment taken offline.'
                                            : 'No orders match this filter.'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            visibleOrders.map((o) => {
                                const expired = isHoldExpired(o);
                                return (
                                    <TableRow key={o.id} hover>
                                        <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                            {o.reference}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.buyer_name}</Typography>
                                            <Typography variant="body2" color="text.secondary">{o.buyer_email}</Typography>
                                            {o.notes && (
                                                <Typography variant="body2" sx={{ color: 'section.subtle', fontStyle: 'italic' }}>
                                                    {o.notes}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">{o.quantity}</TableCell>
                                        <TableCell align="right">
                                            {formatMoney(o.amount_cents)}
                                            {o.refunded_amount_cents > 0 && (
                                                <Typography variant="body2" color="error">
                                                    −{formatMoney(o.refunded_amount_cents)}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                label={PAYMENT_METHOD_LABELS[o.payment_method]}
                                                color={METHOD_CHIP_COLOR[o.payment_method]}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={expired ? 'Hold expired' : PAYMENT_STATUS_LABELS[o.payment_status]}
                                                color={expired ? 'default' : statusColor(o.payment_status)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {o.paid_at ? new Date(o.paid_at).toLocaleDateString('en-CA') : '—'}
                                            {o.payment_reference && (
                                                <Typography variant="body2" color="text.secondary">{o.payment_reference}</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {o.checked_in_at
                                                ? `${o.checked_in_count}/${o.quantity}`
                                                : '—'}
                                        </TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                            {o.payment_status !== 'paid' && o.payment_status !== 'refunded' && (
                                                <Tooltip title="Mark as paid">
                                                    <IconButton size="small" color="success" onClick={() => openPayDialog(o)}>
                                                        <PaidIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="Resend email">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => updateMutation.mutate({ orderId: o.id, action: 'resend_email' })}
                                                >
                                                    <EmailIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {o.payment_status === 'pending' && (
                                                <Tooltip title="Cancel order">
                                                    <IconButton size="small" color="error" onClick={() => setCancelTarget(o)}>
                                                        <CancelIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Mark paid */}
            <Dialog open={Boolean(payTarget)} onClose={() => !updateMutation.isPending && setPayTarget(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Record payment</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        Mark <strong>{payTarget?.reference}</strong> from {payTarget?.buyer_name} as paid
                        ({payTarget && formatMoney(payTarget.amount_cents)})?
                    </Typography>
                    <TextField
                        select fullWidth margin="dense" label="Paid by"
                        value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    >
                        <MenuItem value="etransfer">Interac e-Transfer</MenuItem>
                        <MenuItem value="cash">Cash</MenuItem>
                        <MenuItem value="zeffy">Card (Zeffy)</MenuItem>
                    </TextField>
                    <TextField
                        fullWidth margin="dense" label="Payment reference (optional)"
                        value={payReference} onChange={(e) => setPayReference(e.target.value)}
                        helperText="e-Transfer confirmation number, or who took the cash"
                    />
                    <Alert severity="info" sx={{ mt: 2 }}>
                        This emails the buyer their ticket and QR code.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPayTarget(null)} disabled={updateMutation.isPending}>Cancel</Button>
                    <Button
                        variant="contained" color="success"
                        disabled={updateMutation.isPending}
                        startIcon={updateMutation.isPending ? <CircularProgress size={16} /> : <PaidIcon />}
                        onClick={() => payTarget && updateMutation.mutate({
                            orderId: payTarget.id,
                            action: 'mark_paid',
                            paymentMethod: payMethod,
                            paymentReference: payReference,
                        })}
                    >
                        {updateMutation.isPending ? 'Saving...' : 'Mark Paid'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Cancel */}
            <Dialog open={Boolean(cancelTarget)} onClose={() => !updateMutation.isPending && setCancelTarget(null)}>
                <DialogTitle>Cancel order</DialogTitle>
                <DialogContent>
                    <Typography>
                        Cancel <strong>{cancelTarget?.reference}</strong> from {cancelTarget?.buyer_name}?
                        This frees the seat immediately.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCancelTarget(null)} disabled={updateMutation.isPending}>Keep it</Button>
                    <Button
                        variant="contained" color="error"
                        disabled={updateMutation.isPending}
                        onClick={() => cancelTarget && updateMutation.mutate({ orderId: cancelTarget.id, action: 'cancel' })}
                    >
                        Cancel Order
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Record an offline payment */}
            <Dialog open={addOpen} onClose={() => !addMutation.isPending && setAddOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Record a payment</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        For money taken outside the website — cash at the door, a cheque, or an
                        e-transfer that arrived without an online order.
                    </Typography>
                    <Grid container spacing={1}>
                        <Grid size={{ xs: 12, sm: 7 }}>
                            <TextField fullWidth required margin="dense" label="Name"
                                value={addForm.buyerName}
                                onChange={(e) => setAddForm({ ...addForm, buyerName: e.target.value })} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 5 }}>
                            <TextField fullWidth margin="dense" label="Quantity" type="number"
                                value={addForm.quantity}
                                onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                                slotProps={{ htmlInput: { min: 1 } }} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth margin="dense" label="Email (optional)" type="email"
                                value={addForm.buyerEmail}
                                onChange={(e) => setAddForm({ ...addForm, buyerEmail: e.target.value })}
                                helperText="Leave blank for a walk-up with no email. A ticket is only emailed when an address is given." />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth select margin="dense" label="Paid by"
                                value={addForm.paymentMethod}
                                onChange={(e) => setAddForm({ ...addForm, paymentMethod: e.target.value as PaymentMethod })}>
                                <MenuItem value="cash">Cash</MenuItem>
                                <MenuItem value="etransfer">Interac e-Transfer</MenuItem>
                                <MenuItem value="zeffy">Card (Zeffy)</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth margin="dense" label="Reference (optional)"
                                value={addForm.paymentReference}
                                onChange={(e) => setAddForm({ ...addForm, paymentReference: e.target.value })} />
                        </Grid>
                        <Grid size={12}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={addForm.markPaid}
                                        onChange={(e) => setAddForm({ ...addForm, markPaid: e.target.checked })}
                                    />
                                }
                                label="Money already received (leave unticked to just reserve a seat)"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddOpen(false)} disabled={addMutation.isPending}>Cancel</Button>
                    <Button
                        variant="contained"
                        disabled={addMutation.isPending || !addForm.buyerName}
                        startIcon={addMutation.isPending ? <CircularProgress size={16} /> : undefined}
                        onClick={() => { setError(null); addMutation.mutate(); }}
                        sx={{ backgroundColor: 'accent.navy', '&:hover': { backgroundColor: 'primary.main' } }}
                    >
                        {addMutation.isPending ? 'Saving...' : 'Record'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Match a Zeffy payment to an order */}
            <Dialog open={Boolean(matchTarget)} onClose={() => !zeffyMutation.isPending && setMatchTarget(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Match Zeffy payment</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        {matchTarget?.payer_name || 'Unknown'} paid {matchTarget && formatMoney(matchTarget.amount_cents)}
                        {matchTarget?.payer_email ? ` from ${matchTarget.payer_email}` : ''}. Which order is this?
                    </Typography>
                    <TextField
                        select fullWidth margin="dense" label="Order"
                        value={matchOrderId}
                        onChange={(e) => setMatchOrderId(e.target.value)}
                        helperText="Only unpaid orders for this event are listed"
                    >
                        {orders
                            .filter((o) => o.payment_status === 'pending')
                            .map((o) => (
                                <MenuItem key={o.id} value={o.id}>
                                    {o.reference} — {o.buyer_name} — {formatMoney(o.amount_cents)}
                                </MenuItem>
                            ))}
                    </TextField>
                    <Alert severity="info" sx={{ mt: 2 }}>
                        This marks the order paid and emails the buyer their ticket and QR code.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMatchTarget(null)} disabled={zeffyMutation.isPending}>Cancel</Button>
                    <Button
                        variant="contained"
                        disabled={zeffyMutation.isPending || !matchOrderId}
                        startIcon={zeffyMutation.isPending ? <CircularProgress size={16} /> : <LinkIcon />}
                        onClick={() => matchTarget && zeffyMutation.mutate({
                            action: 'match', paymentId: matchTarget.id, orderId: matchOrderId,
                        })}
                        sx={{ backgroundColor: 'accent.navy', '&:hover': { backgroundColor: 'primary.main' } }}
                    >
                        {zeffyMutation.isPending ? 'Matching...' : 'Match & Mark Paid'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
