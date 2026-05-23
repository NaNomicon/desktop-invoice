# Components (`src/components/`)

Reusable UI components for XPress Billing.

## Component Types

- **shadcn/ui components**: Radix UI primitives with Tailwind styling (buttons, dialogs, dropdowns, etc.)
- **Custom components**: App-specific reusable components
- **Layout components**: Page shells, navigation bars, sidebars

## Patterns

- Use `class-variance-authority` for component variants
- `cn()` utility (clsx + tailwind-merge) for className merging
- All components use TypeScript with proper prop types
- Prefer function components with React 19 patterns
