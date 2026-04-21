/**
 * Build the `occupiedSlots` set for findNextAvailableSlot.
 *
 * IMPORTANT: always drive from `Scheduled Time` (the ISO datetime),
 * never `Scheduled Date` (date-only). Parsing a date-only string like
 * "2026-04-21" yields midnight UTC which converts to 7pm EDT, so using
 * it as the slot-hour source makes all 9am / 1pm / 7pm slots look free
 * — and scheduler collisions follow.
 *
 * Slot keys match findNextAvailableSlot's format: `YYYY-MM-DD_HH:MM`
 * with the date and time in America/New_York local time.
 */

type ScheduledRow = {
  fields: {
    Status?: string;
    "Scheduled Time"?: string;
  };
};

export function buildOccupiedSlots(rows: ScheduledRow[]): string[] {
  const slots: string[] = [];
  for (const r of rows) {
    if (!r.fields.Status || r.fields.Status === "failed") continue;
    const iso = r.fields["Scheduled Time"] || "";
    if (!iso) continue;
    const d = new Date(iso);
    if (isNaN(d.getTime())) continue;
    // Format into America/New_York local year/month/day/hour/minute
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
    const y = get("year");
    const m = get("month");
    const day = get("day");
    const hh = get("hour");
    const mm = get("minute");
    if (!y || !m || !day || !hh) continue;
    // formatToParts returns hour "24" at midnight in some locales; normalize.
    const hhNorm = hh === "24" ? "00" : hh;
    slots.push(`${y}-${m}-${day}_${hhNorm}:${mm}`);
  }
  return slots;
}
