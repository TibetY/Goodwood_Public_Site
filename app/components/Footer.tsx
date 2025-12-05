import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Stack,
  Divider,
} from '@mui/material';

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
      <Container maxWidth="lg">
        <Stack spacing={4}>
          {/* Ontario Masons Wordmark Placeholder */}
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                display: 'inline-block',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                px: 4,
                py: 2,
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                Ontario Masons Symbol/Wordmark
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                (Required by Grand Lodge Policy)
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

          {/* Footer Content */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems="center"
          >
            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography variant="h6" gutterBottom>
                {t('site.title')}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {t('site.subtitle')}
              </Typography>
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems="center"
            >
              <Typography
                component={Link}
                to="/privacy"
                sx={{
                  color: 'white',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                {t('footer.privacyPolicy')}
              </Typography>
              <Typography
                component={Link}
                to="/terms"
                sx={{
                  color: 'white',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                {t('footer.termsOfUse')}
              </Typography>
            </Stack>
          </Stack>

          <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

          {/* Copyright */}
          <Typography
            variant="body2"
            align="center"
            sx={{ opacity: 0.8 }}
          >
            {t('footer.copyright', { year: currentYear })}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
