/**
 * Utility functions for Indian Rupee (INR / ₹) currency formatting
 */

export function formatINR(amount: number, compact = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹ 0';
  }

  const isNegative = amount < 0;
  const absVal = Math.abs(amount);

  if (compact) {
    if (absVal >= 10000000) {
      // 1 Crore = 10,000,000
      const cr = absVal / 10000000;
      return `${isNegative ? '-' : ''}₹ ${cr.toFixed(2)} Cr`;
    }
    if (absVal >= 100000) {
      // 1 Lakh = 100,000
      const lakh = absVal / 100000;
      return `${isNegative ? '-' : ''}₹ ${lakh.toFixed(2)} L`;
    }
    if (absVal >= 1000) {
      const k = absVal / 1000;
      return `${isNegative ? '-' : ''}₹ ${k.toFixed(1)}k`;
    }
  }

  // Standard Indian comma grouping: 3 digits, then 2 digits (e.g. 12,34,567)
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(absVal));

  return `${isNegative ? '-' : ''}₹ ${formatted}`;
}
