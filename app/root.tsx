import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Typography, Box } from '@mui/material';

import type { Route } from "./+types/root";
import "./app.css";
import theme from './theme';
import './i18n';
import Header from './components/Header';
import Footer from './components/Footer';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <Header />
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>
      <Footer />
    </Box>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <Container maxWidth="lg" sx={{ pt: 8, pb: 4 }}>
      <Box>
        <Typography variant="h1" gutterBottom>
          {message}
        </Typography>
        <Typography variant="body1" paragraph>
          {details}
        </Typography>
        {stack && (
          <Box
            component="pre"
            sx={{
              width: '100%',
              p: 2,
              overflowX: 'auto',
              backgroundColor: 'grey.100',
              borderRadius: 1,
            }}
          >
            <code>{stack}</code>
          </Box>
        )}
      </Box>
    </Container>
  );
}
