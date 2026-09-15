/**
 * Shared, consistent import row limits across frontend and backend.
 *
 * Pharmacy CSV import: up to 500 rows per batch.
 * Platform shared-library CSV import: up to 5000 rows per batch.
 */
export const MAX_PHARMACY_CSV_IMPORT_ROWS = 500;
export const MAX_PLATFORM_CSV_IMPORT_ROWS = 5000;
