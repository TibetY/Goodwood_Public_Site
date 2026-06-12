import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Box, Container, Typography, Grid } from '@mui/material';

// Footer is an intentionally dark navy brand band in both light and dark mode.
const labelSx = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'accent.goldOnDark',
} as const;

const linkSx = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.75)',
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'color 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  minHeight: 44, // WCAG 2.5.5 target size
  '&:hover': { color: '#FFFFFF' },
} as const;

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <Box component="footer" sx={{ backgroundColor: '#0B1726', color: 'rgba(255,255,255,0.75)' }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 4 } }}>
        <Grid container spacing={6} sx={{ pt: 9 }}>
          {/* Brand */}
          <Grid size={{ xs: 12, md: 4.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box component="img" src="/images/goodwood/goodwood-logo-dark.png" alt="Goodwood Lodge seal" sx={{ width: 44, height: 44 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 17, color: '#FFFFFF' }}>
                  Goodwood Lodge No. 159
                </Typography>
                <Typography sx={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'accent.goldOnDark' }}>
                  A.F. &amp; A.M. · G.R.C. · Est. 1863
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ fontSize: 13.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.65)', maxWidth: '36ch' }}>
              {t('footer.tagline', 'Developing our character and serving the greater good in Richmond, Ontario since 1863.')}
            </Typography>
          </Grid>

          {/* Visit Us */}
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography sx={labelSx}>{t('footer.address.title')}</Typography>
              <Typography sx={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.75)' }}>
                {t('footer.address.street')}<br />
                {t('footer.address.city')} {t('footer.address.postal')}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
                {t('footer.meetTime', '1st Tuesday · 7:30 PM')}
              </Typography>
            </Box>
          </Grid>

          {/* Lodge links */}
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography sx={labelSx}>{t('footer.lodge', 'Lodge')}</Typography>
              <Box component={Link} to="/photos" sx={linkSx}>{t('nav.photos')}</Box>
              <Box component={Link} to="/events" sx={linkSx}>{t('nav.events')}</Box>
              <Box component={Link} to="/contact" sx={linkSx}>{t('nav.contact')}</Box>
              <Box component="a" href="https://www.instagram.com/goodwood_lodge_159/" target="_blank" rel="noopener noreferrer" sx={linkSx}>
                Instagram
              </Box>
            </Box>
          </Grid>

          {/* External links */}
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography sx={labelSx}>{t('footer.links.title')}</Typography>
              <Box component="a" href="https://ontariomasons.ca" target="_blank" rel="noopener noreferrer" sx={linkSx}>
                {t('footer.links.grandLodge')}
              </Box>
              <Box component="a" href="https://ontariomasons.ca/becoming-a-mason/" target="_blank" rel="noopener noreferrer" sx={linkSx}>
                {t('footer.links.becomeAMason')}
              </Box>
              <Box
                component="a"
                href="https://ontariomasons.ca"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, mt: 1, width: 'fit-content' }}
              >
                <Box component="img" src="/images/grand_lodge/Ontario-Masons-Wordmark-Colour-300x53.png" alt="Grand Lodge of Ontario" sx={{ height: 26, display: 'block' }} />
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Bottom bar */}
        <Box
          sx={{
            borderTop: '1px solid rgba(255,255,255,0.12)',
            mt: 7,
            py: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)' }}>
            {t('footer.copyright', { year: currentYear })}
          </Typography>
          <Box component={Link} to="/login" sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', display: 'flex', alignItems: 'center', minHeight: 44, '&:hover': { color: '#FFFFFF' } }}>
            {t('nav.login')}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
