/** Maximum window for audit CSV export (abuse / memory guard). */
export const MAX_AUDIT_EXPORT_RANGE_MS = 366 * 24 * 60 * 60 * 1000;

export function assertAuditExportRangeOrThrow(from: Date, to: Date) {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid dates");
  }
  if (from > to) {
    throw new Error("Range invalid: start is after end");
  }
  if (to.getTime() - from.getTime() > MAX_AUDIT_EXPORT_RANGE_MS) {
    throw new Error("Date range too large (maximum 366 days)");
  }
}
