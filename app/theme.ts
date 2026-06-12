import { createTheme } from '@mui/material/styles';

// Extend the palette type to include custom colors
declare module '@mui/material/styles' {
  interface Palette {
    section: {
      hero: string;       // page hero / base band background
      accent: string;     // navy feature band (intentionally dark in both modes)
      neutral: string;    // raised "white" content section
      border: string;     // hairline border / divider
      subtle: string;     // muted caption text
    };
    accent: {
      gold: string;        // label gold on page background (mode-aware)
      navy: string;        // brand navy (buttons, chips) — constant in both modes
      goldOnDark: string;  // bright gold for use on navy bands — constant
    };
  }
  interface PaletteOptions {
    section?: {
      hero?: string;
      accent?: string;
      neutral?: string;
      border?: string;
      subtle?: string;
    };
    accent?: {
      gold?: string;
      navy?: string;
      goldOnDark?: string;
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Goodwood Lodge No. 159 — Editorial design system
//
// Light mode (from the approved redesign):
//   - Base background:  #F7F4EE (cream)
//   - Content sections: #FFFFFF (white)
//   - Feature bands:    #14253C (navy) — used in both modes
//   - Ink / headings:   #14253C   Body: #5C6678   Captions: #8A8FA0
//   - Gold accents:     #9A8650 (on cream)   #D8B45F (on navy)
//   - Hairlines:        #E6E0D2
//
// Dark mode (derived variant of the same palette):
//   - Base background:  #0B1726 (deep navy)
//   - Content sections: #122236 (raised navy)
//   - Feature bands:    #14253C (reads as a raised panel against the darker base)
//   - Ink / headings:   #F4F1E9   Body: #AEB6C2   Captions: #8893A6
//   - Gold accents:     #D8B45F
//   - Hairlines:        rgba(255,255,255,0.12)
//
// Typography: Playfair Display (serif headings) + Public Sans (body).
// ─────────────────────────────────────────────────────────────────────────────
export const getTheme = (mode: 'light' | 'dark') => createTheme({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#14253C' : '#8AA6C8',
      light: '#1E3A55',
      dark: '#0B1726',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: mode === 'light' ? '#5C4E2A' : '#D8B45F', // gold (light value ≥7:1 on cream/white)
      light: '#D8B45F',
      dark: '#7A693E',
      contrastText: mode === 'light' ? '#FFFFFF' : '#14253C',
    },
    background: {
      default: mode === 'light' ? '#F7F4EE' : '#0B1726',
      paper: mode === 'light' ? '#FFFFFF' : '#122236',
    },
    text: {
      // Both values hold ≥7:1 (WCAG AAA) on the cream and white surfaces below
      primary: mode === 'light' ? '#14253C' : '#F4F1E9',
      secondary: mode === 'light' ? '#465062' : '#AEB6C2',
    },
    divider: mode === 'light' ? '#E6E0D2' : 'rgba(255,255,255,0.12)',
    // Custom section colors
    section: {
      hero: mode === 'light' ? '#F7F4EE' : '#0B1726',
      accent: '#14253C',                                  // navy band — constant
      neutral: mode === 'light' ? '#FFFFFF' : '#122236',
      border: mode === 'light' ? '#E6E0D2' : 'rgba(255,255,255,0.12)',
      subtle: mode === 'light' ? '#475063' : '#A9B2C1', // ≥7:1 on all page surfaces
    },
    // Accent colors
    accent: {
      gold: mode === 'light' ? '#5C4E2A' : '#D8B45F', // deep bronze in light mode for 7:1 contrast
      navy: '#14253C',        // brand navy — constant in both modes
      goldOnDark: '#D8B45F',  // bright gold on navy — constant
    },
  },
  shape: {
    borderRadius: 3,
  },
  typography: {
    fontFamily: [
      '"Public Sans"',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontFamily: '"Playfair Display", "Georgia", serif',
      fontWeight: 600,
      fontSize: '3.5rem',
      lineHeight: 1.08,
      letterSpacing: '-0.01em',
    },
    h2: {
      fontFamily: '"Playfair Display", "Georgia", serif',
      fontWeight: 600,
      fontSize: '2.5rem',
      lineHeight: 1.15,
    },
    h3: {
      fontFamily: '"Playfair Display", "Georgia", serif',
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.2,
    },
    h4: {
      fontFamily: '"Playfair Display", "Georgia", serif',
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.3,
    },
    h5: {
      fontFamily: '"Playfair Display", "Georgia", serif',
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.35,
    },
    h6: {
      fontFamily: '"Playfair Display", "Georgia", serif',
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.4,
    },
    overline: {
      fontFamily: '"Public Sans", sans-serif',
      fontWeight: 600,
      fontSize: '0.75rem',
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
    },
    body1: {
      fontSize: '1.0625rem',
      lineHeight: 1.7,
    },
    body2: {
      fontSize: '0.9375rem',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.03em',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Visible focus indicator for plain anchor/button elements (WCAG 2.4.7)
        'a:focus-visible, button:focus-visible': {
          outline: `3px solid ${mode === 'light' ? '#14253C' : '#D8B45F'}`,
          outlineOffset: '2px',
        },
        // Respect reduced-motion preference (WCAG 2.3.3)
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            outline: `3px solid ${mode === 'light' ? '#14253C' : '#D8B45F'}`,
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          minHeight: 44, // WCAG 2.5.5 target size
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 3,
          fontSize: '0.875rem',
          fontWeight: 600,
          padding: '12px 26px',
          transition: 'all 0.25s ease',
          minHeight: 44, // WCAG 2.5.5 target size
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          '@media (min-width: 1200px)': {
            maxWidth: '1200px',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

// Default light theme export for backwards compatibility
const theme = getTheme('light');
export default theme;
