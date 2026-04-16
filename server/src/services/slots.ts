/**
 * Generates session time slots from an availability window.
 */
export function generateSlots(
  date: string, // YYYY-MM-DD
  startTime: string, // HH:MM
  endTime: string, // HH:MM
  durationMin: number
): Array<{ start_time: string; end_time: string }> {
  const slots: Array<{ start_time: string; end_time: string }> = [];

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const windowStart = new Date(`${date}T${pad(startHour)}:${pad(startMin)}:00`);
  const windowEnd = new Date(`${date}T${pad(endHour)}:${pad(endMin)}:00`);

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

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
