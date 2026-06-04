import { useState, useMemo } from 'react';
import { ChevronsUpDown, Check, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { formatMoney, parseCents, toDecimal } from '@/lib/currency';
import type { Product } from '@/lib/types';
import type { BillingLineItem } from './lineItems';

export interface ProductRowProps {
  li: BillingLineItem;
  idx: number;
  companyProducts: Product[];
  currency: string;
  priceEditable?: boolean;
  onProductSelect: (product: Product) => void;
  onQtyChange: (qty: number) => void;
  onPriceChange?: (price: number) => void;
  onDelete: () => void;
  onCreateProduct?: () => void;
}

export function ProductRow({
  li,
  idx,
  companyProducts,
  currency,
  priceEditable = false,
  onProductSelect,
  onQtyChange,
  onPriceChange,
  onDelete,
  onCreateProduct,
}: ProductRowProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? companyProducts.filter(
          (p) =>
            (p.product_name ?? '').toLowerCase().includes(q) ||
            (p.product_id ?? '').toLowerCase().includes(q),
        )
      : companyProducts;
    return list.slice(0, 50);
  }, [search, companyProducts]);

  return (
    <tr className={`border-t hover:bg-muted/30 ${li.deleted ? 'bg-muted/20 opacity-50' : ''}`}>
      <td className="px-3 py-1.5 text-muted-foreground">{idx + 1}</td>
      <td className="px-3 py-1.5">
        {li.deleted ? (
          <span className="text-muted-foreground">{li.product_name || '-'}</span>
        ) : (
          <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="h-8 w-48 justify-between font-normal"
              >
                <span className="truncate">{li.product_name || 'Select product...'}</span>
                <ChevronsUpDown className="ms-2 size-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search product..."
                    value={search}
                    onValueChange={setSearch}
                  />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>No product found.</CommandEmpty>
                    <CommandGroup>
                      {filtered.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={`${p.product_id ?? ''} ${p.product_name}`}
                          onSelect={() => {
                            onProductSelect(p);
                            setSearch('');
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn('me-2 size-4', li.product_id === p.id ? 'opacity-100' : 'opacity-0')}
                          />
                          <span className="flex-1 truncate">{p.product_name}</span>
                          <span className="ms-2 text-xs text-muted-foreground">{formatMoney(p.price, currency)}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                  {onCreateProduct && (
                    <div className="border-t">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          setOpen(false);
                          setSearch('');
                          onCreateProduct();
                        }}
                      >
                        <Plus className="size-4" />
                        Create new product
                      </button>
                    </div>
                  )}
                </Command>
            </PopoverContent>
          </Popover>
        )}
      </td>
      <td className="px-3 py-1.5">
        {li.deleted ? (
          <span className="text-muted-foreground">{li.qty}</span>
        ) : (
          <Input
            type="number"
            min="0"
            step="1"
            className="h-8 w-20"
            value={li.qty}
            onChange={(e) => onQtyChange(parseInt(e.target.value) || 0)}
          />
        )}
      </td>
      <td className="px-3 py-1.5">
        {li.deleted ? (
          <span className="text-muted-foreground">{formatMoney(li.unit_price, currency)}</span>
        ) : priceEditable ? (
          <Input
            type="number"
            min="0"
            step="0.01"
            className="h-8 w-28"
            value={toDecimal(li.unit_price)}
            onChange={(e) => onPriceChange?.(parseCents(e.target.value))}
          />
        ) : (
          <span>{formatMoney(li.unit_price, currency)}</span>
        )}
      </td>
      <td className="px-3 py-1.5 font-medium">{formatMoney(li.row_total, currency)}</td>
      <td className="px-3 py-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          className={li.deleted ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </td>
    </tr>
  );
}
