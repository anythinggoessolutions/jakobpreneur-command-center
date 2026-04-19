/**
 * Scheduling engine for jakobpreneur Command Center.
 *
 * Rules (from SKILL_2):
 * - 3 time slots per day: 9am, 1pm, 7pm EST
 * - Max 3 posts per day (one per slot)
 * - 3 hour minimum gap between posts (enforced by fixed slots)
 * - Never post same content twice on same platform same day
 * - If more than 3 videos queued, push extras to next available day
 */

// Fixed daily time slots in EST (hour, minute)
const TIME_SLOTS = [
  { hour: 9, minute: 0 },   // 9:00 AM EST
  { hour: 13, minute: 0 },  // 1:00 PM EST
  { hour: 19, minute: 0 },  // 7:00 PM EST
];

// Platform assignments per video
export const PLATFORMS_PER_VIDEO = ["YouTube", "TikTok", "Instagram"] as const;
export const TWEETS_PER_DAY = 5;

export interface ScheduledSlot {
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM (EST)
  datetime: string;    // ISO 8601 full datetime
  slotIndex: number;   // 0, 1, or 2
  platforms: string[];
}

/**
 * Find the next available slot given a list of already-occupied slots.
 * @param occupiedSlots - Array of "YYYY-MM-DD_HH:MM" strings that are already taken
 * @param startFrom - Date to start searching from (defaults to now)
 * @returns The next available ScheduledSlot
 */
export function findNextAvailableSlot(
  occupiedSlots: string[],
  startFrom?: Date
): ScheduledSlot {
  const occupied = new Set(occupiedSlots);
  const now = startFrom || new Date();

  // Convert to EST (UTC-5 / UTC-4 for DST)
  // Use a fixed offset approach — EST is UTC-5, EDT is UTC-4
  const estOffset = getESTOffset(now);
  const estNow = new Date(now.getTime() + estOffset);

  // Start from tomorrow if all today's slots have passed
  let searchDate = new Date(estNow);
  searchDate.setHours(0, 0, 0, 0);

  // Search up to 30 days ahead
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const currentDate = new Date(searchDate);
    currentDate.setDate(currentDate.getDate() + dayOffset);
    const dateStr = formatDate(currentDate);

    for (let slotIdx = 0; slotIdx < TIME_SLOTS.length; slotIdx++) {
      const slot = TIME_SLOTS[slotIdx];
      const slotKey = `${dateStr}_${padTime(slot.hour)}:${padTime(slot.minute)}`;

      // Skip if slot is occupied
      if (occupied.has(slotKey)) continue;

      // Skip if slot time has already passed today
      if (dayOffset === 0) {
        const slotTime = new Date(currentDate);
        slotTime.setHours(slot.hour, slot.minute, 0, 0);
        if (slotTime <= estNow) continue;
      }

      // Build the full ISO datetime in EST
      const slotDate = new Date(currentDate);
      slotDate.setHours(slot.hour, slot.minute, 0, 0);
      // Convert back from EST to UTC for the ISO string
      const utcSlotDate = new Date(slotDate.getTime() - estOffset);

      return {
        date: dateStr,
        time: `${padTime(slot.hour)}:${padTime(slot.minute)}`,
        datetime: utcSlotDate.toISOString(),
        slotIndex: slotIdx,
        platforms: [...PLATFORMS_PER_VIDEO],
      };
    }
  }

  throw new Error("No available slots found in the next 30 days");
}

// Tweet slots — 5 per day, every 3 hours during peak engagement
// Per SKILL_2: "5 tweets per day, post times spread across the day"
const TWEET_TIME_SLOTS = [
  { hour: 9, minute: 0 },   //  9:00 AM EST
  { hour: 12, minute: 0 },  // 12:00 PM EST
  { hour: 15, minute: 0 },  //  3:00 PM EST
  { hour: 18, minute: 0 },  //  6:00 PM EST
  { hour: 21, minute: 0 },  //  9:00 PM EST
];

export interface TweetSlot {
  datetime: string; // ISO 8601 UTC
  estLabel: string; // "9:00 AM EST" for display
}

/**
 * Return the next `count` tweet slot datetimes from `startFrom` (default: now),
 * skipping any slots in `occupied` (set of ISO datetimes already taken).
 * Tweet slots are independent of video/carousel slots.
 */
export function nextTweetSlots(
  count: number,
  occupied: Set<string> = new Set(),
  startFrom?: Date,
): TweetSlot[] {
  const now = startFrom || new Date();
  const estOffset = getESTOffset(now);
  const estNow = new Date(now.getTime() + estOffset);

  const out: TweetSlot[] = [];
  let dayOffset = 0;
  while (out.length < count && dayOffset < 30) {
    const day = new Date(estNow);
    day.setUTCDate(day.getUTCDate() + dayOffset);
    day.setUTCHours(0, 0, 0, 0);

    for (const slot of TWEET_TIME_SLOTS) {
      if (out.length >= count) break;

      const slotEst = new Date(day);
      slotEst.setUTCHours(slot.hour, slot.minute, 0, 0);

      // Skip past slots (today only)
      if (dayOffset === 0 && slotEst <= estNow) continue;

      // Convert EST back to UTC by subtracting the offset
      const slotUtc = new Date(slotEst.getTime() - estOffset);
      const iso = slotUtc.toISOString();

      if (occupied.has(iso)) continue;

      const hour12 = slot.hour > 12 ? slot.hour - 12 : slot.hour === 0 ? 12 : slot.hour;
      const ampm = slot.hour >= 12 ? "PM" : "AM";
      out.push({
        datetime: iso,
        estLabel: `${hour12}:${padTime(slot.minute)} ${ampm} EST`,
      });
    }
    dayOffset++;
  }

  if (out.length < count) {
    throw new Error(`Could only find ${out.length} tweet slots in next 30 days`);
  }
  return out;
}

/**
 * Schedule multiple videos at once (e.g., batch recording session).
 * Returns an array of scheduled slots, one per video.
 */
export function scheduleMultipleVideos(
  count: number,
  existingOccupiedSlots: string[],
  startFrom?: Date
): ScheduledSlot[] {
  const slots: ScheduledSlot[] = [];
  const occupied = [...existingOccupiedSlots];

  for (let i = 0; i < count; i++) {
    const slot = findNextAvailableSlot(occupied, startFrom);
    slots.push(slot);
    occupied.push(`${slot.date}_${slot.time}`);
  }

  return slots;
}

// Helpers
function getESTOffset(date: Date): number {
  // Simplified DST check for US Eastern
  // DST: second Sunday of March to first Sunday of November
  const year = date.getUTCFullYear();
  const marchSecondSunday = getNthSunday(year, 2, 2); // March, 2nd Sunday
  const novFirstSunday = getNthSunday(year, 10, 1);   // November, 1st Sunday

  const isDST = date >= marchSecondSunday && date < novFirstSunday;
  return isDST ? -4 * 60 * 60 * 1000 : -5 * 60 * 60 * 1000;
}

function getNthSunday(year: number, month: number, n: number): Date {
  const date = new Date(Date.UTC(year, month, 1, 2, 0, 0)); // 2am to handle transition
  let count = 0;
  while (count < n) {
    if (date.getUTCDay() === 0) count++;
    if (count < n) date.setUTCDate(date.getUTCDate() + 1);
  }
  return date;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())}`;
}

function padTime(n: number): string {
  return n.toString().padStart(2, "0");
}
