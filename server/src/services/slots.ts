/**
 * Generates session time slots from an availability window.
 * start and end can be HH:MM strings (treated as UTC) or full ISO strings.
 */
export function generateSlots(
  date: string, // YYYY-MM-DD (used only when start/end are HH:MM)
  startTime: string, // HH:MM or full ISO string
  endTime: string,   // HH:MM or full ISO string
  durationMin: number
): Array<{ start_time: string; end_time: string }> {
  const slots: Array<{ start_time: string; end_time: string }> = [];

  // Accept full ISO strings (sent by updated client) or legacy HH:MM strings
  const windowStart = isISO(startTime)
    ? new Date(startTime)
    : new Date(`${date}T${startTime}:00Z`);
  const windowEnd = isISO(endTime)
    ? new Date(endTime)
    : new Date(`${date}T${endTime}:00Z`);

  let cursor = windowStart;
  while (true) {
    const slotEnd = new Date(cursor.getTime() + durationMin * 60 * 1000);
    if (slotEnd > windowEnd) break;
    slots.push({
      start_time: cursor.toISOString(),
      end_time: slotEnd.toISOString(),
    });
    cursor = slotEnd;
  }

  return slots;
}

function isISO(s: string): boolean {
  return s.includes('T');
}
