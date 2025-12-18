import { Container, Typography, Box, Paper, Grid, Divider } from '@mui/material';
import type { Route } from '../../+types/root';
import { supabase } from '~/utils/supabase';
import { useLoaderData } from 'react-router';

interface PastMaster {
    name: string;
    years: string;
}

export async function loader({ request }: Route.LoaderArgs) {
    try {
        const { data, error } = await supabase
            .from('past_masters')
            .select('*')
            .order('start_year', { ascending: true });

        if (error) throw error;

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
                    <Paper
                        elevation={1}
                        sx={{
                            p: 2,
                        }}
                    >
                        <Typography variant="body1" fontWeight="medium">
                            {master.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {master.years}
                        </Typography>
                    </Paper>
                </Grid>
            ))}
        </Grid>
    );

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" textAlign="center">
                Past Masters
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph textAlign="center" sx={{ mb: 6 }}>
                Honoring the Worshipful Masters who have led Goodwood Lodge since 1863
            </Typography>

            {/* 2000s */}
            <Box>
                <Typography variant="h4" component="h2" gutterBottom color="primary" sx={{ mb: 3 }}>
                    Present - 2000
                </Typography>
                <PastMastersList masters={century2000s} />
            </Box>

            <Divider sx={{ my: 6 }} />

            {/* 1900s */}
            <Box sx={{ mb: 6 }}>
                <Typography variant="h4" component="h2" gutterBottom color="primary" sx={{ mb: 3 }}>
                    1999 – 1900
                </Typography>
                <PastMastersList masters={century1900s} />
            </Box>

            <Divider sx={{ my: 6 }} />

            {/* 1800s */}
            <Box sx={{ mb: 6 }}>
                <Typography variant="h4" component="h2" gutterBottom color="primary" sx={{ mb: 3 }}>
                    1899 – 1863
                </Typography>
                <PastMastersList masters={century1800s} />
            </Box>
        </Container>
    );
}