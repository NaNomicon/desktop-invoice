export interface CurrencyOption {
  value: string
  label: string
}

export const CURRENCIES: CurrencyOption[] = [
  { value: 'Rs', label: 'Rs — Mauritian Rupee' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'ZAR', label: 'ZAR — South African Rand' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
  { value: 'AUD', label: 'AUD — Australian Dollar' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'CHF', label: 'CHF — Swiss Franc' },
  { value: 'JPY', label: 'JPY — Japanese Yen' },
  { value: 'CNY', label: 'CNY — Chinese Yuan' },
]

export const DEFAULT_CURRENCY = 'Rs'

export function formatMoney(cents: number, currencySymbol: string = DEFAULT_CURRENCY): string {
  const amount = (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${currencySymbol} ${amount}`
}

export function toDecimal(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function parseCents(value: string | number): number {
  return Math.round(Number(value) * 100)
}
