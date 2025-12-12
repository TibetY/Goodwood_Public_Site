import { useState, useEffect } from 'react';
import { Container, Typography, Box, Stack, Divider, Paper, Chip, CircularProgress } from '@mui/material';
import { supabase } from '../utils/supabase';
import { t } from 'i18next';

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

export default function Committees() {
    const [committees, setCommittees] = useState<Committee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);



    useEffect(() => {
        async function fetchCommittees() {
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
                    members: committee.members.sort((a, b) => a.position - b.position)
                }));

                setCommittees(committeesWithMembers);
            } catch (err) {
                console.error('Error fetching committees:', err);
                setError(err instanceof Error ? err.message : 'Failed to load committees');
            } finally {
                setLoading(false);
            }
        }

        fetchCommittees();
    }, []);

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>Loading committees...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ py: 8 }}>
                <Typography variant="h5" color="error" textAlign="center">
                    Error loading committees: {error}
                </Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" textAlign="center">
                {t("committees.title")}
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 6 }}>
                {t("committees.description")}
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
