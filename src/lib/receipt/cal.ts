export interface ReceiptCalInput {
  load_dua_amount: number; // INTEGER cents — current customer balance (positive=due, negative=advance)
  amount_received: number; // INTEGER cents — payment amount
}

export interface ReceiptCalResult {
  new_due: number; // INTEGER cents — remaining balance after payment
  ad_due: string; // 'Due' | 'Advance' | ''
  cr_dr: string; // 'Dr.' | 'Cr.' | ''
}

/**
 * Receipt calculation: new_due = load_dua_amount - amount_received
 *
 * cr_dr (INVERSE accounting):
 *   new_due > 0  → "Dr."  (customer owes money)
 *   new_due < 0  → "Cr."  (customer has advance credit)
 *   new_due = 0  → ""     (settled)
 *
 * ad_due:
 *   new_due > 0  → "Due"
 *   new_due < 0  → "Advance"
 *   new_due = 0  → ""     (settled)
 */
export function cal(input: ReceiptCalInput): ReceiptCalResult {
  const new_due = input.load_dua_amount - input.amount_received;

  let ad_due: string;
  let cr_dr: string;

  if (new_due > 0) {
    ad_due = 'Due';
    cr_dr = 'Dr.';
  } else if (new_due < 0) {
    ad_due = 'Advance';
    cr_dr = 'Cr.';
  } else {
    ad_due = '';
    cr_dr = '';
  }

  return { new_due, ad_due, cr_dr };
}
