import type { Route } from "./+types/contact";
import { useTranslation } from 'react-i18next';
import { Container, Typography, Box, Paper, TextField, Button } from '@mui/material';

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Contact Us - Goodwood Lodge No. 159" },
        { name: "description", content: "Get in touch with Goodwood Lodge No. 159. Interested in learning more about Freemasonry? Contact us today." },
    ];
}

export default function Contact() {
    const { t } = useTranslation();

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
                        {t('contact.title')}
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            fontSize: '1.25rem',
                            textAlign: 'center',
                            color: 'rgba(255,255,255,0.9)',
                        }}
                    >
                        {t('contact.subtitle')}
                    </Typography>
                </Container>
            </Box>

            {/* Form Section */}
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
                        }}
                    >
                        <form
                            name="contact"
                            method="POST"
                            data-netlify="true"
                            netlify-honeypot="bot-field"
                        >
                            {/* Hidden fields for Netlify Forms */}
                            <input type="hidden" name="form-name" value="contact" />
                            <input type="hidden" name="bot-field" />

                            {/* Form content will be added by user */}
                            <Box sx={{ mb: 4 }}>
                                <Typography
                                    variant="h4"
                                    sx={{
                                        color: 'primary.dark',
                                        textAlign: 'center',
                                    }}
                                >
                                    Send us a message
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        textAlign: 'center',
                                        color: 'text.secondary',
                                        mb: 4,
                                    }}
                                >
                                    Fill out the form below and we'll get back to you as soon as possible.
                                </Typography>
                            </Box>

                            {/* User will add form inputs here */}
                            <Box sx={{ textAlign: 'center', mt: 4 }}>
                                <Box sx={{ display: 'flex', flexDirection: 'row', gap: { xs: 0, md: 2 }, flexWrap: { xs: 'wrap', md: 'nowrap' }, justifyContent: 'center' }}>
                                    <TextField required label={t('contact.name.first')} fullWidth margin="normal" />
                                    <TextField required label={t('contact.name.last')} fullWidth margin="normal" />
                                </Box>

                                <TextField required label={t('contact.phone')} type="tel" fullWidth margin="normal" />
                                <TextField required label={t('contact.email')} type="email" fullWidth margin="normal" />

                                <TextField required label={t('contact.message')} multiline rows={4} fullWidth margin="normal" />
                            </Box>
                        </form>
                        <Button variant="contained" color="primary" fullWidth type="submit" sx={{ mt: 4, py: 1.5 }}>
                            {t('contact.send')}
                        </Button>
                    </Paper>


                </Container>
            </Box>

            {/* Additional Info Section */}
            <Box
                sx={{
                    backgroundColor: 'white',
                    py: { xs: 6, md: 8 },
                }}
            >
                <Container maxWidth="md">
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography
                            variant="h4"
                            sx={{
                                mb: 3,
                                color: 'primary.dark',
                            }}
                        >
                            Other Ways to Connect
                        </Typography>
                        <Typography
                            variant="body1"
                            sx={{
                                fontSize: '1.125rem',
                                lineHeight: 1.8,
                                color: 'text.secondary',
                                mb: 2,
                            }}
                        >
                            You can also reach us through our regular meetings or community events.
                            We're always happy to answer questions about Freemasonry and our lodge.
                        </Typography>
                    </Box>
                </Container>
            </Box>
        </>
    );
}