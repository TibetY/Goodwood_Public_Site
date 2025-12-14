import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
    Container,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    CardActionArea,
    CircularProgress
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '../context/auth-context';

export default function Portal() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>Loading...</Typography>
            </Container>
        );
    }

    if (!user) {
        return null;
    }

    const managementOptions = [
        {
            title: 'Manage Members',
            description: 'View and manage lodge members',
            icon: <PeopleIcon sx={{ fontSize: 60 }} />,
            path: '/portal/members',
            color: '#1a237e'
        },
        {
            title: 'Manage Committees',
            description: 'Update committee information and assignments',
            icon: <GroupsIcon sx={{ fontSize: 60 }} />,
            path: '/portal/committees',
            color: '#0d47a1'
        },
        {
            title: 'Manage Officers',
            description: 'Update lodge officers and positions',
            icon: <AdminPanelSettingsIcon sx={{ fontSize: 60 }} />,
            path: '/portal/officers',
            color: '#01579b'
        }
    ];

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Box sx={{ mb: 6, textAlign: 'center' }}>
                <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
                    Lodge Portal
                </Typography>
                <Typography variant="h6" color="text.secondary">
                    Welcome, {user.email}
                </Typography>
            </Box>

            <Grid container spacing={4}>
                {managementOptions.map((option, index) => (
                    <Grid item xs={12} md={4} key={index}>
                        <Card
                            elevation={3}
                            sx={{
                                height: '100%',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 6
                                }
                            }}
                        >
                            <CardActionArea
                                onClick={() => navigate(option.path)}
                                sx={{
                                    height: '100%',
                                    p: 3,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: 280
                                }}
                            >
                                <Box
                                    sx={{
                                        color: option.color,
                                        mb: 3
                                    }}
                                >
                                    {option.icon}
                                </Box>
                                <CardContent sx={{ textAlign: 'center', p: 0 }}>
                                    <Typography variant="h5" component="h2" gutterBottom fontWeight="bold">
                                        {option.title}
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary">
                                        {option.description}
                                    </Typography>
                                </CardContent>
                            </CardActionArea>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
}
