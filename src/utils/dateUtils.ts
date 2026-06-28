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
export function formatHumanFriendlyDeadline(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const today = new Date();
  
  const isToday = 
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = 
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  // Format time: h:mm A
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes.toString().padStart(2, '0');
  const timeStr = `${hours}:${minutesStr} ${ampm}`;

  if (isToday) {
    return `Today • ${timeStr}`;
  } else if (isTomorrow) {
    return `Tomorrow • ${timeStr}`;
  } else {
    // e.g. "29 Jun • 4:00 PM"
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const monthStr = months[date.getMonth()];
    return `${day} ${monthStr} • ${timeStr}`;
  }
}
