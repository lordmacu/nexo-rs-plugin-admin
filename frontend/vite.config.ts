import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

// Vite proxies `/api/*` requests (admin RPC + firehose backfill +
// SSE stream) to the Rust microapp running on `127.0.0.1:$PORT`
// during development. The port defaults to 8765 (matches the
// backend's internal default in src/http/mod.rs) but can be
// overridden via `VITE_BACKEND_PORT` so `scripts/dev-tunnels.sh`
// can pin both sides to the same value when 8765 is busy.
//
// Production bundle (M2.c) is served by the same Rust process
// via `tower_http::ServeDir`, eliminating the proxy.
const backendPort = process.env.VITE_BACKEND_PORT
  ? Number(process.env.VITE_BACKEND_PORT)
  : 8765;

export default defineConfig({
  plugins: [react()],
  // Phase 83.13 MVP — alias the sibling repo's source so HMR
  // works cross-package during local dev. The runtime swap from
  // `file:` resolution to npm-published version is transparent
  // because the alias maps to the SAME source files in both
  // cases (npm publishes `src/` directly per the lib's exports
  // map).
  resolve: {
    alias: {
      "@lordmacu/nexo-microapp-ui-react": resolve(
        __dirname,
        "../../nexo-rs-microapp-ui-react/src",
      ),
    },
  },
  server: {
    port: 5173,
    // Vite 5+ rejects requests with `Host` headers it doesn't
    // recognise (defence against DNS rebinding). When the dev
    // server is reached through a cloudflared / ngrok tunnel
    // the host becomes `*.trycloudflare.com` and the default
    // allowlist (`localhost`, `127.0.0.1`) refuses the request
    // with `Blocked request. This host is not allowed.`.
    //
    // Allow the common quick-tunnel hosts so
    // `scripts/dev-tunnels.sh` works out of the box. Add `true`
    // to permit any host if you need a custom tunnel domain.
    allowedHosts: [
      ".trycloudflare.com",
      ".ngrok-free.app",
      ".loca.lt",
      // Named cloudflared tunnel routed in `dev-daemon.sh` when
      // `--dev-frontend` (now the default) is set.
      "agent.comparadorinternet.co",
      ".comparadorinternet.co",
    ],
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
