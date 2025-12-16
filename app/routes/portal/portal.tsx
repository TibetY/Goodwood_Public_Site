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
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import EventIcon from '@mui/icons-material/Event';
import DescriptionIcon from '@mui/icons-material/Description';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useAuth } from '../../context/auth-context';
import { useTranslation } from 'react-i18next';

export default function Portal() {
    const { t } = useTranslation();
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
                <Typography variant="body1" sx={{ mt: 2 }}>{t('common.loading')}</Typography>
            </Container>
        );
    }

    if (!user) {
        return null;
    }

    const managementOptions = [
        {
            title: t('portal.manageMembers.title'),
            description: t('portal.manageMembers.description'),
            icon: <PeopleIcon sx={{ fontSize: 60 }} />,
            path: '/portal/members',
            color: '#1a237e'
        },
        {
            title: t('portal.manageCommittees.title'),
            description: t('portal.manageCommittees.description'),
            icon: <GroupsIcon sx={{ fontSize: 60 }} />,
            path: '/portal/committees',
            color: '#0d47a1'
        },
        {
            title: t('portal.manageOfficers.title'),
            description: t('portal.manageOfficers.description'),
            icon: <AdminPanelSettingsIcon sx={{ fontSize: 60 }} />,
            path: '/portal/officers',
            color: '#01579b'
        },
        {
            title: t('portal.degreeWork.title'),
            description: t('portal.degreeWork.description'),
            icon: <SquareFootIcon sx={{ fontSize: 60 }} />,
            path: '/portal/degree-work',
            color: '#01579b'
        },
        {
            title: t('portal.manageEvents.title'),
            description: t('portal.manageEvents.description'),
            icon: <EventIcon sx={{ fontSize: 60 }} />,
            path: '/portal/events',
            color: '#01579b'
        },
        {
            title: t('portal.sendSummons.title'),
            description: t('portal.sendSummons.description'),
            icon: <DescriptionIcon sx={{ fontSize: 60 }} />,
            path: '/portal/summons',
            color: '#01579b'
        },
        {
            title: t('portal.payDues.title'),
            description: t('portal.payDues.description'),
            icon: <AttachMoneyIcon sx={{ fontSize: 60 }} />,
            path: '/portal/dues',
            color: '#01579b'
        }

    ];

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Box sx={{ mb: 6, textAlign: 'center' }}>
                <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
                    {t('portal.title')}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                    {t('portal.welcome', { name: user.user_metadata.display_name })}
                </Typography>
            </Box>

            <Grid container spacing={4}>
                {managementOptions.map((option, index) => (
                    <Grid size={{ xs: 12, md: 4 }} key={index}>
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
