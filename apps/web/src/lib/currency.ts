/**
 * Global Currency Formatting & Utilities
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  BDT: "৳",
  CAD: "CA$",
  AUD: "AU$",
  JPY: "¥",
};

export const CURRENCY_OPTIONS = [
  { code: "USD", symbol: "$", label: "USD ($)" },
  { code: "EUR", symbol: "€", label: "EUR (€)" },
  { code: "GBP", symbol: "£", label: "GBP (£)" },
  { code: "BDT", symbol: "৳", label: "BDT (৳)" },
  { code: "CAD", symbol: "CA$", label: "CAD ($)" },
  { code: "AUD", symbol: "AU$", label: "AUD ($)" },
  { code: "JPY", symbol: "¥", label: "JPY (¥)" },
];

/**
 * Returns the currency symbol for a given currency code.
 */
export function getCurrencySymbol(currency: string = "USD"): string {
  const cleanCode = (currency || "USD").toUpperCase();
  if (CURRENCY_SYMBOLS[cleanCode]) {
    return CURRENCY_SYMBOLS[cleanCode];
  }

  try {
    const parts = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cleanCode,
    }).formatToParts(0);
    const currencyPart = parts.find((p) => p.type === "currency");
    return currencyPart ? currencyPart.value : cleanCode;
  } catch {
    return cleanCode;
  }
}

/**
 * Formats a monetary amount using the specified currency code.
 * E.g.: formatCurrency(120, "EUR") -> "€120.00"
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = "USD"
): string {
  const numericAmount =
    typeof amount === "number" ? amount : Number(amount || 0);

  if (isNaN(numericAmount)) {
    const sym = getCurrencySymbol(currency);
    return `${sym}0.00`;
  }

  const cleanCode = (currency || "USD").toUpperCase();

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cleanCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    const sym = getCurrencySymbol(cleanCode);
    return `${sym}${numericAmount.toFixed(2)}`;
  }
}
