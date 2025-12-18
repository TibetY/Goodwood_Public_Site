import type { Route } from "../+types/home";
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Container, Typography, Box, Button, Grid } from '@mui/material';
import RoundedImage from "~/components/RoundedImage";
import HandshakeIcon from '@mui/icons-material/Handshake';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import GavelIcon from '@mui/icons-material/Gavel';


export function meta({ }: Route.MetaArgs) {
  // Note: meta tags cannot use translations directly in React Router
  // Consider using a higher-level handler if dynamic translation is needed
  return [
    { title: "Goodwood Lodge No. 159 - Beyond the Square and Compass" },
    { name: "description", content: "Developing our character and serving the greater good. Grand Lodge of A.F. & A.M. of Canada in the Province of Ontario" },
  ];
}

export default function Home() {
  const { t } = useTranslation();

  return (
    <>
      {/* Hero Section */}
      <Box
        sx={{
          backgroundColor: '#e8e8e8',
          py: { xs: 6, md: 10 },
          borderBottom: '1px solid #d0d0d0',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>

              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2.5rem', md: '3rem' },
                  mb: 2,
                  color: 'primary.dark',
                }}
              >
                {t('home.hero.title')}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: '1.25rem',
                  color: 'text.secondary',
                  mb: 0,
                }}
              >
                {t('home.hero.subtitle')}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box
                component="img"
                src="images/goodwood/goodwood-logo.svg"
                sx={{
                  width: '50%',
                  height: "auto",
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box >

      {/* Welcome Section */}
      < Box
        sx={{
          backgroundColor: '#13294b',
          color: 'white',
          py: { xs: 6, md: 10 },
        }
        }
      >
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 6 }} sx={{ justifyContent: 'center', flexAlign: 'center', display: 'flex' }}>
              {/* Placeholder for historical building image */}
              <RoundedImage
                src="images/goodwood/Lodge_Front.jpg"
                alt="Goodwood bretheren"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant="h2"
                sx={{
                  mb: 2,
                  fontWeight: 400,
                  color: '#c5a572',
                }}
              >
                {t('home.welcome.greeting')}
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  mb: 3,
                  fontSize: { xs: '2rem', md: '2.75rem' },
                }}
              >
                {t('home.welcome.lodgeName')}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  mb: 3,
                  fontSize: '1.125rem',
                  lineHeight: 1.8,
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                {t('home.welcome.description')}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: '1.125rem',
                  lineHeight: 1.8,
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                {t('home.welcome.extendedDescription')}
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box >

      {/* Step into Freemasonry Section */}
      < Box
        sx={{
          backgroundColor: '#f5f5f5',
          py: { xs: 6, md: 10 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h4"
            sx={{
              mb: 1,
              color: 'text.secondary',
              fontWeight: 400,
            }}
          >
            {t('home.callToAction.sectionTitle')}
          </Typography>
          <Typography
            variant="h2"
            sx={{
              mb: 3,
              fontSize: { xs: '2rem', md: '2.75rem' },
            }}
          >
            {t('home.callToAction.heading')}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mb: 5,
              fontSize: '1.125rem',
              color: 'text.secondary',
            }}
          >
            {t('home.callToAction.description')}
          </Typography>
          <Button
            variant="contained"
            component={Link}
            to="/contact"
            size="large"
            sx={{
              backgroundColor: '#13294b',
              color: 'white',
              px: 5,
              py: 1.5,
              fontSize: '1.125rem',
              '&:hover': {
                backgroundColor: '#1a237e',
              },
            }}
          >
            {t('home.callToAction.buttonText')}
          </Button>
        </Container>
      </Box >

      {/* Values Section */}
      < Box
        sx={{
          backgroundColor: '#13294b',
          color: 'white',
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant="h2"
                sx={{
                  mb: 2,
                  fontSize: { xs: '2rem', md: '2.5rem' },
                }}
              >
                {t('home.values.heading')}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  mb: 4,
                  fontSize: '1.125rem',
                  lineHeight: 1.8,
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                {t('home.values.description')}
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h4"
                  sx={{
                    mb: 1,
                    fontSize: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <HandshakeIcon sx={{ fontSize: '1.75rem' }} /> {t('home.values.brotherlyLove.title')}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '1.05rem',
                    lineHeight: 1.7,
                    pl: 5,
                  }}
                >
                  {t('home.values.brotherlyLove.description')}
                </Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h4"
                  sx={{
                    mb: 1,
                    fontSize: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Diversity3Icon sx={{ fontSize: '1.75rem' }} /> {t('home.values.relief.title')}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '1.05rem',
                    lineHeight: 1.7,
                    pl: 5,
                  }}
                >
                  {t('home.values.relief.description')}
                </Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h4"
                  sx={{
                    mb: 1,
                    fontSize: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <GavelIcon sx={{ fontSize: '1.75rem' }} /> {t('home.values.truth.title')}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '1.05rem',
                    lineHeight: 1.7,
                    pl: 5,
                  }}
                >
                  {t('home.values.truth.description')}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }} >
              <RoundedImage
                src="images/goodwood/Goodwood_Install_2_2025_DSC_5380.jpg"
                alt="Goodwood Bretheren"
              />
            </Grid>
          </Grid>
        </Container>
      </Box >
    </>
  );
}
