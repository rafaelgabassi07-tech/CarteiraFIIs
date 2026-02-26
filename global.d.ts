
/// <reference types="vite/client" />

export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
      BRAPI_TOKEN: string;
      SCRAPER_API_KEY?: string;
      [key: string]: string | undefined;
    }
  }
}
