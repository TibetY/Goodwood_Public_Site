import type { Route } from "./+types/contact";
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Container, Typography, Box, Paper, TextField, Button, CircularProgress } from '@mui/material';

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Contact Us - Goodwood Lodge No. 159" },
        { name: "description", content: "Get in touch with Goodwood Lodge No. 159. Interested in learning more about Freemasonry? Contact us today." },
    ];
}

const encode = (data: Record<string, string>) => {
    return Object.keys(data)
        .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
        .join("&");
};

export default function Contact() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        message: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await fetch("/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: encode({
                    "form-name": "contact",
                    ...formData
                })
            });
            navigate('/thank-you');
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('There was an error submitting the form. Please try again.');
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* Hero Section */}
            <Box
                sx={{
                    backgroundColor: 'section.accent',
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
                    backgroundColor: 'section.neutral',
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
                            data-netlify-honeypot="bot-field"
                            onSubmit={handleSubmit}
                        >
                            {/* Hidden fields for Netlify Forms */}
                            <input type="hidden" name="form-name" value="contact" />

                            {/* Honeypot (hidden) */}
                            <Box sx={{ display: 'none' }}>
                                <input name="bot-field" />
                            </Box>

                            {/* Form Header */}
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

                            {/* Form Fields */}
                            <Box sx={{ textAlign: 'center', mt: 4 }}>
                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    gap: { xs: 0, md: 2 },
                                    flexWrap: { xs: 'wrap', md: 'nowrap' },
                                    justifyContent: 'center'
                                }}>
                                    <TextField
                                        required
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        label={t('contact.name.first')}
                                        fullWidth
                                        margin="normal"
                                        disabled={submitting}
                                    />
                                    <TextField
                                        required
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        label={t('contact.name.last')}
                                        fullWidth
                                        margin="normal"
                                        disabled={submitting}
                                    />
                                </Box>

                                <TextField
                                    required
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    label={t('contact.phone')}
                                    type="tel"
                                    fullWidth
                                    margin="normal"
                                    disabled={submitting}
                                />

                                <TextField
                                    required
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    label={t('contact.email')}
                                    type="email"
                                    fullWidth
                                    margin="normal"
                                    disabled={submitting}
                                />

                                <TextField
                                    required
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    label={t('contact.message')}
                                    multiline
                                    rows={4}
                                    fullWidth
                                    margin="normal"
                                    disabled={submitting}
                                />
                            </Box>

                            {/* Submit Button - INSIDE FORM */}
                            <Button
                                variant="contained"
                                color="primary"
                                fullWidth
                                type="submit"
                                disabled={submitting}
                                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
                                sx={{ mt: 4, py: 1.5 }}
                            >
                                {submitting ? 'Sending...' : t('contact.send')}
                            </Button>
                        </form>
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