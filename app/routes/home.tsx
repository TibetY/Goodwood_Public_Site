import type { Route } from "./+types/home";
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Container, Typography, Box, Button, Grid, Paper } from '@mui/material';
import RoundedImage from "~/components/RoundedImage";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Goodwood Lodge No. 159" },
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
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  mb: 2,
                  color: 'primary.dark',
                }}
              >
                Beyond the Square and Compass
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: '1.25rem',
                  color: 'text.secondary',
                  mb: 0,
                }}
              >
                Developing our character and serving the greater good.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              {/* Placeholder for lodge building image - you can replace this */}
              <Box

                sx={{
                  width: '100%',
                  height: "auto",
                  backgroundColor: '#1a237e',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1rem',
                  textAlign: 'center',
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Welcome Section */}
      <Box
        sx={{
          backgroundColor: '#13294b',
          color: 'white',
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 6 }} sx={{justifyContent: 'center', flexAlign: 'center', display: 'flex' }}>
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
                Welcome to
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  mb: 3,
                  fontSize: { xs: '2rem', md: '2.75rem' },
                }}
              >
                Goodwood Lodge No. 159, GRQ, A.F. & A.M.
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
                {t('home.description')}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: '1.125rem',
                  lineHeight: 1.8,
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                Located in the heart of the Goodwood community, our lodge has been a cornerstone of brotherhood and charitable work for generations. We are proud to be part of the Grand Lodge of A.F. & A.M. of Canada in the Province of Ontario.
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Step into Freemasonry Section */}
      <Box
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
            Positive Differences
          </Typography>
          <Typography
            variant="h2"
            sx={{
              mb: 3,
              fontSize: { xs: '2rem', md: '2.75rem' },
            }}
          >
            Step into Freemasonry
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mb: 5,
              fontSize: '1.125rem',
              color: 'text.secondary',
            }}
          >
            Find Community and Opportunity Nearby.
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
            Become a Mason
          </Button>
        </Container>
      </Box>

      {/* Values Section */}
      <Box
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
                variant="h4"
                sx={{
                  mb: 2,
                  color: '#c5a572',
                  fontWeight: 400,
                }}
              >
                Our Values
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  mb: 4,
                  fontSize: { xs: '2rem', md: '2.5rem' },
                }}
              >
                Step Into Freemasonry
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
                Freemasonry is built upon a foundation of timeless values that shape our character and guide our actions. These principles are not merely words, but a way of life for every Mason.
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
                  <span style={{ fontSize: '1.75rem' }}>🤝</span> Brotherly Love
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
                  We value respect, freedom, kindness, tolerance, and strive for harmony in our communities.
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }} >
              <RoundedImage
                src="images/goodwood/Goodwood_Install_2_2025_DSC_5380.jpg"
                alt="Goodwood bretheren"
              />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </>
  );
}
