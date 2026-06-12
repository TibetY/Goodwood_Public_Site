import { Container, Typography, Box, Grid } from '@mui/material';
import type { Route } from '../../+types/root';
import { supabase } from '~/utils/supabase';
import { useLoaderData } from 'react-router';

interface PastMaster {
    name: string;
    years: string;
}

// Server-side cache for past masters data
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let pastMastersCache: { data: any[], timestamp: number } | null = null;

export async function loader({ request }: Route.LoaderArgs) {
    try {
        const now = Date.now();

        // Return cached data if still fresh
        if (pastMastersCache && (now - pastMastersCache.timestamp) < CACHE_TTL) {
            console.log('✅ Past Masters: Serving from cache');
            return { pastMasters: pastMastersCache.data };
        }

        console.log('🔄 Past Masters: Fetching fresh data from DB');
        const { data, error } = await supabase
            .from('past_masters')
            .select('*')
            .order('start_year', { ascending: true });

        if (error) throw error;

        // Update cache
        pastMastersCache = { data: data || [], timestamp: now };

        return { pastMasters: data };
    } catch (err) {
        console.error('Error fetching past masters:', err);
        throw new Response('Failed to load past masters', { status: 500 });
    }
}

export default function PastMasters() {
    const { pastMasters } = useLoaderData<typeof loader>();
    // Group by century and reverse the arrays
    const century1800s = pastMasters.filter(pm => pm.years.startsWith('18')).reverse();
    const century1900s = pastMasters.filter(pm => pm.years.startsWith('19')).reverse();
    const century2000s = pastMasters.filter(pm => pm.years.startsWith('20')).reverse();

    const PastMastersList = ({ masters }: { masters: PastMaster[] }) => (
        <Grid container spacing={2}>
            {masters.map((master, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                    <Box
                        sx={{
                            p: 2,
                            height: '100%',
                            border: theme => `1px solid ${theme.palette.section.border}`,
                            transition: 'transform 0.25s ease, border-color 0.25s ease',
                            '&:hover': {
                                transform: 'translateY(-3px)',
                                borderColor: 'accent.gold',
                            },
                        }}
                    >
                        <Typography variant="body1" fontWeight={500}>
                            {master.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {master.years}
                        </Typography>
                    </Box>
                </Grid>
            ))}
        </Grid>
    );

    return (
        <>
            {/* Page header band */}
            <Box sx={{ backgroundColor: 'section.hero', borderBottom: theme => `1px solid ${theme.palette.section.border}` }}>
                <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="overline" sx={{ color: 'accent.gold' }}>
                        Goodwood Lodge No. 159
                    </Typography>
                    <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '2.25rem', md: '3rem' } }}>
                        Past Masters
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: '60ch' }}>
                        Honoring the Worshipful Masters who have led Goodwood Lodge since 1863
                    </Typography>
                </Container>
            </Box>

            {/* Past Masters groupings */}
            <Box sx={{ backgroundColor: 'background.paper' }}>
                <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 6, md: 8 } }}>
                        {/* 2000s */}
                        <Box component="section">
                            <Typography variant="overline" sx={{ color: 'accent.gold', display: 'block', mb: 1 }}>
                                Present Day
                            </Typography>
                            <Typography
                                variant="h4"
                                component="h2"
                                gutterBottom
                                sx={{ borderTop: theme => `2px solid ${theme.palette.accent.navy}`, pt: 2.5, mb: 3 }}
                            >
                                Present - 2000
                            </Typography>
                            <PastMastersList masters={century2000s} />
                        </Box>

                        {/* 1900s */}
                        <Box component="section">
                            <Typography variant="overline" sx={{ color: 'accent.gold', display: 'block', mb: 1 }}>
                                The 20th Century
                            </Typography>
                            <Typography
                                variant="h4"
                                component="h2"
                                gutterBottom
                                sx={{ borderTop: theme => `2px solid ${theme.palette.accent.navy}`, pt: 2.5, mb: 3 }}
                            >
                                1999 – 1900
                            </Typography>
                            <PastMastersList masters={century1900s} />
                        </Box>

                        {/* 1800s */}
                        <Box component="section">
                            <Typography variant="overline" sx={{ color: 'accent.gold', display: 'block', mb: 1 }}>
                                The Founding Era
                            </Typography>
                            <Typography
                                variant="h4"
                                component="h2"
                                gutterBottom
                                sx={{ borderTop: theme => `2px solid ${theme.palette.accent.navy}`, pt: 2.5, mb: 3 }}
                            >
                                1899 – 1863
                            </Typography>
                            <PastMastersList masters={century1800s} />
                        </Box>
                    </Box>
                </Container>
            </Box>
        </>
    );
}
