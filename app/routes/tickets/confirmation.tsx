import { useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
    Container, Typography, Box, Button, CircularProgress, Alert, Paper, Divider,
} from '@mui/material';
import { fetchOrder, formatMoney, formatEventDate } from '../../utils/tickets';

// Shown straight after a purchase.
//
// For a card payment this page is reached by Stripe's success redirect, which
// can land BEFORE the webhook that actually marks the order paid. So while the
// order is still pending we say "confirming your payment" and keep polling —
// never "payment failed", which would be both wrong and alarming.

const MAX_POLLS = 15;

export default function TicketConfirmation() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('t') || '';

    const { data, isLoading, isError, failureCount } = useQuery({
        queryKey: ['order', token],
        queryFn: () => fetchOrder(token),
        enabled: Boolean(token),
        refetchInterval: (query) => {
            const status = query.state.data?.order.payment_status;
            const method = query.state.data?.order.payment_method;
            // Only a card payment is expected to flip status on its own.
            if (status === 'pending' && method === 'stripe' && query.state.dataUpdateCount < MAX_POLLS) {
                return 2000;
            }
            return false;
        },
    });

    if (!token) {
        return (
            <Container maxWidth="sm" sx={{ py: 10 }}>
                <Alert severity="info">This link is missing its ticket reference.</Alert>
                <Button sx={{ mt: 3 }} onClick={() => navigate('/events')}>Back to events</Button>
            </Container>
        );
    }

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
                <Alert severity="error">We could not find that order.</Alert>
                <Button sx={{ mt: 3 }} onClick={() => navigate('/events')}>Back to events</Button>
            </Container>
        );
    }

    const { order, event } = data;
    const isPaid = order.payment_status === 'paid';
    const isCard = order.payment_method === 'stripe';
    const stillConfirming = !isPaid && isCard && failureCount === 0;

    return (
        <Container maxWidth="sm" sx={{ py: { xs: 6, md: 9 } }}>
            <Typography sx={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'accent.gold', mb: 1 }}>
                Goodwood Lodge No. 159
            </Typography>
            <Typography component="h1" sx={{ fontFamily: '"Playfair Display", serif', fontSize: { xs: 30, md: 40 }, mb: 3 }}>
                {isPaid ? 'You’re booked in' : stillConfirming ? 'Confirming your payment…' : 'Seat reserved'}
            </Typography>

            {stillConfirming && (
                <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 3 }}>
                    We’re confirming your payment with our processor. This usually takes a few seconds —
                    you can safely leave this page, your confirmation email is on its way.
                </Alert>
            )}

            {isPaid && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    Payment received. We’ve emailed your ticket and QR code to {order.buyer_name.split(' ')[0]}.
                </Alert>
            )}

            {!isPaid && !isCard && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    {order.payment_method === 'etransfer'
                        ? 'Your seat is held. Send your e-Transfer using the details we just emailed you — and put your reference in the memo.'
                        : 'Your seat is held. Bring cash to the door on the night.'}
                </Alert>
            )}

            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3.5 },
                    backgroundColor: 'section.neutral',
                    border: (theme) => `1px solid ${theme.palette.section.border}`,
                }}
            >
                <Typography sx={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.secondary' }}>
                    Your reference
                </Typography>
                <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 34, letterSpacing: '0.06em', mb: 2 }}>
                    {order.reference}
                </Typography>

                <Divider sx={{ my: 2 }} />

                {event && (
                    <>
                        <Typography sx={{ fontSize: 18, fontWeight: 600 }}>{event.title}</Typography>
                        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
                            {formatEventDate(event.starts_at)}{event.location ? ` · ${event.location}` : ''}
                        </Typography>
                    </>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography color="text.secondary">Tickets</Typography>
                    <Typography>{order.quantity}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography color="text.secondary">Total</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{formatMoney(order.amount_cents)}</Typography>
                </Box>

                {!isPaid && order.payment_method === 'etransfer' && event?.etransfer_email && (
                    <Box sx={{
                        mt: 2.5, p: 2,
                        border: (theme) => `2px solid ${theme.palette.accent.gold}`,
                        borderRadius: '4px',
                    }}>
                        <Typography sx={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.secondary' }}>
                            Send your e-Transfer to
                        </Typography>
                        <Typography sx={{ fontSize: 18, wordBreak: 'break-all', mb: 1.5 }}>
                            {event.etransfer_email}
                        </Typography>
                        <Typography sx={{ fontSize: 14, lineHeight: 1.6 }}>
                            Put <strong>{order.reference}</strong> in the memo. That’s how we match your
                            payment to your ticket.
                        </Typography>
                    </Box>
                )}
            </Paper>

            <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {isPaid && (
                    <Button
                        variant="contained"
                        onClick={() => navigate(`/t/${order.checkin_token}`)}
                        sx={{ backgroundColor: 'accent.navy', '&:hover': { backgroundColor: 'primary.main' }, minHeight: 44 }}
                    >
                        View your ticket
                    </Button>
                )}
                <Button onClick={() => navigate('/events')} sx={{ minHeight: 44 }}>Back to events</Button>
            </Box>
        </Container>
    );
}
