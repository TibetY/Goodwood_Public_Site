import { useState } from 'react';
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    Alert,
    Link
} from '@mui/material';
import { supabase } from '../utils/supabase';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

export default function LoginPage() {
    const { t } = useTranslation();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isLogin) {
                // Login
                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) throw signInError;

                // Redirect to portal
                navigate('/portal');
            } else {
                // Signup
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (signUpError) throw signUpError;

                setMessage(t('login.checkEmailConfirmation'));
                setEmail('');
                setPassword('');
            }
        } catch (err: any) {
            setError(err.message || t('login.errorOccurred'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container sx={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4, px: 2 }}>
            <Paper
                elevation={3}
                sx={{
                    p: 3,
                    width: '100%',
                    maxWidth: 420,
                    mx: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                {/* Logo/Header */}
                <Box component="img" src='images/goodwood/goodwood-logo.svg' sx={{ maxWidth: 150, mb: 2 }} />

                {/* Error/Success Messages */}
                {error && (
                    <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                        {error}
                    </Alert>
                )}
                {message && (
                    <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
                        {message}
                    </Alert>
                )}

                {/* Login/Signup Form */}
                <Box component="form" onSubmit={handleAuth} sx={{ width: '100%' }}>
                    <TextField
                        fullWidth
                        label={t('login.emailAddress')}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        margin="normal"
                        autoComplete="email"
                    />
                    <TextField
                        fullWidth
                        label={t('login.password')}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        margin="normal"
                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                    />

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={loading}
                        sx={{ mt: 3, mb: 2 }}
                    >
                        {loading ? t('login.pleaseWait') : isLogin ? t('login.signIn') : t('login.signUp')}
                    </Button>

                    {/* Forgot Password */}
                    {isLogin && (
                        <Box sx={{ textAlign: 'center', mt: 1 }}>
                            <Typography variant="body2">
                                <Link
                                    component="button"
                                    type="button"
                                    onClick={() => navigate('/forgot-password')}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    {t('login.forgotPassword')}
                                </Link>
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Footer Note */}
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                        {t('login.registrationNote')}
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
}