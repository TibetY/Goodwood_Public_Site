import { Container, Typography, Box, Paper } from '@mui/material';
import { t } from 'i18next';

export default function Events() {
    const calendarUrl = import.meta.env.VITE_GOOGLE_CAL;

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
                {t("events.title")}
            </Typography>
            <Typography variant="body1" color="text.secondary">
                {t("events.viewEvents")}
            </Typography>

            <Paper elevation={2} sx={{ mt: 4, overflow: 'hidden' }}>
                <Box
                    component="iframe"
                    src={calendarUrl}
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