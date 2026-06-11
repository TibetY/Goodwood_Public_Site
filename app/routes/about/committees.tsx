import { useLoaderData } from 'react-router';
import { Container, Typography, Box, Stack, Grid } from '@mui/material';
import { supabase } from '../../utils/supabase';
import { t } from 'i18next';
import type { Route } from './+types/committees';

interface CommitteeMember {
    id: number;
    committee_id: number;
    name: string;
    position: number;
}

interface Committee {
    id: number;
    title: string;
    members: CommitteeMember[];
}

// Server-side cache for committees data
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let committeesCache: { data: Committee[], timestamp: number } | null = null;

export async function loader({ request }: Route.LoaderArgs) {
    try {
        const now = Date.now();

        // Return cached data if still fresh
        if (committeesCache && (now - committeesCache.timestamp) < CACHE_TTL) {
            console.log('✅ Committees: Serving from cache');
            return { committees: committeesCache.data };
        }

        console.log('🔄 Committees: Fetching fresh data from DB');
        const { data, error } = await supabase
            .from('committees')
            .select(`
                id,
                title,
                members:committee_members(*)
            `)
            .order('title');

        if (error) throw error;

        const committeesWithMembers = data.map(committee => ({
            ...committee,
            members: committee.members.sort((a: CommitteeMember, b: CommitteeMember) => a.position - b.position)
        }));

        // Update cache
        committeesCache = { data: committeesWithMembers, timestamp: now };

        return { committees: committeesWithMembers };
    } catch (err) {
        console.error('Error fetching committees:', err);
        throw new Response('Failed to load committees', { status: 500 });
    }
}

export default function Committees() {
    const { committees } = useLoaderData<typeof loader>();

    return (
        <>
            {/* Page header band */}
            <Box sx={{ backgroundColor: 'section.hero', borderBottom: theme => `1px solid ${theme.palette.section.border}` }}>
                <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="overline" sx={{ color: 'accent.gold' }}>
                        Goodwood Lodge No. 159
                    </Typography>
                    <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '2.25rem', md: '3rem' } }}>
                        {t("committees.title")}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: '60ch' }}>
                        {t("committees.description")}
                    </Typography>
                </Container>
            </Box>

            {/* Committees list */}
            <Box sx={{ backgroundColor: 'background.paper' }}>
                <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
                    <Grid container spacing={4}>
                        {committees.map((committee: Committee, index: number) => (
                            <Grid size={{ xs: 12, md: 6 }} key={committee.id || index}>
                                <Box
                                    sx={{
                                        height: '100%',
                                        borderTop: theme => `2px solid ${theme.palette.accent.navy}`,
                                        pt: 2.5,
                                    }}
                                >
                                    <Typography variant="h5" component="h2" gutterBottom>
                                        {committee.title}
                                    </Typography>

                                    {committee.members.length > 0 ? (
                                        <Stack direction="column" spacing={1} sx={{ mt: 1.5 }}>
                                            {committee.members.map((member) => (
                                                <Typography
                                                    key={member.id}
                                                    variant="body1"
                                                    sx={{ color: 'text.secondary' }}
                                                >
                                                    {member.name}
                                                </Typography>
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Typography variant="body2" fontStyle="italic" sx={{ color: 'section.subtle', mt: 1.5 }}>
                                            No members listed
                                        </Typography>
                                    )}
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>
        </>
    );
}
