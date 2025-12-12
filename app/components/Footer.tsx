import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Stack,
  Divider,
  Grid,
  IconButton,
} from '@mui/material';
import InstagramIcon from '@mui/icons-material/Instagram';
import LocationOnIcon from '@mui/icons-material/LocationOn';

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'primary.main',
        color: 'white',
        py: 6,
        mt: 'auto',
      }}
    >
      <Container maxWidth="xl">
        <Stack spacing={4}>
          <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

          {/* Footer Content Grid */}
          <Grid container spacing={4}>
            {/* Address Column */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LocationOnIcon />
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    {t('footer.address.title')}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  {t('footer.address.street')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  {t('footer.address.city')} {t('footer.address.postal')}
                </Typography>
              </Stack>
            </Grid>

            {/* Social Media Column */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Stack spacing={1}>
                <Typography variant="h6" sx={{ color: 'white' }}>
                  Follow Us
                </Typography>
                <Stack direction="row" spacing={1}>
                  <IconButton
                    component="a"
                    href="https://www.instagram.com/goodwood_lodge_159/"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: 'white',
                      '&:hover': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                    }}
                    aria-label={t('footer.links.instagram')}
                  >
                    <InstagramIcon />
                  </IconButton>
                </Stack>
              </Stack>
            </Grid>

            {/* Links Column */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Stack spacing={1}>
                <Typography variant="h6" sx={{ color: 'white' }}>
                  {t('footer.links.title')}
                </Typography>
                <Box
                  component="a"
                  href="https://ontariomasons.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    '&:hover': {
                      color: 'white',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  <Typography variant="body2">
                    {t('footer.links.grandLodge')}
                  </Typography>
                </Box>
                <Box
                  component="a"
                  href="https://ontariomasons.ca/becoming-a-mason/"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    '&:hover': {
                      color: 'white',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  <Typography variant="body2">
                    {t('footer.links.becomeAMason')}
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            {/* Grand Lodge Logo Column */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Stack spacing={2} alignItems={{ xs: 'center', md: 'flex-start' }}>
                <Box
                  component="a"
                  href="https://ontariomasons.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'block',
                    transition: 'opacity 0.3s',
                    '&:hover': {
                      opacity: 0.8,
                    },
                  }}
                >
                  <Box
                    component="img"
                    src="/images/grand_lodge/Ontario-Masons-Wordmark-Colour-300x53.png"
                    alt="Grand Lodge of Ontario"
                    sx={{
                      maxWidth: '200px',
                      height: 'auto',
                    }}
                  />
                </Box>
              </Stack>
            </Grid>
          </Grid>

          <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

          {/* Copyright */}
          <Typography
            variant="body2"
            align="center"
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            {t('footer.copyright', { year: currentYear })}
          </Typography>
        </Stack>
      </Container>
    </Box >
  );
}
