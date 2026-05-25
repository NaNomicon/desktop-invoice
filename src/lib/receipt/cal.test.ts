import { describe, it, expect } from 'vitest';
import { cal } from './cal';

describe('receipt cal()', () => {
  it('settled: payment equals balance → 0', () => {
    const result = cal({ load_dua_amount: 100000, amount_received: 100000 });
    expect(result.new_due).toBe(0);
    expect(result.ad_due).toBe('');
    expect(result.cr_dr).toBe('');
  });

  it('partial payment: due_amount > 0 → Dr.', () => {
    const result = cal({ load_dua_amount: 100000, amount_received: 50000 });
    expect(result.new_due).toBe(50000);
    expect(result.ad_due).toBe('Due');
    expect(result.cr_dr).toBe('Dr.');
  });

  it('overpayment: due_amount < 0 → Cr.', () => {
    const result = cal({ load_dua_amount: 100000, amount_received: 150000 });
    expect(result.new_due).toBe(-50000);
    expect(result.ad_due).toBe('Advance');
    expect(result.cr_dr).toBe('Cr.');
  });

  it('advance customer fully settled', () => {
    const result = cal({ load_dua_amount: -50000, amount_received: -50000 });
    expect(result.new_due).toBe(0);
    expect(result.ad_due).toBe('');
    expect(result.cr_dr).toBe('');
  });

  it('advance customer receiving more advance → Cr.', () => {
    const result = cal({ load_dua_amount: -20000, amount_received: 10000 });
    expect(result.new_due).toBe(-30000);
    expect(result.ad_due).toBe('Advance');
    expect(result.cr_dr).toBe('Cr.');
  });

  it('zero payment on due → unchanged', () => {
    const result = cal({ load_dua_amount: 75000, amount_received: 0 });
    expect(result.new_due).toBe(75000);
    expect(result.ad_due).toBe('Due');
    expect(result.cr_dr).toBe('Dr.');
  });
});
