import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
    Container, Typography, Box, Button, CircularProgress, Alert, Chip,
    ToggleButton, ToggleButtonGroup, Paper,
} from '@mui/material';
import {
    fetchTicketedEvent, formatMoney, formatEventDate, availableMethods,
    isOnSale, isSoldOut, seatsRemaining, shouldShowSeatsLeft, maxSelectableQuantity,
    type PaymentMethod,
} from '../../utils/tickets';
import { useTurnstile } from '../../utils/useTurnstile';

const fieldLabelSx = {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'text.secondary',
} as const;

const inputSx = {
    fontFamily: '"Public Sans", sans-serif',
    fontSize: '15px',
    color: 'text.primary',
    p: '13px 14px',
    border: (theme: any) => `1px solid ${theme.palette.section.border}`,
    borderRadius: '3px',
    backgroundColor: 'background.paper',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s ease',
    '&:focus': { borderColor: 'accent.gold' },
    '&:focus-visible': { outline: '2px solid', outlineColor: 'accent.gold', outlineOffset: '1px' },
    '&::placeholder': { color: 'section.subtle' },
} as const;

const EMAIL_PATTERN =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const METHOD_COPY: Record<PaymentMethod, { label: string; hint: string }> = {
    zeffy: { label: 'Credit / debit card', hint: 'Pay now on the lodge’s secure Zeffy page. Your ticket is emailed once the payment clears — usually within a minute.' },
    etransfer: { label: 'Interac e-Transfer', hint: 'We hold your seat and email you where to send it. Your ticket arrives once we confirm receipt.' },
    cash: { label: 'Cash at the door', hint: 'We hold your seat. Bring cash on the night and we will check you in.' },
};

export default function BuyTickets() {
    const { slug = '' } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const turnstile = useTurnstile();

    const [quantity, setQuantity] = useState(1);
    const [method, setMethod] = useState<PaymentMethod | ''>('');
    const [form, setForm] = useState({ buyerName: '', buyerEmail: '', buyerPhone: '', notes: '' });
    const [errors, setErrors] = useState({ email: '', captcha: '', method: '' });
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const { data: event, isLoading, isError } = useQuery({
        queryKey: ['ticketed-event', slug],
        queryFn: () => fetchTicketedEvent(slug),
        enabled: Boolean(slug),
        retry: false,
    });

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm({ ...form, [key]: e.target.value });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!event) return;

        const emailValid = EMAIL_PATTERN.test(form.buyerEmail.trim());
        const methodValid = Boolean(method);
        setErrors({
            email: emailValid ? '' : 'Enter a valid email address.',
            captcha: turnstile.isSatisfied ? '' : 'Please complete the verification.',
            method: methodValid ? '' : 'Please choose how you would like to pay.',
        });
        if (!emailValid || !turnstile.isSatisfied || !methodValid) return;

        setSubmitting(true);
        setSubmitError(null);

        try {
            const res = await fetch('/.netlify/functions/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: event.id,
                    quantity,
                    ...form,
                    paymentMethod: method,
                    botField: (e.currentTarget.elements.namedItem('bot-field') as HTMLInputElement | null)?.value || '',
                    turnstileToken: turnstile.token,
                    elapsedMs: turnstile.elapsedMs(),
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');

            // Card: hand off to Zeffy's hosted form. Everything else: confirmation.
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
                return;
            }
            navigate(`/tickets/confirmation?t=${encodeURIComponent(data.token)}`);
        } catch (err: any) {
            turnstile.reset();
            setSubmitError(err.message || 'Something went wrong. Please try again.');
            setSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (isError || !event) {
        return (
            <Container maxWidth="sm" sx={{ py: 10 }}>
                <Alert severity="info">
                    We could not find that event. It may have finished or been taken off sale.
                </Alert>
                <Button sx={{ mt: 3 }} onClick={() => navigate('/events')}>Back to events</Button>
            </Container>
        );
    }

    const methods = availableMethods(event);
    const remaining = seatsRemaining(event);
    const soldOut = isSoldOut(event);
    const onSale = isOnSale(event);
    const maxQty = Math.max(1, maxSelectableQuantity(event));
    const total = event.price_cents * quantity;

    return (
        <>
            {/* Header band */}
            <Box sx={{ backgroundColor: 'section.hero', py: { xs: 6, md: 8 } }}>
                <Container maxWidth="md">
                    <Typography sx={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'accent.gold', mb: 1 }}>
                        Goodwood Lodge No. 159
                    </Typography>
                    <Typography component="h1" sx={{ fontFamily: '"Playfair Display", serif', fontSize: { xs: 32, md: 44 }, color: 'text.primary' }}>
                        {event.title}
                    </Typography>
                    <Typography sx={{ mt: 1, color: 'text.secondary', fontSize: 16 }}>
                        {formatEventDate(event.starts_at)}{event.location ? ` · ${event.location}` : ''}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip label={event.price_cents === 0 ? 'Free' : `${formatMoney(event.price_cents)} per ticket`} />
                        {shouldShowSeatsLeft(event) && remaining !== null && (
                            <Chip color="warning" label={`Only ${remaining} left`} />
                        )}
                        {soldOut && <Chip color="error" label="Sold out" />}
                    </Box>
                </Container>
            </Box>

            <Container maxWidth="md" sx={{ py: { xs: 5, md: 7 } }}>
                {event.description && (
                    <Typography sx={{ fontSize: 16, lineHeight: 1.7, color: 'text.primary', mb: 4, whiteSpace: 'pre-line' }}>
                        {event.description}
                    </Typography>
                )}

                {searchParams.get('cancelled') === '1' && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        Your card payment was cancelled and nothing was charged. You can try again below.
                    </Alert>
                )}

                {soldOut ? (
                    <Alert severity="warning">
                        This event is sold out. Please contact the Secretary to be added to a waiting list.
                    </Alert>
                ) : !onSale ? (
                    <Alert severity="info">Tickets are not on sale for this event right now.</Alert>
                ) : methods.length === 0 ? (
                    <Alert severity="info">
                        Online payment is not set up for this event yet. Please contact the Secretary.
                    </Alert>
                ) : (
                    <Paper
                        elevation={0}
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{
                            p: { xs: 2.5, md: 4 },
                            backgroundColor: 'section.neutral',
                            border: (theme) => `1px solid ${theme.palette.section.border}`,
                        }}
                    >
                        {/* Honeypot — hidden from people, tempting to bots. */}
                        <Box
                            component="input"
                            name="bot-field"
                            tabIndex={-1}
                            autoComplete="off"
                            aria-hidden="true"
                            sx={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }}
                        />

                        <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 24, mb: 3 }}>
                            Buy tickets
                        </Typography>

                        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                <Typography component="label" htmlFor="buyerName" sx={fieldLabelSx}>Full name *</Typography>
                                <Box component="input" id="buyerName" required name="buyerName" autoComplete="name"
                                    value={form.buyerName} onChange={set('buyerName')} disabled={submitting}
                                    placeholder="John Smith" sx={inputSx} />
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                <Typography component="label" htmlFor="quantity" sx={fieldLabelSx}>
                                    Number of tickets * {maxQty > 0 && `(max ${maxQty})`}
                                </Typography>
                                <Box component="input" id="quantity" required type="number" name="quantity"
                                    value={quantity} disabled={submitting}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setQuantity(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))}
                                    min={1} max={maxQty} sx={inputSx} />
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                <Typography component="label" htmlFor="buyerEmail" sx={fieldLabelSx}>Email *</Typography>
                                <Box component="input" id="buyerEmail" required type="email" name="buyerEmail"
                                    autoComplete="email" value={form.buyerEmail} onChange={set('buyerEmail')}
                                    disabled={submitting} placeholder="john@example.com" sx={inputSx} />
                                {errors.email && <Typography sx={{ fontSize: 13, color: 'error.main' }}>{errors.email}</Typography>}
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                <Typography component="label" htmlFor="buyerPhone" sx={fieldLabelSx}>Phone (optional)</Typography>
                                <Box component="input" id="buyerPhone" type="tel" name="buyerPhone" autoComplete="tel"
                                    value={form.buyerPhone} onChange={set('buyerPhone')} disabled={submitting}
                                    placeholder="(613)-555-0123" sx={inputSx} />
                            </Box>
                            <Box sx={{ gridColumn: { sm: '1 / -1' }, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                <Typography component="label" htmlFor="notes" sx={fieldLabelSx}>
                                    Dietary needs or guest names (optional)
                                </Typography>
                                <Box component="textarea" id="notes" name="notes" rows={3} value={form.notes}
                                    onChange={set('notes')} disabled={submitting}
                                    sx={{ ...inputSx, resize: 'vertical' }} />
                            </Box>
                        </Box>

                        {/* Payment method */}
                        <Box sx={{ mt: 4 }}>
                            <Typography sx={{ ...fieldLabelSx, mb: 1.5, display: 'block' }}>How would you like to pay? *</Typography>
                            <ToggleButtonGroup
                                exclusive
                                value={method}
                                onChange={(_e, v) => v && setMethod(v)}
                                sx={{ flexWrap: 'wrap', gap: 1, '& .MuiToggleButton-root': { borderRadius: '3px !important', border: (theme) => `1px solid ${theme.palette.section.border} !important`, minHeight: 44 } }}
                                aria-label="Payment method"
                            >
                                {methods.map((m) => (
                                    <ToggleButton key={m} value={m} disabled={submitting}>
                                        {METHOD_COPY[m].label}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                            {errors.method && <Typography sx={{ fontSize: 13, color: 'error.main', mt: 1 }}>{errors.method}</Typography>}
                            {method && (
                                <Typography sx={{ fontSize: 14, color: 'section.subtle', mt: 1.5, lineHeight: 1.6 }}>
                                    {METHOD_COPY[method].hint}
                                </Typography>
                            )}
                            {method === 'etransfer' && event.etransfer_instructions && (
                                <Alert severity="info" sx={{ mt: 2 }}>{event.etransfer_instructions}</Alert>
                            )}
                        </Box>

                        {/* Total */}
                        <Box sx={{
                            mt: 4, pt: 3,
                            borderTop: (theme) => `1px solid ${theme.palette.section.border}`,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                        }}>
                            <Typography sx={fieldLabelSx}>Total</Typography>
                            <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 30 }}>
                                {formatMoney(total)}
                            </Typography>
                        </Box>

                        {turnstile.siteKey && <Box ref={turnstile.widgetRef} sx={{ mt: 3 }} />}
                        {errors.captcha && <Typography sx={{ fontSize: 13, color: 'error.main', mt: 1 }}>{errors.captcha}</Typography>}
                        {submitError && <Alert severity="error" sx={{ mt: 2 }}>{submitError}</Alert>}

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={submitting}
                            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
                            sx={{
                                mt: 3, minHeight: 48, px: 4,
                                backgroundColor: 'accent.navy',
                                '&:hover': { backgroundColor: 'primary.main' },
                            }}
                        >
                            {submitting ? 'Please wait…' : method === 'zeffy' ? 'Continue to payment' : 'Reserve tickets'}
                        </Button>

                        <Typography sx={{ fontSize: 13, color: 'section.subtle', mt: 2, lineHeight: 1.6 }}>
                            We use your name, email and phone number only to manage this booking.
                            {event.refund_policy ? ` ${event.refund_policy}` : ''}
                        </Typography>
                    </Paper>
                )}
            </Container>
        </>
    );
}
