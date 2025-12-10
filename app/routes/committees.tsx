import { Container, Typography, Box, Grid, Card, CardContent, Chip, Stack, Divider, Paper } from '@mui/material';

interface CommitteeMember {
    name: string;
}

interface Committee {
    title: string;
    members: CommitteeMember[];
    description?: string;
}

const committees: Committee[] = [
    {
        title: 'Committee of General Purposes',
        members: [
            { name: 'Senior Warden' },
            { name: 'All Lodge Members' }
        ]
    },
    {
        title: 'Finance Committee',
        members: [
            { name: 'Worshipful Master' },
            { name: 'Secretary' },
            { name: 'Treasurer' }
        ]
    },
    {
        title: 'Benevolence',
        members: [
            { name: 'Bro. Joe Burchill' },
            { name: 'Bro. Ted Burch' }
        ]
    },
    {
        title: 'Bro. to Bro.',
        members: [
            { name: 'W. Bro. Jordan McConnell' },
            { name: 'Bro. Brad McBride' }
        ]
    },
    {
        title: 'Officer Progression',
        members: [
            { name: 'R. W. Bro Don Healey' },
            { name: 'V. W. Bro. Ken Burchill' }
        ]
    },
    {
        title: 'Sick & Visiting',
        members: [
            { name: 'Bro. Ted Burch' },
            { name: 'W. Bro. Greg Skelly' }
        ]
    },
    {
        title: 'Website Development',
        members: [
            { name: 'Bro. Tibet Akyurekli' }
        ]
    },
    {
        title: 'Ottawa Masonic Association Representative',
        members: [
            { name: 'Bro. Joe Burchill' }
        ]
    },
    {
        title: 'Candidate Progression',
        members: [
            { name: 'V.W. Bro. Ivan Harris' },
            { name: 'Bro. Rod Costain' }
        ]
    },
    {
        title: 'Director of the Work',
        members: []
    }
];

export default function Committees() {
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
                    <Box key={index}>
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
                                    {committee.members.map((member, memberIndex) => (
                                        <Chip
                                            key={memberIndex}
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