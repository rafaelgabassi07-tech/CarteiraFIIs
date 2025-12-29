// FIX: Removed /// <reference types="vite/client" /> to resolve "Cannot find type definition file" error.
// The interfaces below provide the necessary types for import.meta.env.

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly VITE_BRAPI_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}