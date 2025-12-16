import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    Alert
} from '@mui/material';
import { supabase } from '../utils/supabase';
import { useTranslation } from 'react-i18next';

export default function SetPassword() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [displayName, setDisplayName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validToken, setValidToken] = useState<boolean | null>(null);

    useEffect(() => {
        // Check if we have a valid token
        const checkToken = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                setValidToken(true);

                // Pre-populate display name and phone if they were set in the invitation
                if (session.user?.user_metadata?.display_name) {
                    setDisplayName(session.user.user_metadata.display_name);
                }
                if (session.user?.user_metadata?.phone_number) {
                    setPhoneNumber(session.user.user_metadata.phone_number);
                }
            } else {
                setValidToken(false);
                setError(t('setPassword.invalidToken'));
            }
        };

        checkToken();
    }, [t]);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (password.length < 8) {
            setError(t('setPassword.passwordTooShort'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('setPassword.passwordsDoNotMatch'));
            return;
        }

        setLoading(true);

        try {
            // Update the user's password and metadata
            const { error } = await supabase.auth.updateUser({
                password: password,
                data: {
                    display_name: displayName,
                    phone_number: phoneNumber
                }
            });

            if (error) throw error;

            // Success! Redirect to portal
            navigate('/portal');
        } catch (err: any) {
            setError(err.message || t('setPassword.failedToSetPassword'));
        } finally {
            setLoading(false);
        }
    };

    if (validToken === null) {
        return (
            <Container maxWidth="sm" sx={{ mt: 8 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Typography>{t('common.loading')}</Typography>
                </Box>
            </Container>
        );
    }

    if (validToken === false) {
        return (
            <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                            {t('site.title')}
                        </Typography>
                    </Box>
                    <Alert severity="error">
                        {error}
                    </Alert>
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Button variant="outlined" onClick={() => navigate('/login')}>
                            {t('setPassword.backToLogin')}
                        </Button>
                    </Box>
                </Paper>
            </Container>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                {/* Header */}
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                    <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                        {t('site.title')}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                        {t('setPassword.title')}
                    </Typography>
                </Box>

                <Typography variant="body1" sx={{ mb: 3 }}>
                    {t('setPassword.welcomeMessage')}
                </Typography>

                {/* Error Message */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Form */}
                <Box component="form" onSubmit={handleSetPassword}>
                    <TextField
                        fullWidth
                        label={t('setPassword.displayName')}
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        margin="normal"
                        helperText={t('setPassword.displayNameHelper')}
                    />
                    <TextField
                        fullWidth
                        label={t('setPassword.phoneNumber')}
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        margin="normal"
                        helperText={t('setPassword.phoneHelper')}
                    />
                    <TextField
                        fullWidth
                        label={t('setPassword.password')}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        margin="normal"
                        helperText={t('setPassword.passwordHelper')}
                    />
                    <TextField
                        fullWidth
                        label={t('setPassword.confirmPassword')}
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        margin="normal"
                    />

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={loading}
                        sx={{ mt: 3 }}
                    >
                        {loading ? t('setPassword.settingPassword') : t('setPassword.completeSetup')}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
