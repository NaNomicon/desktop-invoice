import { describe, it, expect } from 'vitest';
import { quoCal } from './cal';

describe('quoCal()', () => {
  it('identity: no VAT, no discount', () => {
    const result = quoCal({ sub_total: 100000, isvat: 0, vat_per: 0, per: 0 });
    expect(result.new_tot).toBe(100000);
    expect(result.vat).toBe(0);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(100000);
  });

  it('VAT only: 5% VAT on sub_total', () => {
    const result = quoCal({ sub_total: 100000, isvat: 1, vat_per: 500, per: 0 });
    expect(result.new_tot).toBe(100000);
    expect(result.vat).toBe(5000);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(105000);
  });

  it('Discount: 10% on (sub_total + vat)', () => {
    const result = quoCal({ sub_total: 100000, isvat: 1, vat_per: 500, per: 10 });
    expect(result.new_tot).toBe(100000);
    expect(result.vat).toBe(5000);
    expect(result.discount).toBe(10500);
    expect(result.total).toBe(94500);
  });

  it('Discount only, no VAT', () => {
    const result = quoCal({ sub_total: 100000, isvat: 0, vat_per: 0, per: 15 });
    expect(result.new_tot).toBe(100000);
    expect(result.vat).toBe(0);
    expect(result.discount).toBe(15000);
    expect(result.total).toBe(85000);
  });

  it('per=0 returns zero discount (user-editable in form)', () => {
    const result = quoCal({ sub_total: 100000, isvat: 1, vat_per: 500, per: 0 });
    expect(result.new_tot).toBe(100000);
    expect(result.vat).toBe(5000);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(105000);
  });
});
