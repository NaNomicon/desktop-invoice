export interface CalInput {
  sub_total: number;
  ad_due: string;
  amount_due: number;
  isvat: number;
  vat_per: number;
  per: number;
}

export interface CalResult {
  new_tot: number;
  vat: number;
  discount: number;
  total: number;
}

export function cal(input: CalInput): CalResult {
  let new_tot = input.sub_total;
  if (input.ad_due === 'Advance') {
    new_tot = input.sub_total - input.amount_due;
  } else if (input.ad_due === 'Due') {
    new_tot = input.sub_total + input.amount_due;
  }

  let vat = 0;
  if (input.isvat === 1) {
    vat = Math.round(Math.abs(input.sub_total) * input.vat_per / 10000);
  }

  let discount = 0;
  if (input.per > 0) {
    discount = Math.round(Math.abs(input.sub_total + vat) * input.per / 100);
  }

  const total = new_tot + vat - discount;

  return { new_tot, vat, discount, total };
}
