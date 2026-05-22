import { describe, it, expect } from 'vitest';
import { cal } from './cal';

describe('cal()', () => {
  it('identity: no VAT, no discount, no advance/due', () => {
    const result = cal({ sub_total: 100000, ad_due: '', amount_due: 0, isvat: 0, vat_per: 0, per: 0 });
    expect(result.new_tot).toBe(100000);
    expect(result.vat).toBe(0);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(100000);
  });

  it('VAT only: 5% VAT on sub_total', () => {
    const result = cal({ sub_total: 100000, ad_due: '', amount_due: 0, isvat: 1, vat_per: 500, per: 0 });
    expect(result.new_tot).toBe(100000);
    expect(result.vat).toBe(5000);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(105000);
  });

  it('Advance: amount_due reduces new_tot', () => {
    const result = cal({ sub_total: 100000, ad_due: 'Advance', amount_due: 20000, isvat: 0, vat_per: 0, per: 0 });
    expect(result.new_tot).toBe(80000);
    expect(result.vat).toBe(0);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(80000);
  });

  it('Due: amount_due adds to new_tot', () => {
    const result = cal({ sub_total: 100000, ad_due: 'Due', amount_due: 15000, isvat: 0, vat_per: 0, per: 0 });
    expect(result.new_tot).toBe(115000);
    expect(result.vat).toBe(0);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(115000);
  });

  it('Discount: 10% on (new_tot + vat)', () => {
    const result = cal({ sub_total: 100000, ad_due: '', amount_due: 0, isvat: 1, vat_per: 500, per: 10 });
    expect(result.new_tot).toBe(100000);
    expect(result.vat).toBe(5000);
    expect(result.discount).toBe(10500);
    expect(result.total).toBe(94500);
  });

  it('Combined: advance + VAT + discount', () => {
    const result = cal({ sub_total: 100000, ad_due: 'Advance', amount_due: 10000, isvat: 1, vat_per: 500, per: 5 });
    expect(result.new_tot).toBe(90000);
    expect(result.vat).toBe(4500);
    expect(result.discount).toBe(4725);
    expect(result.total).toBe(89775);
  });
});