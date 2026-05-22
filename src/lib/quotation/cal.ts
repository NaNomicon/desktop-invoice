export interface QuoCalInput {
  sub_total: number;
  isvat: number;
  vat_per: number;
  per: number;
}

export interface QuoCalResult {
  new_tot: number;
  vat: number;
  discount: number;
  total: number;
}

/**
 * Quotation calculation.
 * Unlike invoices, quotations have NO advance/due adjustment.
 * new_tot = sub_total always.
 * Discount when per>0: discount = (new_tot + vat) * per / 100.
 * When per=0: discount=0 (user-editable in form, not auto-calculated).
 */
export function quoCal(input: QuoCalInput): QuoCalResult {
  const new_tot = input.sub_total;

  let vat = 0;
  if (input.isvat === 1) {
    vat = Math.round(Math.abs(new_tot) * input.vat_per / 10000);
  }

  let discount = 0;
  if (input.per > 0) {
    discount = Math.round(Math.abs(new_tot + vat) * input.per / 100);
  }

  const total = new_tot + vat - discount;

  return { new_tot, vat, discount, total };
}
