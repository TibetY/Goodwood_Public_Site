import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Container,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LanguageIcon from '@mui/icons-material/Language';

const pages = [
  { key: 'about', path: '/about' },
  { key: 'history', path: '/history' },
  { key: 'events', path: '/events' },
  { key: 'contact', path: '/contact' },
];

export default function Header() {
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);

  const handleOpenMobileMenu = () => {
    setMobileMenuOpen(true);
  };

  const handleCloseMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleOpenLangMenu = (event: React.MouseEvent<HTMLElement>) => {
    setLangMenuAnchor(event.currentTarget);
  };

  const handleCloseLangMenu = () => {
    setLangMenuAnchor(null);
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    handleCloseLangMenu();
  };

  return (
    <AppBar position="static" color="default" elevation={1} sx={{ backgroundColor: 'white' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 80 } }}>
          {/* Logo and Brand - Desktop */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 2,
              flex: 1,
            }}
          >
            {/* Lodge Crest */}
            <Box
              sx={{
                width: 80,
                height: 80,
                backgroundColor: 'transparent',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                component="img"
                sx={{
                  width: '100%',
                  height: 'auto'
                }}
                src="./images/goodwood_logo.svg"
              />
            </Box>

            <Box>
              <Typography
                variant="h5"
                component={Link}
                to="/"
                sx={{
                  fontWeight: 700,
                  color: 'primary.main',
                  textDecoration: 'none',
                  display: 'block',
                  lineHeight: 1.2,
                }}
              >
                {t('header.title')}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {t('header.tagline')}
              </Typography>
            </Box>
          </Box>

          {/* Mobile Menu Icon */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flex: 1 }}>
            <IconButton
              size="large"
              aria-label="menu"
              onClick={handleOpenMobileMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
          </Box>

          {/* Mobile Brand */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flex: 1, justifyContent: 'center' }}>
            <Typography
              variant="h6"
              component={Link}
              to="/"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                textDecoration: 'none',
              }}
            >
              {t('site.title')}
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
            }}
          >
            {pages.map((page) => (
              <Button
                key={page.key}
                component={Link}
                to={page.path}
                sx={{
                  color: 'text.primary',
                  px: 2,
                  '&:hover': {
                    backgroundColor: 'grey.100',
                  },
                }}
              >
                {t(`nav.${page.key}`)}
              </Button>
            ))}

            {/* Language Switcher */}
            <IconButton
              onClick={handleOpenLangMenu}
              color="inherit"
              size="small"
              sx={{ ml: 1 }}
            >
              <LanguageIcon />
            </IconButton>
            <Menu
              anchorEl={langMenuAnchor}
              open={Boolean(langMenuAnchor)}
              onClose={handleCloseLangMenu}
            >
              <MenuItem
                onClick={() => changeLanguage('en')}
                selected={i18n.language === 'en'}
              >
                English
              </MenuItem>
              <MenuItem
                onClick={() => changeLanguage('fr')}
                selected={i18n.language === 'fr'}
              >
                Français
              </MenuItem>
            </Menu>

            {/* Become a Mason CTA */}
            <Button
              variant="contained"
              component={Link}
              to="/contact"
              sx={{
                ml: 2,
                backgroundColor: '#1a237e',
                fontWeight: 600,
              }}
            >
              {t('nav.becomeAMason')}
            </Button>
          </Stack>

          {/* Mobile Language Icon */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton onClick={handleOpenLangMenu} color="inherit" size="small">
              <LanguageIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </Container>

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={handleCloseMobileMenu}
      >
        <Box sx={{ width: 250, pt: 2 }}>
          <Box sx={{ px: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" color="primary" fontWeight={700}>
              {t('site.title')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('site.subtitle')}
            </Typography>
          </Box>
          <List>
            {pages.map((page) => (
              <ListItem key={page.key} disablePadding>
                <ListItemButton
                  component={Link}
                  to={page.path}
                  onClick={handleCloseMobileMenu}
                >
                  <ListItemText primary={t(`nav.${page.key}`)} />
                </ListItemButton>
              </ListItem>
            ))}
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/contact"
                onClick={handleCloseMobileMenu}
                sx={{
                  mt: 2,
                  mx: 2,
                  backgroundColor: '#b71c1c',
                  color: 'white',
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: '#8b0000',
                  },
                }}
              >
                <ListItemText primary={t('nav.becomeAMason')} />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
