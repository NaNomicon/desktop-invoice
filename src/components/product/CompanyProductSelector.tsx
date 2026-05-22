import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { query } from '@/lib/db';
import type { Product, Company } from '@/lib/types';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CompanyProductSelectorProps {
  /** "ALL" to show all company dropdowns, or company_id as string for single-company */
  companyFilter: string;
  /** Called when a product is selected from any company dropdown */
  onAddProduct: (product: Product, companyId: number) => void;
}

export function CompanyProductSelector({
  companyFilter: initialFilter,
  onAddProduct,
}: CompanyProductSelectorProps) {
  const [filter, setFilter] = useState(initialFilter);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies', 'active'],
    queryFn: () =>
      query<Company>(
        'SELECT id, company_name FROM tbl_company WHERE is_active = 1 ORDER BY company_name',
      ),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'by-company', filter],
    queryFn: () => {
      if (filter === 'ALL') {
        // Pre-fetch all products; filtered client-side per dropdown
        return query<Product>(
          'SELECT id, product_name, company_id, price FROM tbl_product WHERE is_deleted = 0 ORDER BY product_name',
        );
      }
      return query<Product>(
        'SELECT id, product_name, company_id, price FROM tbl_product WHERE company_id = ? AND is_deleted = 0 ORDER BY product_name',
        [parseInt(filter, 10)],
      );
    },
    enabled: companies.length > 0,
  });

  const productsForCompany = (companyId: number) =>
    products.filter((p) => p.company_id === companyId);

  const companyLabel = (c: Company) => c.company_name ?? `Company ${c.id}`;

  if (companies.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No active companies found.</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Company filter */}
      <div className="space-y-1.5">
        <Label>Company Filter</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ALL</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {companyLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product dropdowns */}
      {filter === 'ALL' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {companies.map((company) => (
            <div key={company.id} className="space-y-1.5">
              <Label>{companyLabel(company)}</Label>
              <Select
                onValueChange={(v: string) => {
                  const product = products.find((p) => p.id === parseInt(v, 10));
                  if (product) onAddProduct(product, company.id);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product…" />
                </SelectTrigger>
                <SelectContent>
                  {productsForCompany(company.id).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label>
            {companyLabel(
              companies.find((c) => c.id === parseInt(filter, 10)) ??
                ({ id: parseInt(filter, 10), company_name: null } as Company),
            )}
          </Label>
          <Select
            onValueChange={(v: string) => {
              const product = products.find((p) => p.id === parseInt(v, 10));
              if (product) onAddProduct(product, parseInt(filter, 10));
            }}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Select product…" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.product_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export default CompanyProductSelector;
