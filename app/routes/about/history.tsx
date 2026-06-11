import { Container, Typography, Box, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function History() {
    const { t } = useTranslation();

    return (
        <>
            {/* Page header band */}
            <Box sx={{ backgroundColor: 'section.hero', borderBottom: theme => `1px solid ${theme.palette.section.border}` }}>
                <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="overline" sx={{ color: 'accent.gold' }}>
                        Goodwood Lodge No. 159
                    </Typography>
                    <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '2.25rem', md: '3rem' } }}>
                        {t('history.title')}
                    </Typography>
                </Container>
            </Box>

            {/* Article body */}
            <Box sx={{ backgroundColor: 'background.paper' }}>
                <Container maxWidth="md" sx={{ py: { xs: 6, md: 9 } }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 5, md: 6 } }}>
                        <Box component="section">
                            <Typography
                                variant="h4"
                                component="h2"
                                gutterBottom
                                sx={{ borderTop: theme => `2px solid ${theme.palette.accent.navy}`, pt: 2.5, mb: 2.5 }}
                            >
                                {t('history.masonryInRichmond.title')}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.masonryInRichmond.p1')}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.masonryInRichmond.p2')}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.masonryInRichmond.p3')}
                                </Typography>
                            </Box>
                        </Box>

                        <Box component="section">
                            <Typography
                                variant="h4"
                                component="h2"
                                gutterBottom
                                sx={{ borderTop: theme => `2px solid ${theme.palette.accent.navy}`, pt: 2.5, mb: 2.5 }}
                            >
                                {t('history.dukeVisit.title')}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.dukeVisit.p1')}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.dukeVisit.p2')}
                                </Typography>
                            </Box>
                        </Box>

                        <Box component="section">
                            <Typography
                                variant="h4"
                                component="h2"
                                gutterBottom
                                sx={{ borderTop: theme => `2px solid ${theme.palette.accent.navy}`, pt: 2.5, mb: 2.5 }}
                            >
                                {t('history.earlyDays.title')}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.earlyDays.p1')}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.earlyDays.p2')}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.earlyDays.p3')}
                                </Typography>
                            </Box>
                        </Box>

                        <Box component="section">
                            <Typography
                                variant="h4"
                                component="h2"
                                gutterBottom
                                sx={{ borderTop: theme => `2px solid ${theme.palette.accent.navy}`, pt: 2.5, mb: 2.5 }}
                            >
                                {t('history.darkPeriod.title')}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.darkPeriod.p1')}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.darkPeriod.p2')}
                                </Typography>
                            </Box>
                        </Box>

                        <Box component="section">
                            <Typography
                                variant="h4"
                                component="h2"
                                gutterBottom
                                sx={{ borderTop: theme => `2px solid ${theme.palette.accent.navy}`, pt: 2.5, mb: 2.5 }}
                            >
                                {t('history.revival.title')}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.revival.p1')}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.revival.p2')}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.revival.p3')}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.revival.p4')}
                                </Typography>
                            </Box>
                        </Box>

                        <Box component="section">
                            <Typography
                                variant="h4"
                                component="h2"
                                gutterBottom
                                sx={{ borderTop: theme => `2px solid ${theme.palette.accent.navy}`, pt: 2.5, mb: 2.5 }}
                            >
                                {t('history.notableMembers.title')}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.notableMembers.p1')}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.notableMembers.p2')}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.notableMembers.p3')}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.notableMembers.p4')}
                                </Typography>
                            </Box>
                        </Box>

                        <Box component="section">
                            <Typography
                                variant="h4"
                                component="h2"
                                gutterBottom
                                sx={{ borderTop: theme => `2px solid ${theme.palette.accent.navy}`, pt: 2.5, mb: 2.5 }}
                            >
                                {t('history.modernEra.title')}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.modernEra.p1')}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.modernEra.p2')}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                                    {t('history.modernEra.p3')}
                                </Typography>
                            </Box>
                        </Box>

                        <Divider sx={{ borderColor: 'section.border' }} />

                        <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Typography variant="body1" fontStyle="italic" sx={{ color: 'text.secondary' }}>
                                {t('history.footer.detailedHistory')}{' '}
                                <Box
                                    component="a"
                                    href="files/Goodwood Lodge History 1989 - 2014 Version 1.0.pdf"
                                    sx={{ color: 'accent.gold', fontWeight: 600, textDecoration: 'underline' }}
                                >
                                    {t('history.footer.detailedHistoryLink')}
                                </Box>
                            </Typography>

                            <Typography variant="body1" fontStyle="italic" sx={{ color: 'text.secondary' }}>
                                {t('history.footer.artifactsIntro')}{' '}
                                <Box
                                    component="a"
                                    href="files/Lodge Artifacts.pdf"
                                    sx={{ color: 'accent.gold', fontWeight: 600, textDecoration: 'underline' }}
                                >
                                    {t('history.footer.artifactsLink')}
                                </Box>
                            </Typography>
                        </Box>
                    </Box>
                </Container>
            </Box>
        </>
    );
}
