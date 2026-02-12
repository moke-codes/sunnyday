/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BSKY_FEEDGEN_DID?: string;
  readonly VITE_FEEDGEN_URL?: string;
  readonly VITE_FEEDGEN_SECRET?: string;
}
