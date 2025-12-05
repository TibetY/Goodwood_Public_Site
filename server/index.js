import { jsx, jsxs } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter, Link, UNSAFE_withComponentProps, Outlet, UNSAFE_withErrorBoundaryProps, isRouteErrorResponse, Meta, Links, ScrollRestoration, Scripts } from "react-router";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AppBar, Container, Toolbar, Box, Typography, IconButton, Stack, Button, Menu, MenuItem, Drawer, List, ListItem, ListItemButton, ListItemText, Divider } from "@mui/material";
import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import LanguageIcon from "@mui/icons-material/Language";
const streamTimeout = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, routerContext, loadContext) {
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders
    });
  }
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    let userAgent = request.headers.get("user-agent");
    let readyOption = userAgent && isbot(userAgent) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";
    let timeoutId = setTimeout(
      () => abort(),
      streamTimeout + 1e3
    );
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(ServerRouter, { context: routerContext, url: request.url }),
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = void 0;
              callback();
            }
          });
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          pipe(body);
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
const theme = createTheme({
  palette: {
    primary: {
      main: "#1a237e",
      // Deep blue - representing wisdom and truth
      light: "#534bae",
      dark: "#000051",
      contrastText: "#ffffff"
    },
    secondary: {
      main: "#c5a572",
      // Gold - representing light and knowledge
      light: "#f9d7a3",
      dark: "#957545",
      contrastText: "#000000"
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff"
    }
  },
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif"
    ].join(","),
    h1: {
      fontWeight: 600
    },
    h2: {
      fontWeight: 600
    },
    h3: {
      fontWeight: 600
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }
      }
    }
  }
});
const site$1 = { "title": "Goodwood Lodge No. 159", "subtitle": "Grand Lodge of A.F. & A.M. of Canada in the Province of Ontario" };
const header$1 = { "title": "Goodwood motto maybe", "tagline": "Goodwood tagline here" };
const nav$1 = { "home": "Home", "about": "About Us", "history": "History", "events": "Events", "contact": "Contact", "becomeAMason": "Become a Mason" };
const home$2 = { "welcome": "Welcome to Goodwood Lodge No. 159", "description": "We are a fraternal organization dedicated to making good men better through brotherhood, charity, and personal growth.", "learnMore": "Learn More", "contactUs": "Contact Us" };
const about$1 = { "title": "About Goodwood Lodge No. 159", "whatIsFreemasonry": "What is Freemasonry?", "ourLodge": "Our Lodge", "meetingTimes": "Meeting Times" };
const history$1 = { "title": "Our History", "description": "The rich history of Goodwood Lodge No. 159" };
const events$1 = { "title": "Upcoming Events", "noEvents": "No upcoming events at this time." };
const contact$1 = { "title": "Contact Us", "subtitle": "Interested in learning more about Freemasonry?", "name": "Name", "email": "Email", "phone": "Phone", "message": "Message", "send": "Send Message", "successMessage": "Thank you for your message. We will be in touch soon." };
const footer$1 = { "copyright": "© {{year}} Goodwood Lodge No. 159. All rights reserved.", "privacyPolicy": "Privacy Policy", "termsOfUse": "Terms of Use" };
const privacy$1 = { "title": "Privacy Policy", "lastUpdated": "Last Updated: {{date}}" };
const terms$1 = { "title": "Terms of Use", "lastUpdated": "Last Updated: {{date}}" };
const common$1 = { "loading": "Loading...", "error": "An error occurred", "notFound": "Page not found" };
const enTranslations = {
  site: site$1,
  header: header$1,
  nav: nav$1,
  home: home$2,
  about: about$1,
  history: history$1,
  events: events$1,
  contact: contact$1,
  footer: footer$1,
  privacy: privacy$1,
  terms: terms$1,
  common: common$1
};
const site = { "title": "Loge Goodwood No. 159", "subtitle": "Grande Loge de A.F. & A.M. du Canada dans la Province de l'Ontario" };
const header = { "title": "Au-delà de l'Équerre et du Compas", "tagline": "Développer notre caractère et servir le bien commun." };
const nav = { "home": "Accueil", "about": "À Propos", "history": "Histoire", "events": "Événements", "contact": "Contact", "becomeAMason": "Devenir Franc-Maçon" };
const home$1 = { "welcome": "Bienvenue à la Loge Goodwood No. 159", "description": "Nous sommes une organisation fraternelle dédiée à améliorer les bons hommes par la fraternité, la charité et la croissance personnelle.", "learnMore": "En Savoir Plus", "contactUs": "Nous Contacter" };
const about = { "title": "À Propos de la Loge Goodwood No. 159", "whatIsFreemasonry": "Qu'est-ce que la Franc-Maçonnerie?", "ourLodge": "Notre Loge", "meetingTimes": "Heures de Réunion" };
const history = { "title": "Notre Histoire", "description": "La riche histoire de la Loge Goodwood No. 159" };
const events = { "title": "Événements à Venir", "noEvents": "Aucun événement à venir pour le moment." };
const contact = { "title": "Nous Contacter", "subtitle": "Intéressé à en savoir plus sur la Franc-Maçonnerie?", "name": "Nom", "email": "Courriel", "phone": "Téléphone", "message": "Message", "send": "Envoyer le Message", "successMessage": "Merci pour votre message. Nous vous contacterons bientôt." };
const footer = { "copyright": "© {{year}} Loge Goodwood No. 159. Tous droits réservés.", "privacyPolicy": "Politique de Confidentialité", "termsOfUse": "Conditions d'Utilisation" };
const privacy = { "title": "Politique de Confidentialité", "lastUpdated": "Dernière Mise à Jour: {{date}}" };
const terms = { "title": "Conditions d'Utilisation", "lastUpdated": "Dernière Mise à Jour: {{date}}" };
const common = { "loading": "Chargement...", "error": "Une erreur s'est produite", "notFound": "Page non trouvée" };
const frTranslations = {
  site,
  header,
  nav,
  home: home$1,
  about,
  history,
  events,
  contact,
  footer,
  privacy,
  terms,
  common
};
i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: {
    en: {
      translation: enTranslations
    },
    fr: {
      translation: frTranslations
    }
  },
  fallbackLng: "en",
  supportedLngs: ["en", "fr"],
  interpolation: {
    escapeValue: false
  },
  detection: {
    order: ["localStorage", "navigator"],
    caches: ["localStorage"]
  }
});
const pages = [
  { key: "home", path: "/" },
  { key: "about", path: "/about" },
  { key: "history", path: "/history" },
  { key: "events", path: "/events" },
  { key: "contact", path: "/contact" }
];
function Header() {
  const { t, i18n: i18n2 } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuAnchor, setLangMenuAnchor] = useState(null);
  const handleOpenMobileMenu = () => {
    setMobileMenuOpen(true);
  };
  const handleCloseMobileMenu = () => {
    setMobileMenuOpen(false);
  };
  const handleOpenLangMenu = (event) => {
    setLangMenuAnchor(event.currentTarget);
  };
  const handleCloseLangMenu = () => {
    setLangMenuAnchor(null);
  };
  const changeLanguage = (lang) => {
    i18n2.changeLanguage(lang);
    handleCloseLangMenu();
  };
  return /* @__PURE__ */ jsxs(AppBar, { position: "static", color: "default", elevation: 1, sx: { backgroundColor: "white" }, children: [
    /* @__PURE__ */ jsx(Container, { maxWidth: "xl", children: /* @__PURE__ */ jsxs(Toolbar, { disableGutters: true, sx: { minHeight: { xs: 64, md: 80 } }, children: [
      /* @__PURE__ */ jsxs(
        Box,
        {
          sx: {
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            gap: 2,
            flex: 1
          },
          children: [
            /* @__PURE__ */ jsx(
              Box,
              {
                sx: {
                  width: 80,
                  height: 80,
                  backgroundColor: "transparent",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                },
                children: /* @__PURE__ */ jsx(
                  Box,
                  {
                    component: "img",
                    sx: {
                      width: "100%",
                      height: "auto"
                    },
                    src: "./images/goodwood_logo.png"
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxs(Box, { children: [
              /* @__PURE__ */ jsx(
                Typography,
                {
                  variant: "h5",
                  component: Link,
                  to: "/",
                  sx: {
                    fontWeight: 700,
                    color: "primary.main",
                    textDecoration: "none",
                    display: "block",
                    lineHeight: 1.2
                  },
                  children: t("header.title")
                }
              ),
              /* @__PURE__ */ jsx(
                Typography,
                {
                  variant: "body2",
                  color: "text.secondary",
                  sx: { mt: 0.5 },
                  children: t("header.tagline")
                }
              )
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsx(Box, { sx: { display: { xs: "flex", md: "none" }, flex: 1 }, children: /* @__PURE__ */ jsx(
        IconButton,
        {
          size: "large",
          "aria-label": "menu",
          onClick: handleOpenMobileMenu,
          color: "inherit",
          children: /* @__PURE__ */ jsx(MenuIcon, {})
        }
      ) }),
      /* @__PURE__ */ jsx(Box, { sx: { display: { xs: "flex", md: "none" }, flex: 1, justifyContent: "center" }, children: /* @__PURE__ */ jsx(
        Typography,
        {
          variant: "h6",
          component: Link,
          to: "/",
          sx: {
            fontWeight: 700,
            color: "primary.main",
            textDecoration: "none"
          },
          children: t("site.title")
        }
      ) }),
      /* @__PURE__ */ jsxs(
        Stack,
        {
          direction: "row",
          spacing: 1,
          sx: {
            display: { xs: "none", md: "flex" },
            alignItems: "center"
          },
          children: [
            pages.map((page) => /* @__PURE__ */ jsx(
              Button,
              {
                component: Link,
                to: page.path,
                sx: {
                  color: "text.primary",
                  px: 2,
                  "&:hover": {
                    backgroundColor: "grey.100"
                  }
                },
                children: t(`nav.${page.key}`)
              },
              page.key
            )),
            /* @__PURE__ */ jsx(
              IconButton,
              {
                onClick: handleOpenLangMenu,
                color: "inherit",
                size: "small",
                sx: { ml: 1 },
                children: /* @__PURE__ */ jsx(LanguageIcon, {})
              }
            ),
            /* @__PURE__ */ jsxs(
              Menu,
              {
                anchorEl: langMenuAnchor,
                open: Boolean(langMenuAnchor),
                onClose: handleCloseLangMenu,
                children: [
                  /* @__PURE__ */ jsx(
                    MenuItem,
                    {
                      onClick: () => changeLanguage("en"),
                      selected: i18n2.language === "en",
                      children: "English"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    MenuItem,
                    {
                      onClick: () => changeLanguage("fr"),
                      selected: i18n2.language === "fr",
                      children: "Français"
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "contained",
                component: Link,
                to: "/contact",
                sx: {
                  ml: 2,
                  backgroundColor: "#1a237e",
                  fontWeight: 600
                },
                children: t("nav.becomeAMason")
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsx(Box, { sx: { display: { xs: "flex", md: "none" } }, children: /* @__PURE__ */ jsx(IconButton, { onClick: handleOpenLangMenu, color: "inherit", size: "small", children: /* @__PURE__ */ jsx(LanguageIcon, {}) }) })
    ] }) }),
    /* @__PURE__ */ jsx(
      Drawer,
      {
        anchor: "left",
        open: mobileMenuOpen,
        onClose: handleCloseMobileMenu,
        children: /* @__PURE__ */ jsxs(Box, { sx: { width: 250, pt: 2 }, children: [
          /* @__PURE__ */ jsxs(Box, { sx: { px: 2, pb: 2, borderBottom: "1px solid", borderColor: "divider" }, children: [
            /* @__PURE__ */ jsx(Typography, { variant: "h6", color: "primary", fontWeight: 700, children: t("site.title") }),
            /* @__PURE__ */ jsx(Typography, { variant: "caption", color: "text.secondary", children: t("site.subtitle") })
          ] }),
          /* @__PURE__ */ jsxs(List, { children: [
            pages.map((page) => /* @__PURE__ */ jsx(ListItem, { disablePadding: true, children: /* @__PURE__ */ jsx(
              ListItemButton,
              {
                component: Link,
                to: page.path,
                onClick: handleCloseMobileMenu,
                children: /* @__PURE__ */ jsx(ListItemText, { primary: t(`nav.${page.key}`) })
              }
            ) }, page.key)),
            /* @__PURE__ */ jsx(ListItem, { disablePadding: true, children: /* @__PURE__ */ jsx(
              ListItemButton,
              {
                component: Link,
                to: "/contact",
                onClick: handleCloseMobileMenu,
                sx: {
                  mt: 2,
                  mx: 2,
                  backgroundColor: "#b71c1c",
                  color: "white",
                  borderRadius: 1,
                  "&:hover": {
                    backgroundColor: "#8b0000"
                  }
                },
                children: /* @__PURE__ */ jsx(ListItemText, { primary: t("nav.becomeAMason") })
              }
            ) })
          ] })
        ] })
      }
    )
  ] });
}
function Footer() {
  const { t } = useTranslation();
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  return /* @__PURE__ */ jsx(
    Box,
    {
      component: "footer",
      sx: {
        backgroundColor: "primary.main",
        color: "white",
        py: 6,
        mt: "auto"
      },
      children: /* @__PURE__ */ jsx(Container, { maxWidth: "lg", children: /* @__PURE__ */ jsxs(Stack, { spacing: 4, children: [
        /* @__PURE__ */ jsx(Box, { sx: { textAlign: "center" }, children: /* @__PURE__ */ jsxs(
          Box,
          {
            sx: {
              display: "inline-block",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              px: 4,
              py: 2,
              borderRadius: 1
            },
            children: [
              /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { fontStyle: "italic" }, children: "Ontario Masons Symbol/Wordmark" }),
              /* @__PURE__ */ jsx(Typography, { variant: "caption", sx: { opacity: 0.7 }, children: "(Required by Grand Lodge Policy)" })
            ]
          }
        ) }),
        /* @__PURE__ */ jsx(Divider, { sx: { backgroundColor: "rgba(255, 255, 255, 0.2)" } }),
        /* @__PURE__ */ jsxs(
          Stack,
          {
            direction: { xs: "column", sm: "row" },
            spacing: 2,
            justifyContent: "space-between",
            alignItems: "center",
            children: [
              /* @__PURE__ */ jsxs(Box, { sx: { textAlign: { xs: "center", sm: "left" } }, children: [
                /* @__PURE__ */ jsx(Typography, { variant: "h6", gutterBottom: true, children: t("site.title") }),
                /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { opacity: 0.8 }, children: t("site.subtitle") })
              ] }),
              /* @__PURE__ */ jsxs(
                Stack,
                {
                  direction: { xs: "column", sm: "row" },
                  spacing: 2,
                  alignItems: "center",
                  children: [
                    /* @__PURE__ */ jsx(
                      Typography,
                      {
                        component: Link,
                        to: "/privacy",
                        sx: {
                          color: "white",
                          textDecoration: "none",
                          "&:hover": {
                            textDecoration: "underline"
                          }
                        },
                        children: t("footer.privacyPolicy")
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      Typography,
                      {
                        component: Link,
                        to: "/terms",
                        sx: {
                          color: "white",
                          textDecoration: "none",
                          "&:hover": {
                            textDecoration: "underline"
                          }
                        },
                        children: t("footer.termsOfUse")
                      }
                    )
                  ]
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsx(Divider, { sx: { backgroundColor: "rgba(255, 255, 255, 0.2)" } }),
        /* @__PURE__ */ jsx(
          Typography,
          {
            variant: "body2",
            align: "center",
            sx: { opacity: 0.8 },
            children: t("footer.copyright", { year: currentYear })
          }
        )
      ] }) })
    }
  );
}
function Layout({
  children
}) {
  return /* @__PURE__ */ jsxs("html", {
    lang: "en",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      }), /* @__PURE__ */ jsx("title", {
        children: "Goodwood Lodge No. 159"
      }), /* @__PURE__ */ jsx("link", {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png"
      }), /* @__PURE__ */ jsx("link", {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png"
      }), /* @__PURE__ */ jsx("link", {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png"
      }), /* @__PURE__ */ jsx("link", {
        rel: "manifest",
        href: "/site.webmanifest"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {})]
    }), /* @__PURE__ */ jsxs("body", {
      children: [/* @__PURE__ */ jsxs(ThemeProvider, {
        theme,
        children: [/* @__PURE__ */ jsx(CssBaseline, {}), children]
      }), /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
}
const root = UNSAFE_withComponentProps(function App() {
  return /* @__PURE__ */ jsxs(Box, {
    sx: {
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh"
    },
    children: [/* @__PURE__ */ jsx(Header, {}), /* @__PURE__ */ jsx(Box, {
      component: "main",
      sx: {
        flex: 1
      },
      children: /* @__PURE__ */ jsx(Outlet, {})
    }), /* @__PURE__ */ jsx(Footer, {})]
  });
});
const ErrorBoundary = UNSAFE_withErrorBoundaryProps(function ErrorBoundary2({
  error
}) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack;
  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  }
  return /* @__PURE__ */ jsx(Container, {
    maxWidth: "lg",
    sx: {
      pt: 8,
      pb: 4
    },
    children: /* @__PURE__ */ jsxs(Box, {
      children: [/* @__PURE__ */ jsx(Typography, {
        variant: "h1",
        gutterBottom: true,
        children: message
      }), /* @__PURE__ */ jsx(Typography, {
        variant: "body1",
        paragraph: true,
        children: details
      }), stack]
    })
  });
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  Layout,
  default: root
}, Symbol.toStringTag, { value: "Module" }));
function meta({}) {
  return [{
    title: "Goodwood Lodge No. 159"
  }, {
    name: "description",
    content: "Grand Lodge of A.F. & A.M. of Canada in the Province of Ontario"
  }];
}
const home = UNSAFE_withComponentProps(function Home() {
  const {
    t
  } = useTranslation();
  return /* @__PURE__ */ jsx(Container, {
    maxWidth: "lg",
    children: /* @__PURE__ */ jsxs(Box, {
      sx: {
        py: 8
      },
      children: [/* @__PURE__ */ jsxs(Box, {
        sx: {
          textAlign: "center",
          mb: 6
        },
        children: [/* @__PURE__ */ jsx(Typography, {
          variant: "h3",
          gutterBottom: true,
          children: t("home.welcome")
        }), /* @__PURE__ */ jsx(Typography, {
          variant: "body1",
          paragraph: true,
          sx: {
            maxWidth: 800,
            mx: "auto",
            fontSize: "1.1rem"
          },
          children: t("home.description")
        })]
      }), /* @__PURE__ */ jsxs(Stack, {
        direction: {
          xs: "column",
          sm: "row"
        },
        spacing: 2,
        justifyContent: "center",
        sx: {
          mb: 6
        },
        children: [/* @__PURE__ */ jsx(Button, {
          variant: "contained",
          size: "large",
          children: t("home.learnMore")
        }), /* @__PURE__ */ jsx(Button, {
          variant: "outlined",
          size: "large",
          children: t("home.contactUs")
        })]
      })]
    })
  });
});
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: home,
  meta
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-Baay878O.js", "imports": ["/assets/chunk-WWGJGFF6-NN2lIy5W.js", "/assets/index-C-_o-WMD.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": true, "module": "/assets/root-jALdpYLh.js", "imports": ["/assets/chunk-WWGJGFF6-NN2lIy5W.js", "/assets/index-C-_o-WMD.js", "/assets/useTranslation-D28BrEFh.js"], "css": ["/assets/root-B7z7xtvc.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/home": { "id": "routes/home", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/home-CVLfX_9T.js", "imports": ["/assets/chunk-WWGJGFF6-NN2lIy5W.js", "/assets/useTranslation-D28BrEFh.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-63bd06ef.js", "version": "63bd06ef", "sri": void 0 };
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "unstable_optimizeDeps": false, "unstable_subResourceIntegrity": false, "v8_middleware": false, "v8_splitRouteModules": false, "v8_viteEnvironmentApi": false };
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/home": {
    id: "routes/home",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route1
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  prerender,
  publicPath,
  routeDiscovery,
  routes,
  ssr
};
