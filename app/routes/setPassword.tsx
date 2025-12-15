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

export default function SetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
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
            } else {
                setValidToken(false);
                setError('Invalid or expired invitation link. Please request a new invitation.');
            }
        };

        checkToken();
    }, []);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            // Update the user's password
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            // Success! Redirect to portal
            navigate('/portal');
        } catch (err: any) {
            setError(err.message || 'Failed to set password');
        } finally {
            setLoading(false);
        }
    };

    if (validToken === null) {
        return (
            <Container maxWidth="sm" sx={{ mt: 8 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Typography>Loading...</Typography>
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
                            Goodwood Lodge No. 159
                        </Typography>
                    </Box>
                    <Alert severity="error">
                        {error}
                    </Alert>
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Button variant="outlined" onClick={() => navigate('/login')}>
                            Back to Login
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
                        Goodwood Lodge No. 159
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                        Set Your Password
                    </Typography>
                </Box>

                <Typography variant="body1" sx={{ mb: 3 }}>
                    Welcome! Please create a password for your account.
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
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        margin="normal"
                        helperText="Minimum 8 characters"
                    />
                    <TextField
                        fullWidth
                        label="Confirm Password"
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
                        {loading ? 'Setting Password...' : 'Complete Setup'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}