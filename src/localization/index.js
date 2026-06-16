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
 * @param {number} value - Number to format
 * @param {string} locale - Locale code (e.g., 'en-US', 'de-DE')
 * @param {number} decimals - Number of decimal places
 * @param {boolean} useThousands - Whether to use thousands separator
 * @returns {string} Formatted number string
 */
export function formatNumber(value, locale = 'en-US', decimals = 0, useThousands = true) {
  if (typeof value !== 'number' || isNaN(value)) return '0';

  const format = NUMBER_FORMATS[locale] || NUMBER_FORMATS['en-US'];
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
 * @param {number} value - Amount to format
 * @param {string} currency - Currency code (e.g., 'USD', 'EUR')
 * @param {string} locale - Locale code (e.g., 'en-US')
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, currency = 'USD', locale = 'en-US', decimals = 0) {
  const currencyConfig = CURRENCIES[currency];
  if (!currencyConfig) return formatNumber(value, locale, decimals);

  const format = NUMBER_FORMATS[currencyConfig.locale] || NUMBER_FORMATS['en-US'];
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
 * @param {number} value - Percentage value (0-100)
 * @param {string} locale - Locale code
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted percentage
 */
export function formatPercentage(value, locale = 'en-US', decimals = 1) {
  if (typeof value !== 'number' || isNaN(value)) return '0%';
  return formatNumber(value, locale, decimals, false) + '%';
}

/**
 * Parse a localized number string back to a number
 * @param {string} str - Localized number string
 * @param {string} locale - Locale code
 * @returns {number} Parsed number
 */
export function parseLocalizedNumber(str, locale = 'en-US') {
  const format = NUMBER_FORMATS[locale] || NUMBER_FORMATS['en-US'];
  const normalized = str
    .replace(new RegExp('\\' + format.thousands, 'g'), '')
    .replace(format.decimal, '.');
  return parseFloat(normalized) || 0;
}

/**
 * Get currency symbol for a currency code
 * @param {string} currency - Currency code
 * @returns {string} Currency symbol
 */
export function getCurrencySymbol(currency = 'USD') {
  return CURRENCIES[currency]?.symbol || '$';
}

/**
 * Get all available currencies
 * @returns {Array} Array of currency objects with code, symbol, name
 */
export function getAvailableCurrencies() {
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
 * @param {number} value - Value to format
 * @param {Object} settings - User settings object with currency, locale, decimalPrecision
 * @returns {string} Formatted number
 */
export function formatWithSettings(value, settings = {}) {
  const {
    currency = 'USD',
    locale = 'en-US',
    decimalPrecision = 2
  } = settings;

  return formatCurrency(value, currency, locale, decimalPrecision);
}
