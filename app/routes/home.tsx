import type { Route } from "./+types/home";
import { useTranslation } from 'react-i18next';
import { Container, Typography, Box, Button, Stack } from '@mui/material';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Goodwood Lodge No. 159" },
    { name: "description", content: "Grand Lodge of A.F. & A.M. of Canada in the Province of Ontario" },
  ];
}

export default function Home() {
  const { t } = useTranslation();

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h2" component="h1" gutterBottom color="primary">
            {t('site.title')}
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('site.subtitle')}
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" gutterBottom>
            {t('home.welcome')}
          </Typography>
          <Typography variant="body1" paragraph sx={{ maxWidth: 800, mx: 'auto', fontSize: '1.1rem' }}>
            {t('home.description')}
          </Typography>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          sx={{ mb: 6 }}
        >
          <Button variant="contained" size="large">
            {t('home.learnMore')}
          </Button>
          <Button variant="outlined" size="large">
            {t('home.contactUs')}
          </Button>
        </Stack>

        <Box sx={{
          mt: 8,
          p: 4,
          backgroundColor: 'grey.50',
          borderRadius: 2,
          textAlign: 'center'
        }}>
          <Typography variant="h5" gutterBottom color="primary">
            {t('nav.becomeAMason')}
          </Typography>
          <Typography variant="body1" paragraph>
            Interested in learning more about Freemasonry and membership?
          </Typography>
          <Button variant="contained" color="secondary">
            {t('contact.title')}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
