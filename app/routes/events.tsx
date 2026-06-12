import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
    Container, Typography, Box, ToggleButton, ToggleButtonGroup,
    CircularProgress, Link as MuiLink,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import {
    fetchEvents, eventDateCard, eventTimeLabel, eventMonthYear,
    type LodgeEvent,
} from '../utils/events';

function DateCard({ ev }: { ev: LodgeEvent }) {
    const { day, month } = eventDateCard(ev);
    return (
        <Box
            sx={{
                width: 84,
                flexShrink: 0,
                backgroundColor: 'accent.navy',
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

function EventRow({ ev }: { ev: LodgeEvent }) {
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
            }}
        >
            <DateCard ev={ev} />
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
        </Box>
    );
}

export default function Events() {
    const { t } = useTranslation();
    const [view, setView] = useState<'list' | 'calendar'>('list');
    const calendarUrl = import.meta.env.VITE_GOOGLE_CAL;

    const { data, isLoading, isError } = useQuery({
        queryKey: ['events'],
        queryFn: fetchEvents,
        enabled: view === 'list',
        staleTime: 5 * 60 * 1000,
    });

    const upcoming = data?.upcoming ?? [];
    const past = data?.past ?? [];

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
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {/* Upcoming */}
                            <Box>
                                <Typography variant="h4" component="h2" sx={{ mb: 1 }}>{t('events.upcoming', 'Upcoming')}</Typography>
                                {upcoming.length > 0 ? (
                                    <Box sx={{ borderBottom: (theme) => `1px solid ${theme.palette.section.border}` }}>
                                        {upcoming.map((ev) => <EventRow key={ev.id} ev={ev} />)}
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 6, color: 'section.subtle', borderTop: (theme) => `1px solid ${theme.palette.section.border}` }}>
                                        <EventIcon sx={{ fontSize: 36, opacity: 0.5 }} />
                                        <Typography sx={{ color: 'text.secondary' }}>
                                            {isError || data?.configured === false
                                                ? t('events.noEventsConfigured', 'Our calendar will appear here shortly. In the meantime, please check back or contact the lodge.')
                                                : t('events.noUpcoming', 'No upcoming events scheduled at the moment. Please check back soon.')}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {/* Past */}
                            {past.length > 0 && (
                                <Box>
                                    <Typography variant="h4" component="h2" sx={{ mb: 1 }}>{t('events.past', 'Past Events')}</Typography>
                                    <Box sx={{ borderBottom: (theme) => `1px solid ${theme.palette.section.border}` }}>
                                        {past.map((ev) => (
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
