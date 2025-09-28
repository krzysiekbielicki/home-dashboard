/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_CONFIG: string
  readonly VITE_VAPID_PUBLIC_KEY: string
  // more env variables can be added here
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
