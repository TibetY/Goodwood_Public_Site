import { useLoaderData } from 'react-router';
import { Container, Typography, Box, Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../utils/supabase';
import type { Route } from './+types/officers';

interface Officer {
    id?: string
    title: string;
    name: string;
    image?: string;
    position: number;
}

// Server-side cache for officers data
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let officersCache: { data: Officer[], timestamp: number } | null = null;

export async function loader({ request }: Route.LoaderArgs) {
    try {
        const now = Date.now();

        // Return cached data if still fresh
        if (officersCache && (now - officersCache.timestamp) < CACHE_TTL) {
            console.log('✅ Officers: Serving from cache');
            return { officers: officersCache.data };
        }

        console.log('🔄 Officers: Fetching fresh data from DB');
        const { data, error } = await supabase
            .from('officers')
            .select('*')
            .order('position', { ascending: true });

        if (error) throw error;

        // Update cache
        officersCache = { data: data || [], timestamp: now };

        return { officers: data || [] };
    } catch (err) {
        console.error('Error fetching officers:', err);
        throw new Response('Failed to load officers', { status: 500 });
    }
}

export default function Officers() {
    const { officers } = useLoaderData<typeof loader>();
    const { t } = useTranslation();
    const currentYear = new Date().getFullYear();

    const getInitials = (name: string) => {
        // Remove titles like "W. Bro.", "V.W. Bro.", "Bro."
        const cleanName = name.replace(/^(V\.W\.|W\.|R\.W\.)?\s*Bro\.\s*/i, '');
        if (cleanName === 'TBA') return 'TBA';

        const parts = cleanName.split(' ');
        return parts.map(part => part[0]).join('').toUpperCase();
    };

    return (
        <>
            {/* Page header band */}
            <Box sx={{ backgroundColor: 'section.hero', borderBottom: theme => `1px solid ${theme.palette.section.border}` }}>
                <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="overline" sx={{ color: 'accent.gold' }}>
                        Goodwood Lodge No. 159
                    </Typography>
                    <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '2.25rem', md: '3rem' } }}>
                        {t('officers.title')}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: '60ch' }}>
                        {t('officers.description', { currentYear, endYear: currentYear + 1 })}
                    </Typography>
                </Container>
            </Box>

            {/* Officers grid */}
            <Box sx={{ backgroundColor: 'background.paper' }}>
                <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
                    <Grid container spacing={3}>
                        {officers.map((officer: Officer, index: number) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={index}>
                                <Box
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        textAlign: 'center',
                                        border: theme => `1px solid ${theme.palette.section.border}`,
                                        transition: 'transform 0.25s ease, border-color 0.25s ease',
                                        '&:hover': {
                                            transform: 'translateY(-3px)',
                                            borderColor: 'accent.gold',
                                        },
                                    }}
                                >
                                    {officer.image ? (
                                        <Box
                                            component="img"
                                            src={officer.image}
                                            alt={officer.name}
                                            sx={{
                                                width: '100%',
                                                height: 280,
                                                objectFit: 'cover',
                                                objectPosition: 'center top',
                                                display: 'block',
                                            }}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                height: 280,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: 'section.accent',
                                            }}
                                        >
                                            <Typography
                                                variant="h3"
                                                component="span"
                                                sx={{ color: 'accent.goldOnDark', fontSize: '2.5rem' }}
                                            >
                                                {getInitials(officer.name)}
                                            </Typography>
                                        </Box>
                                    )}
                                    <Box sx={{ flexGrow: 1, py: 2.5, px: 2 }}>
                                        <Typography variant="overline" sx={{ color: 'accent.gold', display: 'block' }}>
                                            {t(officer.title)}
                                        </Typography>
                                        <Typography variant="h6" component="h2" sx={{ mt: 0.5 }}>
                                            {officer.name}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>
        </>
    );
}
