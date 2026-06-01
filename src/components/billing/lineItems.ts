let _uid = 1;
export function nextUid(prefix = 'li'): string {
  return `${prefix}-${_uid++}`;
}

export interface BillingLineItem {
  uid: string;
  id: number;
  qty: number;
  product_id: number | null;
  product_name: string;
  unit_price: number;
  row_total: number;
  s_no: number;
  deleted: boolean;
  company_id: number | null;
}

export function createBlankLineItems(companyIds: number[] = []): BillingLineItem[] {
  if (companyIds.length === 0) {
    return [{
      uid: nextUid(), id: 0, qty: 1, product_id: null,
      product_name: '', unit_price: 0, row_total: 0,
      s_no: 1, deleted: false, company_id: null,
    }];
  }
  return companyIds.map((cid, i) => ({
    uid: nextUid(), id: 0, qty: 1, product_id: null,
    product_name: '', unit_price: 0, row_total: 0,
    s_no: i + 1, deleted: false, company_id: cid,
  }));
}
