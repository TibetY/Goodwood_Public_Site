import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Typography, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Route } from "./+types/root";
import "./app.css";
import './i18n';
import Header from './components/Header';
import Footer from './components/Footer';
import { AuthProvider } from "./context/auth-context";
import { ThemeProvider } from "./context/theme-context";
import FreemasonryChatbot from "./routes/chatBot";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Action to handle Netlify Forms POST requests
// In production, Netlify intercepts the POST before it reaches here
// In development, this prevents React Router from throwing an error
export async function action({ request }: Route.ActionArgs) {
  // Netlify Forms handles the actual form submission in production
  // Return null to continue rendering the page
  return null;
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Goodwood Lodge No. 159</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <Meta />
        <Links />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <CssBaseline />
              {children}
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
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
      <FreemasonryChatbot/>
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
