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
import MenuIcon from '@mui/icons-material/Menu';
import LanguageIcon from '@mui/icons-material/Language';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useAuth } from '../context/auth-context';
import { useThemeMode } from '../context/theme-context';


const pages = [
  { key: 'events', path: '/events' },
  { key: 'contact', path: '/contact' },
];

const aboutSubmenu = [
  { key: 'history', path: '/history' },
  { key: 'officers', path: '/officers' },
  { key: 'committees', path: '/committees' },
  { key: 'pastMasters', path: '/past-masters' },
];

export default function Header() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);
  const [aboutMenuAnchor, setAboutMenuAnchor] = useState<null | HTMLElement>(null);

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

  const handleOpenAboutMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAboutMenuAnchor(event.currentTarget);
  };

  const handleCloseAboutMenu = () => {
    setAboutMenuAnchor(null);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{
        backgroundColor: 'background.paper',
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 90 }, py: 1 }}>
          {/* Logo and Brand - Desktop */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 2.5,
              flex: 1,
            }}
          >
            {/* Lodge Crest */}
            <Box
              sx={{
                width: 70,
                height: 70,
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                component="img"
                sx={{
                  width: '100%',
                  height: 'auto',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                }}
                src="./images/goodwood/goodwood-logo.svg"
              />
            </Box>

            <Box>
              <Typography
                variant="h5"
                component={Link}
                to="/"
                sx={{
                  fontWeight: 700,
                  fontSize: '1.5rem',
                  color: 'primary.dark',
                  textDecoration: 'none',
                  display: 'block',
                  lineHeight: 1.2,
                  transition: 'color 0.3s ease',
                  '&:hover': {
                    color: 'primary.main',
                  },
                }}
              >
                {t('header.title')}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.5,
                  fontSize: '0.875rem',
                  letterSpacing: '0.3px',
                }}
              >
                {t('header.tagline')}
              </Typography>
            </Box>
          </Box>

          {/* Mobile Menu Icon */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flex: 0 }}>
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
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flex: 3, justifyContent: 'center' }}>
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
              Goodwood Lodge
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
            }}
          >
            <Button
              onClick={handleOpenAboutMenu}
              endIcon={<ArrowDropDownIcon />}
              sx={{
                color: 'text.primary',
                px: 2.5,
                py: 1,
                fontSize: '0.95rem',
                fontWeight: 500,
                letterSpacing: '0.3px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'transparent',
                  color: 'primary.main',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {t('nav.about')}
            </Button>
            <Menu
              anchorEl={aboutMenuAnchor}
              open={Boolean(aboutMenuAnchor)}
              onClose={handleCloseAboutMenu}
              sx={{
                '& .MuiMenu-paper': {
                  mt: 1,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  borderRadius: 2,
                },
              }}
            >
              {aboutSubmenu.map((item) => (
                <MenuItem
                  key={item.key}
                  component={Link}
                  to={item.path}
                  onClick={handleCloseAboutMenu}
                  sx={{
                    py: 1.5,
                    px: 3,
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                      color: 'white',
                    },
                  }}
                >
                  {t(`nav.${item.key}`)}
                </MenuItem>
              ))}

            </Menu>
            {pages.map((page) => (
              <Button
                key={page.key}
                component={Link}
                to={page.path}
                sx={{
                  color: 'text.primary',
                  px: 2.5,
                  py: 1,
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    color: 'primary.main',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                {t(`nav.${page.key}`)}
              </Button>
            ))}

            {user && (
              <Button
                component={Link}
                to="/portal"
                sx={{
                  color: 'white',
                  backgroundColor: 'primary.main',
                  px: 2.5,
                  py: 1,
                  ml: 1,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  letterSpacing: '0.3px',
                  borderRadius: 1,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                    transform: 'translateY(-1px)',
                    boxShadow: 2,
                  },
                }}
              >
                Portal
              </Button>
            )}

            {/* Login/Logout */}
            {user ? (
              <Button
                variant="contained"
                onClick={handleLogout}
                sx={{
                  ml: 3,
                  backgroundColor: '#13294b',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  px: 3,
                  py: 1,
                  borderRadius: 1,
                  boxShadow: 'none',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: '#1c3f72ff',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                Logout
              </Button>
            ) : (
              <Button
                variant="contained"
                component={Link}
                to="/login"
                sx={{
                  ml: 3,
                  backgroundColor: '#13294b',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  px: 3,
                  py: 1,
                  borderRadius: 1,
                  boxShadow: 'none',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: '#1c3f72ff',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                {t('nav.login')}
              </Button>
            )}

            {/* Theme Toggle */}
            <IconButton
              onClick={toggleTheme}
              color="inherit"
              size="small"
              sx={{
                ml: 1,
                transition: 'all 0.3s ease',
                '&:hover': {
                  color: 'primary.main',
                  transform: 'scale(1.05)',
                },
              }}
              aria-label="toggle theme"
            >
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>

            {/* Language Switcher */}
            <IconButton
              onClick={handleOpenLangMenu}
              color="inherit"
              size="small"
              sx={{
                ml: 1,
                transition: 'all 0.3s ease',
                '&:hover': {
                  color: 'primary.main',
                  transform: 'scale(1.05)',
                },
              }}
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


          </Stack>

          {/* Mobile Theme & Language Icons */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 0.5 }}>
            <IconButton onClick={toggleTheme} color="inherit" size="small" aria-label="toggle theme">
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
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
            {/* About Us Section */}
            <ListItem disablePadding>
              <ListItemButton disabled>
                <ListItemText
                  primary={t('nav.about')}
                  primaryTypographyProps={{
                    fontWeight: 600,
                    color: 'primary.main',
                    fontSize: '0.9rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
            {aboutSubmenu.map((item) => (
              <ListItem key={item.key} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  onClick={handleCloseMobileMenu}
                  sx={{ pl: 4 }}
                >
                  <ListItemText
                    primary={t(`nav.${item.key}`)}
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
            {/* Other pages */}
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

            {user && (
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  to="/portal"
                  onClick={handleCloseMobileMenu}
                  sx={{
                    mt: 2,
                    mx: 2,
                    backgroundColor: 'primary.main',
                    borderRadius: 1,
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  }}
                >
                  <ListItemText primary="Portal" primaryTypographyProps={{
                    color: '#ffffff',
                  }} />
                </ListItemButton>
              </ListItem>
            )}

            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/contact"
                onClick={handleCloseMobileMenu}
                sx={{
                  mt: 2,
                  mx: 2,
                  backgroundColor: '#13294b',
                }}
              >
                <ListItemText primary={t('nav.login')} primaryTypographyProps={{
                  color: '#ffffff',
                }} />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
