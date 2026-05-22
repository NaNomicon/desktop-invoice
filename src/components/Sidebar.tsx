import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-muted/30 p-4">
      <h2 className="mb-4 text-lg font-semibold">XPress Billing</h2>
      <nav className="space-y-1 text-sm">
        {/* Navigation items will be added later */}
      </nav>
    </aside>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  useAuthStore();
  return <>{children}</>;
}