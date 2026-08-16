import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
    Container, Typography, Box, Button, CircularProgress, Alert, Paper, Chip, Divider,
} from '@mui/material';
import { fetchOrder, formatMoney, formatEventDate } from '../../utils/tickets';
import { useAuth } from '../../context/auth-context';

// The ticket itself, at /t/:token. This is the URL encoded in the QR code, so
// scanning it with any phone's built-in camera app just works — the doorkeeper
// needs no scanner app and no training.
//
// It renders for two audiences:
//   - the guest, who sees their own ticket and payment status, and nothing else;
//   - an event admin, who additionally gets the check-in controls.
//
// Scanning your own ticket therefore does NOT check you in: that privilege lives
// on the server, in admin-check-in.ts.

export function meta() {
    return [
        { title: 'Your ticket — Goodwood Lodge No. 159' },
        // A ticket link is a bearer credential; keep it out of search results.
        { name: 'robots', content: 'noindex,nofollow' },
    ];
}

export default function Ticket() {
    const { token = '' } = useParams();
    const navigate = useNavigate();
    const { hasRole } = useAuth();
    const isEventAdmin = hasRole('event_admin');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['order', token],
        queryFn: () => fetchOrder(token),
        enabled: Boolean(token),
        retry: false,
    });

    if (isLoading) {
        return (
            <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (isError || !data) {
        return (
            <Container maxWidth="sm" sx={{ py: 10 }}>
                <Alert severity="error">We could not find that ticket.</Alert>
                <Button sx={{ mt: 3 }} onClick={() => navigate('/events')}>Back to events</Button>
            </Container>
        );
    }

    const { order, event } = data;
    const isPaid = order.payment_status === 'paid';
    const checkedIn = Boolean(order.checked_in_at);

    return (
        <Container maxWidth="xs" sx={{ py: { xs: 4, md: 7 } }}>
            <Paper
                elevation={3}
                sx={{
                    overflow: 'hidden',
                    border: (theme) => `1px solid ${theme.palette.section.border}`,
                }}
            >
                <Box sx={{ backgroundColor: 'accent.navy', p: 3, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'accent.goldOnDark' }}>
                        Goodwood Lodge No. 159
                    </Typography>
                    <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 24, color: '#fff', mt: 0.5 }}>
                        {event?.title || 'Lodge Event'}
                    </Typography>
                </Box>

                <Box sx={{ p: 3, textAlign: 'center' }}>
                    {isPaid ? (
                        <Box
                            component="img"
                            src={`/.netlify/functions/ticket-qr?t=${encodeURIComponent(token)}`}
                            alt={`QR code for ticket ${order.reference}`}
                            sx={{
                                width: 220, height: 220, display: 'block', mx: 'auto',
                                border: (theme) => `1px solid ${theme.palette.section.border}`,
                                borderRadius: '4px',
                            }}
                        />
                    ) : (
                        <Alert severity="warning" sx={{ textAlign: 'left' }}>
                            {order.payment_method === 'etransfer'
                                ? 'Awaiting your e-Transfer. Your QR code appears here once we confirm it.'
                                : `Bring ${formatMoney(order.amount_cents)} in cash to the door.`}
                        </Alert>
                    )}

                    <Typography sx={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.secondary', mt: 2.5 }}>
                        Reference
                    </Typography>
                    <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 30, letterSpacing: '0.06em' }}>
                        {order.reference}
                    </Typography>

                    <Box sx={{ mt: 1.5, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Chip
                            size="small"
                            color={isPaid ? 'success' : 'warning'}
                            label={isPaid ? 'Paid' : 'Payment pending'}
                        />
                        {checkedIn && <Chip size="small" label={`Admitted ${order.checked_in_count}/${order.quantity}`} />}
                    </Box>

                    <Divider sx={{ my: 2.5 }} />

                    <Typography sx={{ fontWeight: 600 }}>{order.buyer_name}</Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
                        {order.quantity} ticket{order.quantity === 1 ? '' : 's'} · {formatMoney(order.amount_cents)}
                    </Typography>
                    {event && (
                        <Typography sx={{ color: 'text.secondary', fontSize: 14, mt: 1 }}>
                            {formatEventDate(event.starts_at)}
                            {event.location ? <><br />{event.location}</> : null}
                        </Typography>
                    )}
                </Box>
            </Paper>

            {isEventAdmin && (
                <Box sx={{ mt: 3 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        You are signed in as an event admin. Open the door screen to admit this guest.
                    </Alert>
                    {event && (
                        <Button
                            fullWidth
                            variant="contained"
                            sx={{ minHeight: 48, backgroundColor: 'accent.navy', '&:hover': { backgroundColor: 'primary.main' } }}
                            onClick={() => navigate(`/portal/events/${event.id}/door?t=${encodeURIComponent(token)}`)}
                        >
                            Open door check-in
                        </Button>
                    )}
                </Box>
            )}

            <Typography sx={{ mt: 3, fontSize: 13, color: 'section.subtle', textAlign: 'center', lineHeight: 1.6 }}>
                Show this screen at the door. Save or screenshot it in case you have no signal.
            </Typography>
        </Container>
    );
}
