import { Container, Typography, Box, Divider, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function History() {
    const { t } = useTranslation();

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
                {t('history.title')}
            </Typography>

            <Paper elevation={2} sx={{ p: 4, mt: 4 }}>
                <Box sx={{ '& > *': { mb: 3 } }}>
                    <Box component="section">
                        <Typography variant="h4" component="h2" gutterBottom fontWeight="semibold">
                            {t('history.masonryInRichmond.title')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.masonryInRichmond.p1')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.masonryInRichmond.p2')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.masonryInRichmond.p3')}
                        </Typography>
                    </Box>

                    <Box component="section">
                        <Typography variant="h5" component="h3" gutterBottom fontWeight="semibold">
                            {t('history.dukeVisit.title')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.dukeVisit.p1')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.dukeVisit.p2')}
                        </Typography>
                    </Box>

                    <Box component="section">
                        <Typography variant="h5" component="h3" gutterBottom fontWeight="semibold">
                            {t('history.earlyDays.title')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.earlyDays.p1')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.earlyDays.p2')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.earlyDays.p3')}
                        </Typography>
                    </Box>

                    <Box component="section">
                        <Typography variant="h5" component="h3" gutterBottom fontWeight="semibold">
                            {t('history.darkPeriod.title')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.darkPeriod.p1')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.darkPeriod.p2')}
                        </Typography>
                    </Box>

                    <Box component="section">
                        <Typography variant="h5" component="h3" gutterBottom fontWeight="semibold">
                            {t('history.revival.title')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.revival.p1')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.revival.p2')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.revival.p3')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.revival.p4')}
                        </Typography>
                    </Box>

                    <Box component="section">
                        <Typography variant="h5" component="h3" gutterBottom fontWeight="semibold">
                            {t('history.notableMembers.title')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.notableMembers.p1')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.notableMembers.p2')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.notableMembers.p3')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.notableMembers.p4')}
                        </Typography>
                    </Box>

                    <Box component="section">
                        <Typography variant="h5" component="h3" gutterBottom fontWeight="semibold">
                            {t('history.modernEra.title')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.modernEra.p1')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.modernEra.p2')}
                        </Typography>
                        <Typography variant="body1" >
                            {t('history.modernEra.p3')}
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 4 }} />

                    <Box component="section">
                        <Typography variant="body1" fontStyle="italic">
                            {t('history.footer.detailedHistory')} <a href="files/Goodwood Lodge History 1989 - 2014 Version 1.0.pdf">{t('history.footer.detailedHistoryLink')}</a>
                        </Typography>
                        <Typography variant="body1" fontStyle="italic">
                            {t('history.footer.artifactsIntro')} <a href="files/Lodge Artifacts.pdf">{t('history.footer.artifactsLink')}</a>
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
}
