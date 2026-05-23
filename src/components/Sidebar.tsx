import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-muted/30 p-4">
      <h2 className="mb-4 text-lg font-semibold">XPress Billing</h2>
      <nav className="space-y-1 text-sm">
        <Link to="/invoices" className="block rounded px-2 py-1 hover:bg-accent">Invoices</Link>
        <Link to="/quotations" className="block rounded px-2 py-1 hover:bg-accent">Quotations</Link>
        <Link to="/receipts/new" className="block rounded px-2 py-1 hover:bg-accent">Receipts</Link>
        <Link to="/outstanding" className="block rounded px-2 py-1 hover:bg-accent">Outstanding</Link>
        <Link to="/history" className="block rounded px-2 py-1 hover:bg-accent">History</Link>
        <hr className="my-2" />
        <Link to="/customers" className="block rounded px-2 py-1 hover:bg-accent">Customers</Link>
        <Link to="/products" className="block rounded px-2 py-1 hover:bg-accent">Products</Link>
        <Link to="/companies" className="block rounded px-2 py-1 hover:bg-accent">Companies</Link>
        <hr className="my-2" />
        <Link to="/reports/sales" className="block rounded px-2 py-1 hover:bg-accent">Sales Report</Link>
        <Link to="/settings" className="block rounded px-2 py-1 hover:bg-accent">Settings</Link>
      </nav>
    </aside>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}