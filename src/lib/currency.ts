/**
 * Formats a raw numeric string into Brazilian Real (R$ 0,00).
 * Accepts only digits; inserts comma for cents automatically.
 */
export function formatBRL(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  const value = (cents / 100).toFixed(2);
  const [intPart, decPart] = value.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${formattedInt},${decPart}`;
}

/**
 * Handles onChange for a currency input, keeping only digits internally
 * and formatting as R$ X.XXX,XX.
 */
export function handleCurrencyChange(
  rawValue: string,
  setter: (formatted: string) => void
) {
  const digits = rawValue.replace(/\D/g, "");
  setter(digits ? formatBRL(digits) : "");
}

/**
 * Parses a BRL-formatted string back to a number (e.g. "R$ 1.234,56" → 1234.56).
 */
export function parseBRL(formatted: string): number {
  if (!formatted) return 0;
  const cleaned = formatted.replace(/[^\d,]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}
