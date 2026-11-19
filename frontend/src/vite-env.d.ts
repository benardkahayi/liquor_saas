/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_DOMAIN: string;
  readonly VITE_USE_SUBDOMAINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
