/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formats an ISO date string into a human-friendly format relative to today/tomorrow.
 * - Today • h:mm AM/PM
 * - Tomorrow • h:mm AM/PM
 * - Otherwise: D MMM • h:mm AM/PM
 */
export function formatHumanFriendlyDeadline(isoString: string | Date | number): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return String(isoString);

  const today = new Date();
  
  // Calculate relative day count in user's local timezone.
  // To avoid DST shift and time mismatch issues, compute the difference using local calendar dates at midnight.
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffTime = dateStart.getTime() - todayStart.getTime();
  const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000));

  // Format time: h:mm A (using user's local timezone)
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // hour '0' should be '12'
  const minutesStr = minutes.toString().padStart(2, '0');
  const timeStr = `${hours}:${minutesStr} ${ampm}`;

  if (diffDays === 0) {
    return `Today • ${timeStr}`;
  } else if (diffDays === 1) {
    return `Tomorrow • ${timeStr}`;
  } else if (diffDays === -1) {
    return `Yesterday • ${timeStr}`;
  } else if (diffDays > 1 && diffDays < 7) {
    // Within the next 7 days (exclusive of today and tomorrow) -> Mon • 4:00 PM
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdayStr = weekdays[date.getDay()];
    return `${weekdayStr} • ${timeStr}`;
  } else {
    // Older or future dates
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const monthStr = months[date.getMonth()];
    
    if (date.getFullYear() !== today.getFullYear()) {
      return `${day} ${monthStr} ${date.getFullYear()} • ${timeStr}`;
    } else {
      return `${day} ${monthStr} • ${timeStr}`;
    }
  }
}
