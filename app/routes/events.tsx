import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
    Container, Typography, Box, ToggleButton, ToggleButtonGroup,
    CircularProgress, Link as MuiLink, TextField, MenuItem, Button, Chip,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import {
    fetchEvents, eventDateCard, eventTimeLabel, eventYear, eventMonthIndex,
    eventTimestamp, eventMonthYear, MONTH_NAMES, type LodgeEvent,
} from '../utils/events';
import {
    fetchTicketedEvents, formatMoney, formatEventDate, isSoldOut,
    seatsRemaining, shouldShowSeatsLeft, type TicketedEvent,
} from '../utils/tickets';

function DateCard({ ev, isPast }: { ev: LodgeEvent; isPast?: boolean }) {
    const { day, month } = eventDateCard(ev);
    return (
        <Box
            sx={{
                width: 84,
                flexShrink: 0,
                backgroundColor: isPast ? 'section.subtle' : 'accent.navy',
                color: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 2,
            }}
        >
            <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 30, lineHeight: 1 }}>{day}</Typography>
            <Typography sx={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', mt: 0.5 }}>{month}</Typography>
        </Box>
    );
}

function EventRow({ ev, isPast, ticketed }: { ev: LodgeEvent; isPast?: boolean; ticketed?: TicketedEvent }) {
    const time = eventTimeLabel(ev);
    const meta = [time, ev.location].filter(Boolean).join(' · ');
    return (
        <Box
            sx={{
                display: 'flex',
                gap: 2.75,
                py: 3,
                borderTop: (theme) => `1px solid ${theme.palette.section.border}`,
                alignItems: 'center',
                opacity: isPast ? 0.55 : 1,
            }}
        >
            <DateCard ev={ev} isPast={isPast} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 22, color: 'text.primary' }}>
                    {ev.htmlLink ? (
                        <MuiLink href={ev.htmlLink} target="_blank" rel="noopener noreferrer" underline="hover" color="inherit">
                            {ev.title}
                        </MuiLink>
                    ) : ev.title}
                </Typography>
                {meta && <Typography sx={{ fontSize: 14, color: 'section.subtle' }}>{meta}</Typography>}
            </Box>
            {ticketed && !isPast && (
                <Button
                    component={Link}
                    to={`/events/${ticketed.slug}/tickets`}
                    size="small"
                    variant="outlined"
                    startIcon={<ConfirmationNumberIcon />}
                    sx={{ flexShrink: 0, minHeight: 44, borderColor: 'accent.gold', color: 'accent.gold' }}
                >
                    {isSoldOut(ticketed) ? 'Sold out' : 'Tickets'}
                </Button>
            )}
        </Box>
    );
}

/**
 * Events that can be paid for. Rendered above the calendar list.
 *
 * /events is prerendered (scripts/prerender.mjs STATIC_ROUTES), so this data is
 * fetched client-side exactly like the calendar already is — the baked HTML
 * simply contains no ticketed events and hydrates cleanly.
 */
function TicketedEventsBand({ events }: { events: TicketedEvent[] }) {
    const navigate = useNavigate();
    if (!events.length) return null;

    return (
        <Box sx={{ backgroundColor: 'section.neutral', borderBottom: (theme) => `1px solid ${theme.palette.section.border}` }}>
            <Container maxWidth="md" sx={{ py: { xs: 5, md: 7 } }}>
                <Typography variant="overline" sx={{ color: 'accent.gold' }}>Tickets</Typography>
                <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: { xs: 26, md: 32 }, mb: 3 }}>
                    Book your place
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {events.map((ev) => {
                        const remaining = seatsRemaining(ev);
                        const soldOut = isSoldOut(ev);
                        return (
                            <Box
                                key={ev.id}
                                sx={{
                                    display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap',
                                    p: 2.5,
                                    backgroundColor: 'background.paper',
                                    border: (theme) => `1px solid ${theme.palette.section.border}`,
                                    borderRadius: '4px',
                                }}
                            >
                                <Box sx={{ flex: 1, minWidth: 200 }}>
                                    <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 20 }}>
                                        {ev.title}
                                    </Typography>
                                    <Typography sx={{ fontSize: 14, color: 'section.subtle' }}>
                                        {formatEventDate(ev.starts_at)}{ev.location ? ` · ${ev.location}` : ''}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <Chip
                                        size="small"
                                        label={ev.price_cents === 0 ? 'Free' : formatMoney(ev.price_cents)}
                                    />
                                    {shouldShowSeatsLeft(ev) && remaining !== null && (
                                        <Chip size="small" color="warning" label={`${remaining} left`} />
                                    )}
                                    <Button
                                        variant="contained"
                                        disabled={soldOut}
                                        onClick={() => navigate(`/events/${ev.slug}/tickets`)}
                                        sx={{
                                            minHeight: 44,
                                            backgroundColor: 'accent.navy',
                                            '&:hover': { backgroundColor: 'primary.main' },
                                        }}
                                    >
                                        {soldOut ? 'Sold out' : 'Buy tickets'}
                                    </Button>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Container>
        </Box>
    );
}

export default function Events() {
    const { t } = useTranslation();
    const now = new Date();
    const [view, setView] = useState<'list' | 'calendar'>('list');
    const [month, setMonth] = useState(now.getMonth());
    const [year, setYear] = useState(now.getFullYear());
    const calendarUrl = import.meta.env.VITE_GOOGLE_CAL;

    const { data, isLoading, isError } = useQuery({
        queryKey: ['events'],
        queryFn: fetchEvents,
        enabled: view === 'list',
        staleTime: 5 * 60 * 1000,
    });

    // Ticketed events are independent of the calendar feed, so a failure here
    // must not take the page down — hence no error surface and an empty default.
    const { data: ticketedEvents = [] } = useQuery({
        queryKey: ['ticketed-events'],
        queryFn: fetchTicketedEvents,
        staleTime: 60 * 1000,
    });

    /** Calendar-event id → ticketed event, for the inline "Tickets" button. */
    const ticketedByGcalId = useMemo(() => {
        const map = new Map<string, TicketedEvent>();
        for (const ev of ticketedEvents) {
            if (ev.gcal_event_id) map.set(ev.gcal_event_id, ev);
        }
        return map;
    }, [ticketedEvents]);

    const allEvents = useMemo(
        () => [...(data?.upcoming ?? []), ...(data?.past ?? [])],
        [data],
    );

    // Years available in the dropdown: every year present in the data, plus the
    // current year, newest first.
    const years = useMemo(() => {
        const set = new Set<number>([now.getFullYear()]);
        allEvents.forEach((ev) => set.add(eventYear(ev)));
        return Array.from(set).sort((a, b) => b - a);
    }, [allEvents]);

    const monthEvents = useMemo(
        () =>
            allEvents
                .filter((ev) => eventYear(ev) === year && eventMonthIndex(ev) === month)
                .sort((a, b) => eventTimestamp(a) - eventTimestamp(b)),
        [allEvents, year, month],
    );

    const isCurrentMonthView = month === now.getMonth() && year === now.getFullYear();

    // Always-visible recap of the last 2 months, regardless of the selected filter.
    const recentPast = useMemo(() => {
        const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();
        const nowMs = now.getTime();
        return allEvents
            .filter((ev) => {
                const ts = eventTimestamp(ev);
                return ts < nowMs && ts >= cutoff;
            })
            .sort((a, b) => eventTimestamp(b) - eventTimestamp(a));
    }, [allEvents]);

    return (
        <>
            {/* Header band */}
            <Box sx={{ backgroundColor: 'section.hero', borderBottom: (theme) => `1px solid ${theme.palette.section.border}` }}>
                <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 3 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Typography variant="overline" sx={{ color: 'accent.gold' }}>Goodwood Lodge No. 159</Typography>
                            <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '2.25rem', md: '3rem' } }}>
                                {t('events.title')}
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: '60ch' }}>
                                {t('events.subtitle', 'Regular meetings, degree work, and community events. Visiting brethren are always welcome at our regular meetings.')}
                            </Typography>
                        </Box>
                        <ToggleButtonGroup
                            value={view}
                            exclusive
                            onChange={(_, val) => val && setView(val)}
                            size="small"
                            sx={{
                                '& .MuiToggleButton-root': {
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    px: 2.5,
                                    borderColor: 'section.border',
                                    color: 'text.secondary',
                                    '&.Mui-selected': { backgroundColor: 'accent.navy', color: '#fff', '&:hover': { backgroundColor: 'primary.light' } },
                                },
                            }}
                        >
                            <ToggleButton value="list">{t('events.listView', 'Events')}</ToggleButton>
                            <ToggleButton value="calendar">{t('events.calendarView', 'Calendar')}</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Container>
            </Box>

            {/* Tickets — client-fetched, so the prerendered HTML stays valid */}
            {view === 'list' && <TicketedEventsBand events={ticketedEvents} />}

            {/* Body */}
            <Box sx={{ backgroundColor: 'background.paper' }}>
                <Container maxWidth={view === 'calendar' ? 'lg' : 'md'} sx={{ py: { xs: 6, md: 9 } }}>
                    {view === 'calendar' ? (
                        <Box
                            sx={{
                                border: (theme) => `1px solid ${theme.palette.section.border}`,
                                borderRadius: 1,
                                overflow: 'hidden',
                            }}
                        >
                            <Box component="iframe" title="Goodwood Lodge calendar" src={calendarUrl} sx={{ width: '100%', height: { xs: 520, md: 640 }, border: 0, display: 'block' }} />
                        </Box>
                    ) : isLoading ? (
                        <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {/* Month / Year filter */}
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <TextField
                                    select
                                    size="small"
                                    label={t('events.month', 'Month')}
                                    value={month}
                                    onChange={(e) => setMonth(Number(e.target.value))}
                                    sx={{ minWidth: 160 }}
                                >
                                    {MONTH_NAMES.map((name, idx) => (
                                        <MenuItem key={name} value={idx}>{t(`events.months.${idx}`, name)}</MenuItem>
                                    ))}
                                </TextField>
                                <TextField
                                    select
                                    size="small"
                                    label={t('events.year', 'Year')}
                                    value={year}
                                    onChange={(e) => setYear(Number(e.target.value))}
                                    sx={{ minWidth: 120 }}
                                >
                                    {years.map((y) => (
                                        <MenuItem key={y} value={y}>{y}</MenuItem>
                                    ))}
                                </TextField>
                            </Box>

                            {monthEvents.length > 0 ? (
                                <Box sx={{ borderBottom: (theme) => `1px solid ${theme.palette.section.border}` }}>
                                    {monthEvents.map((ev) => (
                                        <EventRow
                                            key={ev.id}
                                            ev={ev}
                                            isPast={isCurrentMonthView && eventTimestamp(ev) < now.getTime()}
                                            ticketed={ticketedByGcalId.get(ev.id)}
                                        />
                                    ))}
                                </Box>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 6, color: 'section.subtle', borderTop: (theme) => `1px solid ${theme.palette.section.border}` }}>
                                    <EventIcon sx={{ fontSize: 36, opacity: 0.5 }} />
                                    <Typography sx={{ color: 'text.secondary' }}>
                                        {isError || data?.configured === false
                                            ? t('events.noEventsConfigured', 'Our calendar will appear here shortly. In the meantime, please check back or contact the lodge.')
                                            : t('events.noEventsThisMonth', 'No events scheduled for {{month}} {{year}}.', { month: t(`events.months.${month}`, MONTH_NAMES[month]), year })}
                                    </Typography>
                                </Box>
                            )}

                            {/* Recent Past Events recap — always visible, independent of the Month/Year filter */}
                            {recentPast.length > 0 && (
                                <Box sx={{ mt: 3 }}>
                                    <Typography variant="h6" component="h3" sx={{ mb: 1 }}>{t('events.recentPast', 'Recent Past Events')}</Typography>
                                    <Box sx={{ borderBottom: (theme) => `1px solid ${theme.palette.section.border}` }}>
                                        {recentPast.map((ev) => (
                                            <Box key={ev.id} sx={{ display: 'flex', gap: 2, py: 2, borderTop: (theme) => `1px solid ${theme.palette.section.border}`, alignItems: 'baseline', flexWrap: 'wrap' }}>
                                                <Typography sx={{ fontSize: 13, color: 'section.subtle', width: 110, flexShrink: 0 }}>{eventMonthYear(ev)}</Typography>
                                                <Typography sx={{ fontSize: 16, color: 'text.primary' }}>{ev.title}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}
                </Container>
            </Box>
        </>
    );
}
