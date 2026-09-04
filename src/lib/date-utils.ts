/**
 * Centralized Date Utility for Fresh Link Agro
 * 
 * Provides strict, safe date parsing and validation for user-entered dates.
 * Prevents Invalid Date objects from reaching Firestore.
 * 
 * Canonical UI Format: DD-MM-YYYY
 * Canonical Firestore Format: YYYY-MM-DD (ISO date string)
 * Canonical Runtime Format: JavaScript Date object
 */

/**
 * Result of date parsing operation
 */
export type ParseDateResult = {
  success: boolean;
  date?: Date;
  isoString?: string;
  error?: string;
};

/**
 * Parses a date string in DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD format.
 * 
 * This function does NOT use browser-dependent new Date(string) parsing.
 * It explicitly extracts day, month, year and constructs the date safely.
 * 
 * Valid formats:
 * - DD-MM-YYYY (e.g., 26-08-2026)
 * - DD/MM/YYYY (e.g., 26/08/2026)
 * - YYYY-MM-DD (e.g., 2026-08-26) - for date inputs
 * 
 * Invalid formats:
 * - MM-DD-YYYY (e.g., 08-26-2026)
 * - Any other format
 * 
 * Invalid dates:
 * - 31-02-2025 (February 31st)
 * - 29-02-2025 (2025 is not a leap year)
 * - 32-01-2025 (day 32)
 * - 00-01-2025 (day 0)
 * - 12-13-2025 (month 13)
 * 
 * @param dateStr - The date string to parse
 * @returns Parse结果 with success status and parsed date or error message
 */
export function parseStrictDate(dateStr: string): ParseDateResult {
  if (!dateStr || dateStr.trim() === '') {
    return { success: false, error: 'Date is empty' };
  }

  const trimmed = dateStr.trim();

  // Normalize separators: convert / to -
  const normalized = trimmed.replace(/\//g, '-');

  // Split by hyphen
  const parts = normalized.split('-');

  // Must have exactly 3 parts
  if (parts.length !== 3) {
    return { success: false, error: 'Invalid date format. Use DD-MM-YYYY' };
  }

  const [part1, part2, part3] = parts;

  // Validate all parts are numeric
  if (!/^\d+$/.test(part1) || !/^\d+$/.test(part2) || !/^\d+$/.test(part3)) {
    return { success: false, error: 'Date must contain only numbers and separators' };
  }

  // Determine format: DD-MM-YYYY vs YYYY-MM-DD
  // If first part is 4 digits, assume YYYY-MM-DD
  // If first part is 1-2 digits, assume DD-MM-YYYY
  let day: number, month: number, year: number;

  if (part1.length === 4) {
    // YYYY-MM-DD format
    year = parseInt(part1, 10);
    month = parseInt(part2, 10);
    day = parseInt(part3, 10);
  } else {
    // DD-MM-YYYY format
    day = parseInt(part1, 10);
    month = parseInt(part2, 10);
    year = parseInt(part3, 10);
  }

  // Validate ranges
  if (day < 1 || day > 31) {
    return { success: false, error: 'Day must be between 1 and 31' };
  }

  if (month < 1 || month > 12) {
    return { success: false, error: 'Month must be between 1 and 12' };
  }

  if (year < 1900 || year > 2100) {
    return { success: false, error: 'Year must be between 1900 and 2100' };
  }

  // Construct date safely (month is 0-indexed in JavaScript)
  const date = new Date(year, month - 1, day);

  // Verify the date is valid by checking if the components match
  // This catches invalid dates like 31-02-2025
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { success: false, error: 'Invalid date (e.g., February 31st)' };
  }

  // Date is valid
  const isoString = toIsoDate(date);

  return {
    success: true,
    date,
    isoString,
  };
}

/**
 * Converts a JavaScript Date object to ISO date string (YYYY-MM-DD).
 * 
 * @param date - The Date object to convert
 * @returns ISO date string in YYYY-MM-DD format
 */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a JavaScript Date object to UI date string (DD-MM-YYYY).
 * 
 * @param date - The Date object to convert
 * @returns UI date string in DD-MM-YYYY format
 */
export function toUiDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Gets today's date in UI format (DD-MM-YYYY).
 * 
 * @returns Today's date in DD-MM-YYYY format
 */
export function getTodayUiDate(): string {
  return toUiDate(new Date());
}

/**
 * Gets today's date in ISO format (YYYY-MM-DD).
 * 
 * @returns Today's date in YYYY-MM-DD format
 */
export function getTodayIsoDate(): string {
  return toIsoDate(new Date());
}

/**
 * Converts a UI date string (DD-MM-YYYY or DD/MM/YYYY) to ISO format (YYYY-MM-DD).
 * 
 * This function validates the date before conversion.
 * 
 * @param uiDate - The UI date string to convert
 * @returns ISO date string in YYYY-MM-DD format, or empty string if invalid
 */
export function uiDateToIsoDate(uiDate: string): string {
  const result = parseStrictDate(uiDate);
  if (!result.success || !result.isoString) {
    return ''; // Return empty string for invalid dates
  }
  return result.isoString;
}

/**
 * Converts an ISO date string (YYYY-MM-DD) to UI format (DD-MM-YYYY).
 * 
 * @param isoDate - The ISO date string to convert
 * @returns UI date string in DD-MM-YYYY format, or empty string if invalid
 */
export function isoDateToUiDate(isoDate: string): string {
  if (!isoDate || isoDate.trim() === '') return '';

  const trimmed = isoDate.trim();

  // Split by hyphen
  const parts = trimmed.split('-');

  // Must have exactly 3 parts
  if (parts.length !== 3) {
    return '';
  }

  const [yearStr, monthStr, dayStr] = parts;

  // Validate all parts are numeric
  if (!/^\d+$/.test(yearStr) || !/^\d+$/.test(monthStr) || !/^\d+$/.test(dayStr)) {
    return '';
  }

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Validate ranges
  if (year < 1900 || year > 2100) return '';
  if (month < 1 || month > 12) return '';
  if (day < 1 || day > 31) return '';

  // Construct date to validate
  const date = new Date(year, month - 1, day);

  // Verify the date is valid
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return '';
  }

  return toUiDate(date);
}

/**
 * Validates a date string in DD-MM-YYYY or DD/MM/YYYY format.
 * 
 * @param dateStr - The date string to validate
 * @returns true if valid, false otherwise
 */
export function isValidDateFormat(dateStr: string): boolean {
  const result = parseStrictDate(dateStr);
  return result.success;
}

/**
 * Gets a user-friendly error message for date validation.
 * 
 * @param dateStr - The date string to validate
 * @returns Error message if invalid, empty string if valid
 */
export function getDateValidationError(dateStr: string): string {
  const result = parseStrictDate(dateStr);
  return result.error || '';
}
