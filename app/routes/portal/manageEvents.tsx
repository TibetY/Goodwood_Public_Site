import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
    Container, Typography, Box, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Alert, Chip, CircularProgress, Tooltip, Grid,
    FormControlLabel, Checkbox, MenuItem,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/auth-context';
import { formatMoney, formatEventDate, type TicketedEventWithStats } from '../../utils/tickets';

/** datetime-local wants "YYYY-MM-DDTHH:mm" with no zone. */
const toLocalInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

interface FormState {
    id?: string;
    title: string;
    slug: string;
    description: string;
    location: string;
    starts_at: string;
    priceDollars: string;
    capacity: string;
    max_per_order: string;
    sales_close_at: string;
    gcal_event_id: string;
    etransfer_email: string;
    etransfer_instructions: string;
    etransfer_hold_hours: string;
    refund_policy: string;
    allow_stripe: boolean;
    allow_etransfer: boolean;
    allow_cash: boolean;
    published: boolean;
}

const EMPTY_FORM: FormState = {
    title: '', slug: '', description: '', location: '', starts_at: '',
    priceDollars: '', capacity: '', max_per_order: '10', sales_close_at: '',
    gcal_event_id: '', etransfer_email: '', etransfer_instructions: '',
    etransfer_hold_hours: '72', refund_policy: '',
    allow_stripe: false, allow_etransfer: true, allow_cash: true, published: false,
};

export default function ManageEvents() {
    const { user, loading: authLoading, session, hasRole } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [deleteTarget, setDeleteTarget] = useState<TicketedEventWithStats | null>(null);

    const isEventAdmin = hasRole('event_admin');

    useEffect(() => {
        if (!authLoading && !user) navigate('/login');
    }, [user, authLoading, navigate]);

    const { data: events = [], isLoading } = useQuery<TicketedEventWithStats[]>({
        queryKey: ['ticketed-events-admin'],
        queryFn: async () => {
            const res = await fetch('/.netlify/functions/admin-list-ticketed-events', {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to load events');
            return (await res.json()).events;
        },
        enabled: !!user && !!session && isEventAdmin,
    });

    const saveMutation = useMutation({
        mutationFn: async (state: FormState) => {
            const res = await fetch('/.netlify/functions/admin-upsert-ticketed-event', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: state.id,
                    title: state.title,
                    slug: state.slug,
                    description: state.description,
                    location: state.location,
                    starts_at: fromLocalInput(state.starts_at),
                    // Dollars in the form, integer cents on the wire — money is
                    // never a float past this line.
                    price_cents: Math.round(parseFloat(state.priceDollars || '0') * 100),
                    capacity: state.capacity === '' ? null : Number(state.capacity),
                    max_per_order: Number(state.max_per_order || 10),
                    sales_close_at: fromLocalInput(state.sales_close_at),
                    gcal_event_id: state.gcal_event_id,
                    etransfer_email: state.etransfer_email,
                    etransfer_instructions: state.etransfer_instructions,
                    etransfer_hold_hours: Number(state.etransfer_hold_hours || 72),
                    refund_policy: state.refund_policy,
                    allow_stripe: state.allow_stripe,
                    allow_etransfer: state.allow_etransfer,
                    allow_cash: state.allow_cash,
                    published: state.published,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to save event');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticketed-events-admin'] });
            setSuccess(form.id ? 'Event updated' : 'Event created');
            setDialogOpen(false);
        },
        onError: (err: any) => setError(err.message),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch('/.netlify/functions/admin-delete-ticketed-event', {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete event');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticketed-events-admin'] });
            setSuccess('Event deleted');
            setDeleteTarget(null);
        },
        onError: (err: any) => { setError(err.message); setDeleteTarget(null); },
    });

    const openCreate = () => { setError(null); setSuccess(null); setForm(EMPTY_FORM); setDialogOpen(true); };

    const openEdit = (ev: TicketedEventWithStats) => {
        setError(null); setSuccess(null);
        setForm({
            id: ev.id,
            title: ev.title,
            slug: ev.slug,
            description: ev.description || '',
            location: ev.location || '',
            starts_at: toLocalInput(ev.starts_at),
            priceDollars: (ev.price_cents / 100).toFixed(2),
            capacity: ev.capacity === null ? '' : String(ev.capacity),
            max_per_order: String(ev.max_per_order ?? 10),
            sales_close_at: toLocalInput(ev.sales_close_at),
            gcal_event_id: ev.gcal_event_id || '',
            etransfer_email: ev.etransfer_email || '',
            etransfer_instructions: ev.etransfer_instructions || '',
            etransfer_hold_hours: String(ev.etransfer_hold_hours ?? 72),
            refund_policy: ev.refund_policy || '',
            allow_stripe: ev.allow_stripe,
            allow_etransfer: ev.allow_etransfer,
            allow_cash: ev.allow_cash,
            published: ev.published,
        });
        setDialogOpen(true);
    };

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    if (authLoading) {
        return (
            <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (!user) return null;

    if (!isEventAdmin) {
        return (
            <Container maxWidth="sm" sx={{ py: 8 }}>
                <Alert severity="warning">
                    You need the Event Admin role to manage ticketed events. Ask a site admin to grant it
                    from Manage Members.
                </Alert>
                <Button sx={{ mt: 3 }} startIcon={<ArrowBackIcon />} onClick={() => navigate('/portal')}>
                    Back to Portal
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={() => navigate('/portal')} color="primary" aria-label="Back to portal">
                    <ArrowBackIcon />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" component="h1" fontWeight="bold">Ticketed Events</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Create events people can pay for, and track who has paid
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openCreate}
                    sx={{ backgroundColor: 'accent.navy', '&:hover': { backgroundColor: 'primary.main' } }}
                >
                    New Event
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

            <TableContainer component={Paper} elevation={2}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'section.neutral' }}>
                            <TableCell><strong>Event</strong></TableCell>
                            <TableCell><strong>When</strong></TableCell>
                            <TableCell><strong>Price</strong></TableCell>
                            <TableCell><strong>Seats</strong></TableCell>
                            <TableCell><strong>Collected</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell align="right"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    <CircularProgress size={24} />
                                </TableCell>
                            </TableRow>
                        ) : events.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">
                                        No ticketed events yet. Click "New Event" to create one.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            events.map((ev) => (
                                <TableRow key={ev.id} hover>
                                    <TableCell>
                                        <Typography sx={{ fontWeight: 600 }}>{ev.title}</Typography>
                                        {ev.location && (
                                            <Typography variant="body2" color="text.secondary">{ev.location}</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>{formatEventDate(ev.starts_at)}</TableCell>
                                    <TableCell>{formatMoney(ev.price_cents)}</TableCell>
                                    <TableCell>
                                        {ev.stats.seatsTaken}{ev.capacity ? ` / ${ev.capacity}` : ''}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{formatMoney(ev.stats.paidCents)}</Typography>
                                        {ev.stats.outstandingCents > 0 && (
                                            <Typography variant="body2" color="warning.main">
                                                {formatMoney(ev.stats.outstandingCents)} due
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={ev.published ? 'Published' : 'Draft'}
                                            color={ev.published ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="View payments">
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => navigate(`/portal/events/${ev.id}/orders`)}
                                            >
                                                <ReceiptLongIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Edit event">
                                            <IconButton size="small" color="primary" onClick={() => openEdit(ev)}>
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete event">
                                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(ev)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create / edit dialog */}
            <Dialog open={dialogOpen} onClose={() => !saveMutation.isPending && setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>{form.id ? 'Edit Event' : 'New Ticketed Event'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ pt: 1 }}>
                        <Grid size={{ xs: 12, sm: 8 }}>
                            <TextField fullWidth required label="Title" value={form.title}
                                onChange={(e) => set('title', e.target.value)} margin="dense" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField fullWidth label="URL slug" value={form.slug} margin="dense"
                                onChange={(e) => set('slug', e.target.value)}
                                helperText="Leave blank to generate" />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth multiline minRows={2} label="Description" value={form.description}
                                onChange={(e) => set('description', e.target.value)} margin="dense" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth label="Location" value={form.location}
                                onChange={(e) => set('location', e.target.value)} margin="dense" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth required type="datetime-local" label="Starts at"
                                value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)}
                                margin="dense" slotProps={{ inputLabel: { shrink: true } }} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField fullWidth required label="Price (CAD)" type="number" value={form.priceDollars}
                                onChange={(e) => set('priceDollars', e.target.value)} margin="dense"
                                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                                helperText="0 for a free RSVP" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField fullWidth label="Capacity" type="number" value={form.capacity}
                                onChange={(e) => set('capacity', e.target.value)} margin="dense"
                                slotProps={{ htmlInput: { min: 1 } }}
                                helperText="Blank = unlimited" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField fullWidth label="Max per order" type="number" value={form.max_per_order}
                                onChange={(e) => set('max_per_order', e.target.value)} margin="dense"
                                slotProps={{ htmlInput: { min: 1, max: 50 } }} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth type="datetime-local" label="Sales close at"
                                value={form.sales_close_at} onChange={(e) => set('sales_close_at', e.target.value)}
                                margin="dense" slotProps={{ inputLabel: { shrink: true } }}
                                helperText="Optional" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth label="Google Calendar event ID" value={form.gcal_event_id}
                                onChange={(e) => set('gcal_event_id', e.target.value)} margin="dense"
                                helperText="Optional — adds a Tickets button to that row on /events" />
                        </Grid>

                        <Grid size={12}>
                            <Typography variant="subtitle2" sx={{ mt: 1, color: 'accent.gold', letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 11 }}>
                                Payment methods
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControlLabel
                                control={<Checkbox checked={form.allow_stripe} onChange={(e) => set('allow_stripe', e.target.checked)} />}
                                label="Card (Stripe)" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControlLabel
                                control={<Checkbox checked={form.allow_etransfer} onChange={(e) => set('allow_etransfer', e.target.checked)} />}
                                label="Interac e-Transfer" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControlLabel
                                control={<Checkbox checked={form.allow_cash} onChange={(e) => set('allow_cash', e.target.checked)} />}
                                label="Cash at the door" />
                        </Grid>
                        {form.allow_stripe && (
                            <Grid size={12}>
                                <Alert severity="info" sx={{ mt: -1 }}>
                                    Card payments only appear on the website once STRIPE_SECRET_KEY is set in
                                    Netlify. Until then this checkbox has no visible effect.
                                </Alert>
                            </Grid>
                        )}

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth label="E-transfer address" value={form.etransfer_email}
                                onChange={(e) => set('etransfer_email', e.target.value)} margin="dense"
                                helperText="Shown to buyers who choose e-transfer" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth select label="Hold unpaid seats for" value={form.etransfer_hold_hours}
                                onChange={(e) => set('etransfer_hold_hours', e.target.value)} margin="dense">
                                <MenuItem value="24">24 hours</MenuItem>
                                <MenuItem value="48">2 days</MenuItem>
                                <MenuItem value="72">3 days</MenuItem>
                                <MenuItem value="120">5 days</MenuItem>
                                <MenuItem value="168">7 days</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth multiline minRows={2} label="E-transfer instructions"
                                value={form.etransfer_instructions}
                                onChange={(e) => set('etransfer_instructions', e.target.value)} margin="dense"
                                helperText="Any extra notes, e.g. the security answer if auto-deposit is off" />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth label="Refund policy" value={form.refund_policy}
                                onChange={(e) => set('refund_policy', e.target.value)} margin="dense"
                                helperText="Shown on the purchase page and in the confirmation email" />
                        </Grid>
                        <Grid size={12}>
                            <FormControlLabel
                                control={<Checkbox checked={form.published} onChange={(e) => set('published', e.target.checked)} />}
                                label="Published — visible on the website and open for sales" />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)} disabled={saveMutation.isPending}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => { setError(null); saveMutation.mutate(form); }}
                        disabled={saveMutation.isPending || !form.title || !form.starts_at}
                        startIcon={saveMutation.isPending ? <CircularProgress size={16} /> : undefined}
                        sx={{ backgroundColor: 'accent.navy', '&:hover': { backgroundColor: 'primary.main' } }}
                    >
                        {saveMutation.isPending ? 'Saving...' : 'Save Event'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirmation */}
            <Dialog open={Boolean(deleteTarget)} onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}>
                <DialogTitle>Delete event</DialogTitle>
                <DialogContent>
                    <Typography>
                        Delete <strong>{deleteTarget?.title}</strong>? This cannot be undone.
                    </Typography>
                    {Boolean(deleteTarget?.stats.orderCount) && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            This event has {deleteTarget?.stats.orderCount} order(s). Deleting will be refused —
                            unpublish it instead to take it off the website while keeping the payment records.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>Cancel</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                        disabled={deleteMutation.isPending}
                        startIcon={deleteMutation.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
                    >
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
