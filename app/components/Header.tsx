import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Container,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  MenuItem,
  Menu,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import LanguageIcon from '@mui/icons-material/Language';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useAuth } from '../context/auth-context';
import { useThemeMode } from '../context/theme-context';

const pages = [
  { key: 'photos', path: '/photos' },
  { key: 'events', path: '/events' },
  { key: 'contact', path: '/contact' },
];

const aboutSubmenu = [
  { key: 'history', path: '/history' },
  { key: 'officers', path: '/officers' },
  { key: 'committees', path: '/committees' },
  { key: 'pastMasters', path: '/past-masters' },
];

// Shared style for the editorial top-nav links
const navLinkSx = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'text.primary',
  cursor: 'pointer',
  textDecoration: 'none',
  letterSpacing: '0.01em',
  px: 0,
  py: 1,
  minWidth: 0,
  transition: 'color 0.25s ease',
  '&:hover': {
    backgroundColor: 'transparent',
    color: 'accent.gold',
  },
} as const;

export default function Header() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);
  const [aboutMenuAnchor, setAboutMenuAnchor] = useState<null | HTMLElement>(null);

  const logo = mode === 'dark'
    ? '/images/goodwood/goodwood-logo-dark.png'
    : '/images/goodwood/goodwood-logo.svg';

  const handleOpenMobileMenu = () => setMobileMenuOpen(true);
  const handleCloseMobileMenu = () => setMobileMenuOpen(false);
  const handleOpenLangMenu = (event: React.MouseEvent<HTMLElement>) => setLangMenuAnchor(event.currentTarget);
  const handleCloseLangMenu = () => setLangMenuAnchor(null);
  const handleOpenAboutMenu = (event: React.MouseEvent<HTMLElement>) => setAboutMenuAnchor(event.currentTarget);
  const handleCloseAboutMenu = () => setAboutMenuAnchor(null);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    handleCloseLangMenu();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 0,
        backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.92),
        backdropFilter: 'blur(8px)',
        borderBottom: (theme) => `1px solid ${theme.palette.section.border}`,
        color: 'text.primary',
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 4 } }}>
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 78 } }}>
          {/* Logo and Brand */}
          <Box
            component={Link}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.75,
              textDecoration: 'none',
              flex: 1,
            }}
          >
            <Box
              component="img"
              src={logo}
              alt="Goodwood Lodge No. 159 seal"
              sx={{ width: { xs: 40, md: 48 }, height: { xs: 40, md: 48 } }}
            />
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', gap: '2px' }}>
              <Typography
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 600,
                  fontSize: '19px',
                  lineHeight: 1.1,
                  color: 'text.primary',
                  letterSpacing: '0.01em',
                }}
              >
                {t('header.brand', 'Goodwood Lodge')}
              </Typography>
              <Typography
                sx={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'accent.gold',
                }}
              >
                No. 159 · A.F. &amp; A.M. · G.R.C.
              </Typography>
            </Box>
          </Box>

          {/* Mobile menu icon */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton aria-label={t('nav.openMenu', 'Open menu')} onClick={handleOpenMobileMenu} sx={{ color: 'text.primary', width: 44, height: 44 }}>
              <MenuIcon />
            </IconButton>
          </Box>

          {/* Desktop Navigation */}
          <Stack
            direction="row"
            spacing={3.75}
            sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}
          >
            <Button
              onClick={handleOpenAboutMenu}
              endIcon={<ArrowDropDownIcon sx={{ ml: -0.75 }} />}
              disableRipple
              sx={navLinkSx}
            >
              {t('nav.about')}
            </Button>
            <Menu
              anchorEl={aboutMenuAnchor}
              open={Boolean(aboutMenuAnchor)}
              onClose={handleCloseAboutMenu}
              sx={{ '& .MuiMenu-paper': { mt: 1, borderRadius: 1, border: (theme) => `1px solid ${theme.palette.section.border}` } }}
            >
              {aboutSubmenu.map((item) => (
                <MenuItem
                  key={item.key}
                  component={Link}
                  to={item.path}
                  onClick={handleCloseAboutMenu}
                  sx={{
                    py: 1.25,
                    px: 3,
                    fontSize: '14px',
                    '&:hover': { backgroundColor: 'section.hero', color: 'accent.gold' },
                  }}
                >
                  {t(`nav.${item.key}`)}
                </MenuItem>
              ))}
            </Menu>

            {pages.map((page) => (
              <Button key={page.key} component={Link} to={page.path} disableRipple sx={navLinkSx}>
                {t(`nav.${page.key}`)}
              </Button>
            ))}

            <Box aria-hidden="true" sx={{ width: '1px', height: 22, backgroundColor: 'section.border' }} />

            {user ? (
              <>
                <Button component={Link} to="/portal" disableRipple sx={{ ...navLinkSx, color: 'section.subtle', fontSize: '13px' }}>
                  Portal
                </Button>
                <Button
                  onClick={handleLogout}
                  disableRipple
                  sx={{ ...navLinkSx, color: 'section.subtle', fontSize: '13px' }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button component={Link} to="/login" disableRipple sx={{ ...navLinkSx, color: 'section.subtle', fontSize: '13px' }}>
                {t('nav.login')}
              </Button>
            )}

            <Button
              component={Link}
              to="/contact"
              sx={{
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.03em',
                color: '#FFFFFF',
                backgroundColor: 'accent.navy',
                px: 2.5,
                py: 1.25,
                borderRadius: '3px',
                '&:hover': { backgroundColor: 'primary.light' },
              }}
            >
              {t('nav.becomeAMason', 'Become a Mason')}
            </Button>

            {/* Theme toggle */}
            <IconButton onClick={toggleTheme} sx={{ color: 'text.secondary', width: 44, height: 44, '&:hover': { color: 'accent.gold' } }} aria-label={t('nav.toggleTheme', 'Toggle dark mode')}>
              {mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
            </IconButton>

            {/* Language switcher */}
            <IconButton onClick={handleOpenLangMenu} sx={{ color: 'text.secondary', width: 44, height: 44, '&:hover': { color: 'accent.gold' } }} aria-label={t('nav.changeLanguage', 'Change language')}>
              <LanguageIcon fontSize="small" />
            </IconButton>
            <Menu anchorEl={langMenuAnchor} open={Boolean(langMenuAnchor)} onClose={handleCloseLangMenu}>
              <MenuItem lang="en" onClick={() => changeLanguage('en')} selected={i18n.language === 'en'}>English</MenuItem>
              <MenuItem lang="fr" onClick={() => changeLanguage('fr')} selected={i18n.language === 'fr'}>Français</MenuItem>
            </Menu>
          </Stack>

          {/* Mobile theme & language icons */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 0.5 }}>
            <IconButton onClick={toggleTheme} sx={{ color: 'text.secondary', width: 44, height: 44 }} aria-label={t('nav.toggleTheme', 'Toggle dark mode')}>
              {mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
            </IconButton>
            <IconButton onClick={handleOpenLangMenu} sx={{ color: 'text.secondary', width: 44, height: 44 }} aria-label={t('nav.changeLanguage', 'Change language')}>
              <LanguageIcon fontSize="small" />
            </IconButton>
          </Box>
        </Toolbar>
      </Container>

      {/* Mobile Drawer */}
      <Drawer anchor="left" open={mobileMenuOpen} onClose={handleCloseMobileMenu}>
        <Box sx={{ width: 264, pt: 2 }}>
          <Box sx={{ px: 2.5, pb: 2, borderBottom: (theme) => `1px solid ${theme.palette.section.border}` }}>
            <Typography sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 600, fontSize: 18, color: 'text.primary' }}>
              {t('site.title')}
            </Typography>
            <Typography sx={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'accent.gold', mt: 0.5 }}>
              A.F. &amp; A.M. · G.R.C.
            </Typography>
          </Box>
          <List>
            <ListItem>
              <ListItemText primary={t('nav.about')} primaryTypographyProps={{ fontWeight: 600, color: 'accent.gold', fontSize: '0.8rem', sx: { textTransform: 'uppercase', letterSpacing: '0.1em' } }} />
            </ListItem>
            {aboutSubmenu.map((item) => (
              <ListItem key={item.key} disablePadding>
                <ListItemButton component={Link} to={item.path} onClick={handleCloseMobileMenu} sx={{ pl: 4 }}>
                  <ListItemText primary={t(`nav.${item.key}`)} primaryTypographyProps={{ fontSize: '0.95rem' }} />
                </ListItemButton>
              </ListItem>
            ))}
            {pages.map((page) => (
              <ListItem key={page.key} disablePadding>
                <ListItemButton component={Link} to={page.path} onClick={handleCloseMobileMenu}>
                  <ListItemText primary={t(`nav.${page.key}`)} />
                </ListItemButton>
              </ListItem>
            ))}

            {user && (
              <ListItem disablePadding>
                <ListItemButton component={Link} to="/portal" onClick={handleCloseMobileMenu}>
                  <ListItemText primary="Portal" />
                </ListItemButton>
              </ListItem>
            )}
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to={user ? '/portal' : '/login'}
                onClick={user ? async () => { await signOut(); handleCloseMobileMenu(); navigate('/'); } : handleCloseMobileMenu}
              >
                <ListItemText primary={user ? 'Logout' : t('nav.login')} primaryTypographyProps={{ color: 'text.secondary' }} />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mt: 2, px: 2 }}>
              <ListItemButton
                component={Link}
                to="/contact"
                onClick={handleCloseMobileMenu}
                sx={{ backgroundColor: 'accent.navy', borderRadius: '3px', '&:hover': { backgroundColor: 'primary.light' } }}
              >
                <ListItemText primary={t('nav.becomeAMason', 'Become a Mason')} primaryTypographyProps={{ color: '#fff', fontWeight: 600, textAlign: 'center' }} />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
