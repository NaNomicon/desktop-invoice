# Stores (`src/stores/`)

Zustand state stores for global UI state in XPress Billing.

## State Management Onion

```
useState (component) → Zustand (global UI) → TanStack Query (persistent data)
```

## Zustand Patterns

- **Use selector syntax** to prevent unnecessary re-renders:
  ```typescript
  // ✅ GOOD
  const value = useStore(state => state.value)

  // ❌ BAD — destructuring causes render cascades
  const { value } = useStore()
  ```

- **Use `getState()` in callbacks** for current state without subscriptions:
  ```typescript
  const { data, setData } = useStore.getState()
  ```

- Each store file exports one Zustand store
- Keep stores small and focused — one concern per store
