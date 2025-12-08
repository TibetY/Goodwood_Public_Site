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
      <Container maxWidth="xl">
        <Stack spacing={4}>
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

                      {/* Ontario Masons Wordmark Placeholder */}
          <Box sx={{ textAlign: 'center' }}>
            <Box
              component="img"
              src="/images/grand_lodge/Ontario-Masons-Wordmark-Colour-300x53.png"
              sx={{
                display: 'inline-block',
                px: 4,
                py: 2,
              }}
            />
          </Box>
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
