# Pages (`src/pages/`)

Page-level route components for XPress Billing.

Each page represents an application view/screen. Pages compose UI components and connect to stores/services.

## Patterns

- Pages are top-level route destinations
- Each page handles its own data fetching via TanStack Query or Tauri commands
- Pages should be lazy-loaded for performance
- Keep page components focused on layout/composition — delegate logic to hooks/services
