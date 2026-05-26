export interface ReceiptCalInput {
  load_dua_amount: number; // INTEGER cents — current customer balance (positive=due, negative=advance)
  amount_received: number; // INTEGER cents — payment amount
}

export interface ReceiptCalResult {
  new_due: number; // INTEGER cents — remaining balance after payment
  ad_due: string; // 'Due' | 'Advance' | ''
  cr_dr: string; // 'Dr.' | 'Cr.' | ''
}

export function cal(input: ReceiptCalInput): ReceiptCalResult {
  const { load_dua_amount, amount_received } = input;
  const new_due = load_dua_amount - amount_received;

  let ad_due: string;
  let cr_dr: string;

  // cr_dr is determined by comparing load_dua_amount to amount_received
  // (the pre-load status determines the direction)
  if (load_dua_amount < 0) {
    // Pre-load was Advance (negative sign = advance)
    // Paying down advance always creates credit
    cr_dr = 'Cr.';
  } else if (load_dua_amount > 0) {
    // Pre-load was Due (positive sign = due)
    // If paying more than owed → creates advance (Cr.)
    // If paying equal or less → still/recently due (Dr.)
    if (amount_received > load_dua_amount) {
      cr_dr = 'Cr.';
    } else {
      cr_dr = 'Dr.';
    }
  } else {
    // load_dua_amount is 0 and amount_received > 0 → advance from zero
    cr_dr = 'Cr.';
  }

  // ad_due is determined by the resulting new_due
  if (new_due > 0) {
    ad_due = 'Due';
  } else if (new_due < 0) {
    ad_due = 'Advance';
  } else {
    ad_due = '';
  }

  return { new_due, ad_due, cr_dr };
}
