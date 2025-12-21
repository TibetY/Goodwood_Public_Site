import type { Route } from "./+types/thankYou";
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Container, Typography, Box, Button, Paper } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Thank You - Goodwood Lodge No. 159" },
        { name: "description", content: "Thank you for contacting Goodwood Lodge No. 159. We'll be in touch soon." },
    ];
}

export default function ThankYou() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <>
            {/* Hero Section */}
            <Box
                sx={{
                    backgroundColor: '#13294b',
                    color: 'white',
                    py: { xs: 6, md: 8 },
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
            >
                <Container maxWidth="md">
                    <Typography
                        variant="h1"
                        sx={{
                            fontSize: { xs: '2.5rem', md: '3rem' },
                            mb: 2,
                            textAlign: 'center',
                        }}
                    >
                        Thank You!
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            fontSize: '1.25rem',
                            textAlign: 'center',
                            color: 'rgba(255,255,255,0.9)',
                        }}
                    >
                        We've received your message
                    </Typography>
                </Container>
            </Box>

            {/* Success Message Section */}
            <Box
                sx={{
                    backgroundColor: '#f5f5f5',
                    py: { xs: 6, md: 10 },
                }}
            >
                <Container maxWidth="md">
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 3, md: 5 },
                            borderRadius: 2,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                            textAlign: 'center',
                        }}
                    >
                        <CheckCircleIcon
                            sx={{
                                fontSize: 80,
                                color: 'success.main',
                                mb: 3,
                            }}
                        />

                        <Typography
                            variant="h4"
                            sx={{
                                mb: 2,
                                color: 'primary.dark',
                            }}
                        >
                            Message Sent Successfully
                        </Typography>

                        <Typography
                            variant="body1"
                            sx={{
                                fontSize: '1.125rem',
                                lineHeight: 1.8,
                                color: 'text.secondary',
                                mb: 4,
                            }}
                        >
                            Thank you for contacting Goodwood Lodge No. 159.
                            We appreciate your interest and will respond to your message as soon as possible.
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => navigate('/')}
                                sx={{ px: 4, py: 1.5 }}
                            >
                                Return Home
                            </Button>
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => navigate('/contact')}
                                sx={{ px: 4, py: 1.5 }}
                            >
                                Send Another Message
                            </Button>
                        </Box>
                    </Paper>
                </Container>
            </Box>
        </>
    );
}
