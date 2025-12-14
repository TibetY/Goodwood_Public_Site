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

export default function LoginPage() {
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

                // Redirect to home or dashboard
                navigate('/');
            } else {
                // Signup
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (signUpError) throw signUpError;

                setMessage('Check your email for the confirmation link!');
                setEmail('');
                setPassword('');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
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
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        margin="normal"
                        autoComplete="email"
                    />
                    <TextField
                        fullWidth
                        label="Password"
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
                        {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
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
                                    Forgot Password?
                                </Link>
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Footer Note */}
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                        {'Registration is by invitation only. Please contact the lodge secretary if you need assistance.'}
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
}