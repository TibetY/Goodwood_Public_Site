import type { Route } from "./+types/contact";
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Container, Typography, Box, Button, CircularProgress } from '@mui/material';

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Contact Us - Goodwood Lodge No. 159" },
        { name: "description", content: "Get in touch with Goodwood Lodge No. 159. Interested in learning more about Freemasonry? Contact us today." },
    ];
}

const fieldLabelSx = {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'text.secondary',
} as const;

const inputSx = {
    fontFamily: '"Public Sans", sans-serif',
    fontSize: '15px',
    color: 'text.primary',
    p: '13px 14px',
    border: (theme: any) => `1px solid ${theme.palette.section.border}`,
    borderRadius: '3px',
    backgroundColor: 'background.paper',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s ease',
    '&:focus': { borderColor: 'accent.gold' },
    '&:focus-visible': { outline: '2px solid', outlineColor: 'accent.gold', outlineOffset: '1px' },
    '&::placeholder': { color: 'section.subtle' },
} as const;

const errorTextSx = {
    fontSize: 13,
    color: 'error.main',
} as const;

// HTML5 email-input spec pattern, tightened with a trailing `+` so the domain
// must include at least one dot and a TLD (rejects e.g. "name@protonmail").
const EMAIL_PATTERN =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (digits.length === 0) return '';
    if (digits.length < 4) return `(${digits}`;
    if (digits.length < 7) return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
    return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const isValidPhone = (formatted: string) => formatted.replace(/\D/g, '').length === 10;

const sidebarLinkSx = {
    fontSize: 14,
    fontWeight: 600,
    color: 'accent.gold',
    textDecoration: 'underline',
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 44, // WCAG 2.5.5 target size
    '&:hover': { color: 'text.primary' },
} as const;

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, borderTop: (theme) => `2px solid ${theme.palette.accent.navy}`, pt: 2.5 }}>
            <Typography variant="overline" sx={{ color: 'accent.gold', letterSpacing: '0.18em' }}>{label}</Typography>
            {children}
        </Box>
    );
}

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
    const [errors, setErrors] = useState({ phone: '', email: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, phone: formatPhone(e.target.value) });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const emailValid = EMAIL_PATTERN.test(formData.email.trim());
        const phoneValid = isValidPhone(formData.phone);
        setErrors({
            email: emailValid ? '' : t('contact.errors.email', 'Enter a valid email address.'),
            phone: phoneValid ? '' : t('contact.errors.phone', 'Enter a valid 10-digit phone number.'),
        });
        if (!emailValid || !phoneValid) {
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch("/.netlify/functions/submit-contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    botField: (e.currentTarget.elements.namedItem('bot-field') as HTMLInputElement | null)?.value || '',
                })
            });
            if (!res.ok) {
                throw new Error(`Submit failed: ${res.status}`);
            }
            navigate('/thank-you');
        } catch (error) {
            console.error('Error submitting form:', error);
            alert(t('contact.submitError', 'There was an error submitting the form. Please try again.'));
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* Header band */}
            <Box sx={{ backgroundColor: 'section.hero', borderBottom: (theme) => `1px solid ${theme.palette.section.border}` }}>
                <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="overline" sx={{ color: 'accent.gold' }}>Goodwood Lodge No. 159</Typography>
                    <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '2.25rem', md: '3rem' } }}>{t('contact.title')}</Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: '60ch' }}>{t('contact.subtitle')}</Typography>
                </Container>
            </Box>

            {/* Body */}
            <Box sx={{ backgroundColor: 'background.paper' }}>
                <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr' }, gap: { xs: 6, md: 9 }, alignItems: 'start' }}>
                        {/* Form */}
                        <Box>
                            <Typography variant="h4" component="h2" sx={{ mb: 3 }}>{t('contact.sendHeading', 'Send us a message')}</Typography>
                            <Box
                                component="form"
                                name="contact"
                                method="POST"
                                onSubmit={handleSubmit}
                                sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}
                            >
                                <Box sx={{ display: 'none' }}><input name="bot-field" tabIndex={-1} autoComplete="off" /></Box>

                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.25 }}>
                                    <Box component="label" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Typography component="span" sx={fieldLabelSx}>{t('contact.name.first')} *</Typography>
                                        <Box component="input" required name="firstName" autoComplete="given-name" value={formData.firstName} onChange={handleChange} disabled={submitting} placeholder="John" sx={inputSx} />
                                    </Box>
                                    <Box component="label" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Typography component="span" sx={fieldLabelSx}>{t('contact.name.last')} *</Typography>
                                        <Box component="input" required name="lastName" autoComplete="family-name" value={formData.lastName} onChange={handleChange} disabled={submitting} placeholder="Smith" sx={inputSx} />
                                    </Box>
                                    <Box component="label" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Typography component="span" sx={fieldLabelSx}>{t('contact.email')} *</Typography>
                                        <Box component="input" required type="email" name="email" autoComplete="email" value={formData.email} onChange={handleChange} disabled={submitting} placeholder="john@example.com" sx={inputSx} />
                                        {errors.email && <Typography sx={errorTextSx}>{errors.email}</Typography>}
                                    </Box>
                                    <Box component="label" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Typography component="span" sx={fieldLabelSx}>{t('contact.phone')} *</Typography>
                                        <Box component="input" required type="tel" name="phone" autoComplete="tel" value={formData.phone} onChange={handlePhoneChange} disabled={submitting} placeholder="(613)-555-0123" sx={inputSx} />
                                        {errors.phone && <Typography sx={errorTextSx}>{errors.phone}</Typography>}
                                    </Box>
                                </Box>

                                <Box component="label" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography component="span" sx={fieldLabelSx}>{t('contact.message')} *</Typography>
                                    <Box component="textarea" required name="message" rows={6} value={formData.message} onChange={handleChange} disabled={submitting} placeholder={t('contact.messagePlaceholder', "Tell us a little about yourself and what you'd like to know…")} sx={{ ...inputSx, resize: 'vertical' }} />
                                </Box>

                                <Box>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
                                        sx={{ backgroundColor: 'accent.navy', color: '#fff', px: 4, py: 1.75, '&:hover': { backgroundColor: 'primary.light' } }}
                                    >
                                        {submitting ? t('contact.sending', 'Sending…') : t('contact.send')}
                                    </Button>
                                </Box>
                            </Box>
                        </Box>

                        {/* Info sidebar */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4.5 }}>
                            <InfoBlock label={t('footer.address.title')}>
                                <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 20, color: 'text.primary' }}>{t('footer.address.street')}</Typography>
                                <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{t('footer.address.city')} {t('footer.address.postal')}</Typography>
                            </InfoBlock>

                            <InfoBlock label={t('contact.whenWeMeet', 'When We Meet')}>
                                <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 20, color: 'text.primary' }}>{t('home.meeting.meetValue', '1st Tuesday · 7:30 PM')}</Typography>
                                <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{t('contact.meetNote', 'September through June. Visiting brethren are always welcome.')}</Typography>
                            </InfoBlock>

                            <InfoBlock label={t('contact.joiningLabel', 'Thinking of Joining?')}>
                                <Typography sx={{ fontSize: 14, lineHeight: 1.7, color: 'text.secondary' }}>{t('contact.joiningText', 'Freemasonry is open to men of good character. Learn what membership involves at the Grand Lodge of Ontario.')}</Typography>
                                <Box component="a" href="https://ontariomasons.ca/becoming-a-mason/" target="_blank" rel="noopener noreferrer" sx={sidebarLinkSx}>
                                    {t('footer.links.becomeAMason')} →
                                </Box>
                            </InfoBlock>

                            <InfoBlock label={t('contact.followUs', 'Follow Us')}>
                                <Box component="a" href="https://www.instagram.com/goodwood_lodge_159/" target="_blank" rel="noopener noreferrer" sx={sidebarLinkSx}>
                                    Instagram · @goodwood_lodge_159 →
                                </Box>
                            </InfoBlock>
                        </Box>
                    </Box>
                </Container>
            </Box>
        </>
    );
}
