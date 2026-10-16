/**
 * Localization & Internationalization (i18n)
 * Handles currency formatting, number localization, and locale settings
 */

// Currency configuration
export const CURRENCIES = {
  USD: { symbol: '$', code: 'USD', locale: 'en-US', name: 'US Dollar' },
  EUR: { symbol: '€', code: 'EUR', locale: 'de-DE', name: 'Euro' },
  GBP: { symbol: '£', code: 'GBP', locale: 'en-GB', name: 'British Pound' },
  CAD: { symbol: '$', code: 'CAD', locale: 'en-CA', name: 'Canadian Dollar' },
  AUD: { symbol: '$', code: 'AUD', locale: 'en-AU', name: 'Australian Dollar' }
};

// Number formatting patterns by locale
const NUMBER_FORMATS = {
  'en-US': { thousands: ',', decimal: '.' }, // 1,000.00
  'de-DE': { thousands: '.', decimal: ',' }, // 1.000,00
  'en-GB': { thousands: ',', decimal: '.' }, // 1,000.00
  'en-CA': { thousands: ',', decimal: '.' }, // 1,000.00
  'en-AU': { thousands: ',', decimal: '.' }  // 1,000.00
};

/**
 * Format a number with proper locale-specific thousands separator and decimal separator
 * @param value - Number to format
 * @param locale - Locale code (e.g., 'en-US', 'de-DE')
 * @param decimals - Number of decimal places
 * @param useThousands - Whether to use thousands separator
 * @returns Formatted number string
 */
export function formatNumber(value: number, locale = 'en-US', decimals = 0, useThousands = true): string {
  if (typeof value !== 'number' || isNaN(value)) return '0';

  const format = (NUMBER_FORMATS as any)[locale] || NUMBER_FORMATS['en-US'];
  const rounded = parseFloat(value.toFixed(decimals));
  const parts = rounded.toString().split('.');

  // Add thousands separator
  let integerPart = parts[0];
  if (useThousands) {
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, format.thousands);
  }

  // Add decimal part
  if (decimals > 0 && parts.length > 1) {
    const decimalPart = (parts[1] || '').padEnd(decimals, '0');
    return integerPart + format.decimal + decimalPart;
  }

  return integerPart;
}

/**
 * Format a currency value with symbol and localization
 * @param value - Amount to format
 * @param currency - Currency code (e.g., 'USD', 'EUR')
 * @param locale - Locale code (e.g., 'en-US')
 * @param decimals - Decimal places
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currency = 'USD', locale = 'en-US', decimals = 0): string {
  const currencyConfig = (CURRENCIES as any)[currency];
  if (!currencyConfig) return formatNumber(value, locale, decimals);

  const format = (NUMBER_FORMATS as any)[currencyConfig.locale] || NUMBER_FORMATS['en-US'];
  const rounded = parseFloat(value.toFixed(decimals));
  const parts = rounded.toString().split('.');

  // Add thousands separator
  let integerPart = parts[0];
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, format.thousands);

  // Add decimal part
  let decimalPart = '';
  if (decimals > 0) {
    decimalPart = (parts[1] || '').padEnd(decimals, '0');
    decimalPart = format.decimal + decimalPart;
  }

  // Format based on locale conventions
  if (currencyConfig.locale.startsWith('en')) {
    return currencyConfig.symbol + integerPart + decimalPart;
  } else if (currencyConfig.locale.startsWith('de')) {
    return integerPart + decimalPart + ' ' + currencyConfig.symbol;
  }

  return currencyConfig.symbol + integerPart + decimalPart;
}

/**
 * Format a percentage with proper localization
 * @param value - Percentage value (0-100)
 * @param locale - Locale code
 * @param decimals - Decimal places
 * @returns Formatted percentage
 */
export function formatPercentage(value: number, locale = 'en-US', decimals = 1): string {
  if (typeof value !== 'number' || isNaN(value)) return '0%';
  return formatNumber(value, locale, decimals, false) + '%';
}

/**
 * Parse a localized number string back to a number
 * @param str - Localized number string
 * @param locale - Locale code
 * @returns Parsed number
 */
export function parseLocalizedNumber(str: string, locale = 'en-US'): number {
  const format = (NUMBER_FORMATS as any)[locale] || NUMBER_FORMATS['en-US'];
  const normalized = str
    .replace(new RegExp('\\' + format.thousands, 'g'), '')
    .replace(format.decimal, '.');
  return parseFloat(normalized) || 0;
}

/**
 * Get currency symbol for a currency code
 * @param currency - Currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency = 'USD'): string {
  return (CURRENCIES as any)[currency]?.symbol || '$';
}

/**
 * Get all available currencies
 * @returns Array of currency objects with code, symbol, name
 */
export function getAvailableCurrencies(): any[] {
  return Object.entries(CURRENCIES).map(([code, config]) => ({
    code,
    symbol: config.symbol,
    name: config.name,
    locale: config.locale
  }));
}

/**
 * Format a number according to user settings
 * Used throughout the app to apply consistent formatting
 * @param value - Value to format
 * @param settings - User settings object with currency, locale, decimalPrecision
 * @returns Formatted number
 */
export function formatWithSettings(value: number, settings: Record<string, any> = {}): string {
  const {
    currency = 'USD',
    locale = 'en-US',
    decimalPrecision = 2
  } = settings;

  return formatCurrency(value, currency, locale, decimalPrecision);
}
