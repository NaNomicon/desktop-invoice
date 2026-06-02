import type { Customer } from '@/lib/types';

export function filterCustomers(customers: Customer[], query: string): Customer[] {
  const q = query.trim().toLowerCase();
  if (!q) return customers;
  return customers.filter((c) => {
    return (
      c.customer_name.toLowerCase().includes(q) ||
      (c.title_name?.toLowerCase().includes(q) ?? false) ||
      (c.telephone?.toLowerCase().includes(q) ?? false) ||
      (c.contact?.toLowerCase().includes(q) ?? false) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.address?.toLowerCase().includes(q) ?? false)
    );
  });
}
