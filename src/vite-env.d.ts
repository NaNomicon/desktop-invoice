/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_META_ACCESS_TOKEN?: string
  readonly VITE_META_PHONE_NUMBER_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}