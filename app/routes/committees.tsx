import { useLoaderData } from 'react-router';
import { Container, Typography, Box, Stack, Divider, Paper } from '@mui/material';
import { supabase } from '../utils/supabase';
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

export async function loader({ request }: Route.LoaderArgs) {
    try {
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

        return { committees: committeesWithMembers };
    } catch (err) {
        console.error('Error fetching committees:', err);
        throw new Response('Failed to load committees', { status: 500 });
    }
}

export default function Committees() {
    const { committees } = useLoaderData<typeof loader>();

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" textAlign="center">
                {t("committees.title")}
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 6 }}>
                {t("committees.description")}
            </Typography>

            <Paper elevation={2} sx={{ p: 4 }}>
                {committees.map((committee: Committee, index: number) => (
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
                                <Stack direction="column" spacing={1} flexWrap="wrap" useFlexGap>
                                    {committee.members.map((member) => (
                                        <Typography
                                            key={member.id}
                                        >
                                            {member.name}
                                        </Typography>
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
