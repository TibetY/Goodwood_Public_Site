import { Container, Typography, Box, Grid, Card, CardContent, CardMedia, Avatar } from '@mui/material';
import { t } from 'i18next';

interface Officer {
    title: string;
    name: string;
    image?: string; // Optional - we'll use placeholder if not provided
}

const officers: Officer[] = [
    {
        title: t('officers.wm'),
        name: 'W. Bro. Joe Burchill',
        image: 'https://goodwood159.ca/images/2024_2025/250401/Goodwood_Install_10_2025_DSC_5416.jpg'
    },
    {
        title: t('officers.im'),
        name: 'W. Bro. Jim McConnell',
        image: undefined
    },
    {
        title: t('officers.sw'),
        name: 'Bro. Rod Costain',
        image: undefined
    },
    {
        title: t('officers.jw'),
        name: 'Bro. Paul Henry',
        image: undefined
    },
    {
        title: t('officers.sec'),
        name: 'W. Bro. Greg Skelly',
        image: undefined
    },
    {
        title: t('officers.treas'),
        name: 'W. Bro. Art Gosling',
        image: undefined
    },
    {
        title: t('officers.doc'),
        name: 'W. Bro. Jordan McConnell',
        image: undefined
    },
    {
        title: t('officers.sd'),
        name: 'Bro. Ted Burch',
        image: undefined
    },
    {
        title: t('officers.jd'),
        name: 'Bro. Dax Morfé',
        image: undefined
    },
    {
        title: t('officers.chaplain'),
        name: 'W. Bro. Roger Coo',
        image: undefined
    },
    {
        title: t('officers.ig'),
        name: 'Bro. Tyler Moule',
        image: undefined
    },
    {
        title: t('officers.tyler'),
        name: 'V.W. Bro. Ken Burchill',
        image: undefined
    },
    {
        title: t('officers.ss'),
        name: 'TBA',
        image: undefined
    },
    {
        title: t('officers.js'),
        name: 'TBA',
        image: undefined
    }
];

export default function Officers() {
    const getInitials = (name: string) => {
        // Remove titles like "W. Bro.", "V.W. Bro.", "Bro."
        const cleanName = name.replace(/^(V\.W\.|W\.|R\.W\.)?\s*Bro\.\s*/i, '');
        if (cleanName === 'TBA') return 'TBA';

        const parts = cleanName.split(' ');
        return parts.map(part => part[0]).join('').toUpperCase();
    };

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" textAlign="center">
                Lodge Officers
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph textAlign="center" sx={{ mb: 6 }}>
                Meet the dedicated officers serving Goodwood Lodge
            </Typography>

            <Grid container spacing={4}>
                {officers.map((officer, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={index}>
                        <Card
                            elevation={2}
                            sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 4
                                }
                            }}
                        >
                            {officer.image ? (
                                <CardMedia
                                    component="img"
                                    height="300"
                                    image={officer.image}
                                    alt={officer.name}
                                    sx={{ objectFit: 'cover' }}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        height: 300,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: 'primary.main'
                                    }}
                                >
                                    <Avatar
                                        sx={{
                                            width: 120,
                                            height: 120,
                                            fontSize: '2rem',
                                            bgcolor: 'primary.dark'
                                        }}
                                    >
                                        {getInitials(officer.name)}
                                    </Avatar>
                                </Box>
                            )}
                            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                                <Typography variant="h6" component="h2" gutterBottom>
                                    {officer.title}
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    {officer.name}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
}
