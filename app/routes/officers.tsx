import { useLoaderData } from 'react-router';
import { Container, Typography, Box, Grid, Card, CardContent, CardMedia, Avatar } from '@mui/material';
import { t } from 'i18next';
import { useTranslation } from 'react-i18next';
import { supabase } from '../utils/supabase';
import type { Route } from './+types/officers';

interface Officer {
    id?: string
    title: string;
    name: string;
    image?: string;
    position: number;
}

export async function loader({ request }: Route.LoaderArgs) {
    try {
        const { data, error } = await supabase
            .from('officers')
            .select('*')
            .order('position', { ascending: true });

        if (error) throw error;

        return { officers: data || [] };
    } catch (err) {
        console.error('Error fetching officers:', err);
        throw new Response('Failed to load officers', { status: 500 });
    }
}

export default function Officers() {
    const { officers } = useLoaderData<typeof loader>();
    const { t } = useTranslation();
    const currentYear = new Date().getFullYear();

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
                {t('officers.title')}
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 6 }}>
                {t('officers.description', { currentYear, endYear: currentYear + 1 })}
            </Typography>

            <Grid container spacing={4}>
                {officers.map((officer: Officer, index: number) => (
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
                                    sx={{ objectFit: 'cover', objectPosition: 'center top' }}
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
                                    {t(officer.title)}
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
