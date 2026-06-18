// Post-build prerender step.
//
// React Router's built-in `prerender` config is incompatible with
// @netlify/vite-plugin-react-router (the plugin rewrites the SSR rollup input,
// so the prerenderer can't locate the server build). Instead we render the
// static / client-fetched public routes through the freshly built server and
// write the HTML into the publish dir (build/client). The generated Netlify
// function is configured with `preferStatic: true`, so Netlify serves these
// static files straight from the CDN and never invokes the function for them —
// which is where the bulk of our function usage was coming from (bots crawling
// these pages).
//
// Data-driven routes (officers, committees, past-masters, photos) use
// request-time loaders and are deliberately NOT prerendered so their content
// stays live without a redeploy.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Purely static / client-fetched pages. A failure here is a real bug, so the
// build should fail rather than ship a broken page.
const STATIC_ROUTES = ['/', '/history', '/events', '/contact', '/thank-you'];

// Data-driven pages whose content changes about once a year. Their loaders run
// at build time and the data is baked into static HTML — it refreshes on the
// next deploy. These are TOLERANT: if a loader errors at build time (e.g. a
// transient Supabase outage) the page is skipped and the serverless function
// serves it dynamically instead, so the overall build still succeeds.
//
// NOTE: because the data is baked at build time, edits made through the portal
// won't appear on these public pages until the site is redeployed.
const DATA_ROUTES = ['/officers', '/committees', '/past-masters'];

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(projectRoot, 'build', 'client');
const serverBuildPath = join(projectRoot, 'build', 'server', 'server.js');

// The built server handler references a `Netlify` global (request context).
// It isn't present outside the Netlify runtime, so stub it for the build step.
globalThis.Netlify ??= { context: {} };

// build/server/server.js's default export is the Netlify request handler
// produced by @netlify/vite-plugin-react-router: (Request, context) => Response.
const { default: handler } = await import(pathToFileURL(serverBuildPath).href);

async function prerender(route, { tolerant }) {
    const request = new Request(`https://goodwood159.ca${route}`, {
        headers: { Accept: 'text/html' },
    });

    const response = await handler(request);
    if (response.status !== 200) {
        const message = `Prerender failed for ${route}: HTTP ${response.status}`;
        if (tolerant) {
            console.warn(`⚠️  ${message} — skipping (will be served dynamically)`);
            return false;
        }
        throw new Error(message);
    }

    const html = await response.text();
    const filePath = route === '/'
        ? join(outDir, 'index.html')
        : join(outDir, route.replace(/^\//, ''), 'index.html');

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, html, 'utf8');
    console.log(`prerendered ${route} -> ${filePath.replace(projectRoot + '/', '')}`);
    return true;
}

let count = 0;
for (const route of STATIC_ROUTES) {
    if (await prerender(route, { tolerant: false })) count++;
}
for (const route of DATA_ROUTES) {
    if (await prerender(route, { tolerant: true })) count++;
}

console.log(`\nPrerendered ${count} of ${STATIC_ROUTES.length + DATA_ROUTES.length} routes.`);

// The bundled server build leaves open handles (e.g. Supabase client sockets)
// that would otherwise keep this process alive and hang the build. Exit now
// that all routes have been written.
process.exit(0);
