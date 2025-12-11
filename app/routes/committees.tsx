import { Container, Typography, Box, Grid, Card, CardContent, Chip, Stack, Divider, Paper } from '@mui/material';
import { createClient } from '@supabase/supabase-js';
import { useLoaderData } from 'react-router';
import type { Route } from "./+types/committees";

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

// Loader function to fetch data from Supabase
export async function loader({ }: Route.LoaderArgs) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch committees
    const { data: committeesData, error: committeesError } = await supabase
        .from('committees')
        .select('*')
        .order('id');

    if (committeesError) {
        console.error('Error fetching committees:', committeesError);
        return { committees: [] };
    }

    // Fetch all committee members
    const { data: membersData, error: membersError } = await supabase
        .from('committee_members')
        .select('*')
        .order('position');

    if (membersError) {
        console.error('Error fetching committee members:', membersError);
        return { committees: committeesData.map(c => ({ ...c, members: [] })) };
    }

    // Combine committees with their members
    const committeesWithMembers: Committee[] = committeesData.map(committee => ({
        id: committee.id,
        title: committee.title,
        members: membersData.filter(member => member.committee_id === committee.id)
    }));

    return { committees: committeesWithMembers };
}

export default function Committees() {
    const { committees } = useLoaderData<typeof loader>();
    const masonicYear = `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`;

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" textAlign="center">
                Lodge Committees
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph textAlign="center" sx={{ mb: 6 }}>
                The following committees and Chairmen are in place for the {masonicYear} Masonic Year.
            </Typography>

            <Paper elevation={2} sx={{ p: 4 }}>
                {committees.map((committee, index) => (
                    <Box key={committee.id || index}>
                        <Box sx={{ mb: 3 }}>
                            <Typography
                                variant="h6"
                                component="h2"
                                color="primary"
                                gutterBottom
                            >
                                {committee.title}
                            </Typography>

                            {committee.members.length > 0 ? (
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {committee.members.map((member) => (
                                        <Chip
                                            key={member.id}
                                            label={member.name}
                                            variant="outlined"
                                            size="small"
                                        />
                                    ))}
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                    No members listed
                                </Typography>
                            )}
                        </Box>

                        {index < committees.length - 1 && <Divider sx={{ my: 3 }} />}
                    </Box>
                ))}
            </Paper>
        </Container>
    );
}
