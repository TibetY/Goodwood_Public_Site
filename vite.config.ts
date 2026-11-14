import { reactRouter } from "@react-router/dev/vite";
import netlifyPlugin from "@netlify/vite-plugin-react-router";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), netlifyPlugin(), tsconfigPaths()],
  // A fixed, project-specific port (netlify.toml's targetPort points here).
  // strictPort makes Vite fail loudly if it's taken, instead of silently
  // moving to another port while `netlify dev` proxies whatever is on 5180.
  server: { port: 5180, strictPort: true },
});
