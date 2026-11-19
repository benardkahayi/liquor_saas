import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Default Vite binds to the IPv6 loopback ([::1]) only. lvh.me (and any
    // *.lvh.me subdomain) resolves to the IPv4 loopback (127.0.0.1), so
    // without this the dev server refuses the connection outright — "host"
    // here means "listen on every local interface", not a hostname.
    host: true,
    // Vite blocks requests with an unrecognized Host header by default.
    // Tenant subdomains use lvh.me in dev (see .env / backend/.env for why
    // it's lvh.me and not localhost) — every "*.lvh.me" host needs to be
    // allowed here too. src/lib/tenantHost.ts is what tells subdomains apart.
    allowedHosts: ['localhost', '.localhost', 'lvh.me', '.lvh.me'],
  },
})
