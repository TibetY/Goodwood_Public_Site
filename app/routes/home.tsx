import type { Route } from "./+types/home";
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Container, Typography, Box, Button, Grid } from '@mui/material';
import { useThemeMode } from '../context/theme-context';
import { fetchEvents, eventDateCard, eventTimeLabel } from '../utils/events';

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Goodwood Lodge No. 159 - Beyond the Square and Compass" },
    { name: "description", content: "Developing our character and serving the greater good. Grand Lodge of A.F. & A.M. of Canada in the Province of Ontario" },
  ];
}

const PRIMARY_BTN = {
  fontSize: '14px',
  fontWeight: 600,
  letterSpacing: '0.03em',
  color: '#FFFFFF',
  backgroundColor: 'accent.navy',
  px: 3.5,
  py: 1.75,
  borderRadius: '3px',
  '&:hover': { backgroundColor: 'primary.light' },
} as const;

function MeetingFact({ label, line1, line2 }: { label: string; line1: string; line2: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Typography variant="overline" sx={{ color: 'accent.gold', letterSpacing: '0.18em' }}>{label}</Typography>
      <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 21, color: 'text.primary' }}>{line1}</Typography>
      <Typography sx={{ fontSize: 13, color: 'section.subtle' }}>{line2}</Typography>
    </Box>
  );
}

function WelcomeStat({ value, label }: { value: string; label: string }) {
  return (
    <Box sx={{ borderTop: '1px solid rgba(216,180,95,0.4)', pt: 1.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 26, color: 'accent.goldOnDark' }}>{value}</Typography>
      <Typography sx={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>{label}</Typography>
    </Box>
  );
}

function Principle({ numeral, title, description }: { numeral: string; title: string; description: string }) {
  return (
    <Box sx={{ borderTop: (theme) => `2px solid ${theme.palette.accent.navy}`, pt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 18, color: 'accent.gold' }}>{numeral}</Typography>
      <Typography variant="h4" sx={{ fontSize: 24 }}>{title}</Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>{description}</Typography>
    </Box>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const logo = mode === 'dark' ? 'images/goodwood/goodwood-logo-dark.png' : 'images/goodwood/goodwood-logo.svg';

  const { data: events } = useQuery({ queryKey: ['events'], queryFn: fetchEvents, staleTime: 5 * 60 * 1000 });
  const upcomingPreview = (events?.upcoming ?? []).slice(0, 2);

  return (
    <>
      {/* ===== Hero ===== */}
      <Box component="section" sx={{ backgroundColor: 'section.hero' }}>
        <Container maxWidth="lg" sx={{ pt: { xs: 7, md: 11 } }}>
          <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Typography variant="overline" sx={{ color: 'accent.gold' }}>
                  {t('home.hero.eyebrow', 'Richmond, Ontario · Est. 1863')}
                </Typography>
                <Typography variant="h1" sx={{ fontSize: { xs: '2.75rem', md: '3.875rem' }, color: 'text.primary' }}>
                  {t('home.hero.title')}
                </Typography>
                <Typography variant="body1" sx={{ fontSize: '1.1875rem', color: 'text.secondary', maxWidth: '52ch' }}>
                  {t('home.hero.subtitle')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.75, mt: 1, flexWrap: 'wrap' }}>
                  <Button component={Link} to="/contact" sx={PRIMARY_BTN}>
                    {t('home.callToAction.buttonText')}
                  </Button>
                  <Button
                    component={Link}
                    to="/events"
                    sx={{
                      fontSize: '14px', fontWeight: 600, letterSpacing: '0.03em',
                      color: 'text.primary', border: (theme) => `1px solid ${theme.palette.section.border}`,
                      px: 3.5, py: 1.75, borderRadius: '3px',
                      '&:hover': { borderColor: 'accent.gold', color: 'accent.gold', backgroundColor: 'transparent' },
                    }}
                  >
                    {t('home.hero.planVisit', 'Plan a Visit')}
                  </Button>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box component="img" src={logo} alt="Goodwood Lodge No. 159 seal" sx={{ width: { xs: 220, md: 320 }, height: 'auto' }} />
            </Grid>
          </Grid>

          {/* Meeting info strip */}
          <Box
            sx={{
              mt: { xs: 6, md: 9 },
              borderTop: (theme) => `1px solid ${theme.palette.section.border}`,
              py: { xs: 4, md: 4 },
            }}
          >
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <MeetingFact label={t('home.meeting.meetLabel', 'We Meet')} line1={t('home.meeting.meetValue', '1st Tuesday · 7:30 PM')} line2={t('home.meeting.meetNote', 'September through June')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <MeetingFact label={t('home.meeting.hallLabel', 'Lodge Hall')} line1={t('home.meeting.hallValue', '3494 McBean Street')} line2={t('home.meeting.hallNote', 'Richmond, ON K0A 2Z0')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <MeetingFact label={t('home.meeting.visitorsLabel', 'Visitors')} line1={t('home.meeting.visitorsValue', 'Brethren welcome')} line2={t('home.meeting.visitorsNote', 'Inquiries always answered')} />
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>

      {/* ===== Welcome (navy band) ===== */}
      <Box component="section" sx={{ backgroundColor: 'section.accent' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Grid container spacing={{ xs: 5, md: 9 }} alignItems="center">
            <Grid size={{ xs: 12, md: 5 }}>
              <Box sx={{ border: '1px solid rgba(216,180,95,0.45)', p: 1.5 }}>
                <Box component="img" src="images/goodwood/Lodge_Front.jpg" alt="Goodwood Lodge hall in Richmond, Ontario" sx={{ width: '100%', display: 'block', aspectRatio: '4 / 3', objectFit: 'cover' }} />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Typography variant="overline" sx={{ color: 'accent.goldOnDark' }}>{t('home.welcome.greeting')}</Typography>
                <Typography variant="h2" sx={{ color: '#FFFFFF', fontSize: { xs: '2rem', md: '2.375rem' } }}>{t('home.welcome.lodgeName')}</Typography>
                <Typography sx={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,0.78)' }}>{t('home.welcome.description')}</Typography>
                <Typography sx={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,0.78)' }}>{t('home.welcome.extendedDescription')}</Typography>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  <Grid size={4}><WelcomeStat value="1863" label={t('home.welcome.statChartered', 'Chartered')} /></Grid>
                  <Grid size={4}><WelcomeStat value="No. 159" label={t('home.welcome.statRegister', 'Grand Register')} /></Grid>
                  <Grid size={4}><WelcomeStat value="Richmond" label={t('home.welcome.statHome', 'Our Home')} /></Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ===== Principles ===== */}
      <Box component="section" sx={{ backgroundColor: 'section.hero' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.75, textAlign: 'center', mb: { xs: 6, md: 8 } }}>
            <Typography variant="overline" sx={{ color: 'accent.gold' }}>{t('home.values.heading')}</Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.5rem' } }}>
              {t('home.values.principlesHeading', 'Brotherly Love, Relief & Truth')}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: '56ch' }}>{t('home.values.description')}</Typography>
          </Box>
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Principle numeral="I." title={t('home.values.brotherlyLove.title')} description={t('home.values.brotherlyLove.description')} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Principle numeral="II." title={t('home.values.relief.title')} description={t('home.values.relief.description')} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Principle numeral="III." title={t('home.values.truth.title')} description={t('home.values.truth.description')} />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ===== Journey + Events preview ===== */}
      <Box component="section" sx={{ backgroundColor: 'background.paper', borderTop: (theme) => `1px solid ${theme.palette.section.border}` }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Grid container spacing={{ xs: 6, md: 10 }} alignItems="flex-start">
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Typography variant="overline" sx={{ color: 'accent.gold' }}>{t('home.callToAction.sectionTitle')}</Typography>
                <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.375rem' } }}>{t('home.callToAction.heading')}</Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>{t('home.callToAction.description')}</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Button component={Link} to="/contact" sx={PRIMARY_BTN}>{t('home.callToAction.buttonText')}</Button>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="overline" sx={{ color: 'accent.gold', display: 'block', mb: 2.5 }}>
                {t('home.upcomingTitle', 'Upcoming at the Lodge')}
              </Typography>
              {upcomingPreview.length > 0 ? (
                upcomingPreview.map((ev) => {
                  const { day, month } = eventDateCard(ev);
                  const meta = [eventTimeLabel(ev), ev.location].filter(Boolean).join(' · ');
                  return (
                    <Box key={ev.id} sx={{ display: 'flex', gap: 2.25, py: 2.25, borderTop: (theme) => `1px solid ${theme.palette.section.border}`, alignItems: 'center' }}>
                      <Box sx={{ width: 64, flexShrink: 0, backgroundColor: 'accent.navy', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 1.25 }}>
                        <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 24, lineHeight: 1 }}>{day}</Typography>
                        <Typography sx={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', mt: '3px' }}>{month}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <Typography sx={{ fontFamily: '"Playfair Display", serif', fontSize: 19, color: 'text.primary' }}>{ev.title}</Typography>
                        {meta && <Typography sx={{ fontSize: 13, color: 'section.subtle' }}>{meta}</Typography>}
                      </Box>
                    </Box>
                  );
                })
              ) : (
                <Box sx={{ py: 2.25, borderTop: (theme) => `1px solid ${theme.palette.section.border}` }}>
                  <Typography sx={{ color: 'text.secondary' }}>
                    {t('home.noUpcoming', 'Check back soon for upcoming meetings and events.')}
                  </Typography>
                </Box>
              )}
              <Box
                component={Link}
                to="/events"
                sx={{
                  display: 'inline-block', mt: 2.25, pt: 2.25,
                  borderTop: (theme) => `1px solid ${theme.palette.section.border}`,
                  width: '100%', fontSize: 14, fontWeight: 600, color: 'accent.gold',
                  textDecoration: 'none', '&:hover': { color: 'text.primary' },
                }}
              >
                {t('home.viewAllEvents', 'View all events →')}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ===== Photo band ===== */}
      <Box component="section" sx={{ position: 'relative' }}>
        <Box component="img" src="images/goodwood/Goodwood_Install_2_2025_DSC_5380.jpg" alt="Brethren of Goodwood Lodge at the 2025 Installation of Officers" sx={{ width: '100%', height: { xs: 280, md: 460 }, objectFit: 'cover', display: 'block' }} />
        <Typography
          sx={{
            position: 'absolute', left: { xs: 16, md: 32 }, bottom: { xs: 16, md: 24 },
            fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#FFFFFF', backgroundColor: 'rgba(20,37,60,0.75)', px: 1.75, py: 1,
          }}
        >
          {t('home.photoCaption', 'Installation of Officers · 2025')}
        </Typography>
      </Box>
    </>
  );
}
