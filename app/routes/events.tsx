import { Container, Typography, Box, Paper } from '@mui/material';

export default function Events() {
    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
                Upcoming Events
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
                View our calendar of upcoming lodge meetings and events.
            </Typography>

            <Paper elevation={2} sx={{ mt: 4, overflow: 'hidden' }}>
                <Box
                    component="iframe"
                    src="https://calendar.google.com/calendar/embed?src=d11a0a44de4389f7cceb06093eac452e5d388020673037e231a6c40b2bc3a559%40group.calendar.google.com&ctz=America%2FToronto"
                    sx={{
                        width: '100%',
                        height: '600px',
                        border: 0,
                        display: 'block'
                    }}
                />
            </Paper>
        </Container>
    );
}