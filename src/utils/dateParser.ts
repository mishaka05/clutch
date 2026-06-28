/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Parses natural language scheduling expressions (e.g. "6 PM", "tomorrow at 3 PM", "Friday at 12 PM")
 * with local timezone correctness, rollover detection, and ISO serialization.
 */
export interface ParsedScheduleResult {
  localDate: Date;
  rolloverOccurred: boolean;
  hasExplicitDate: boolean;
  parsedType: 'time_only_today' | 'time_only_tomorrow' | 'tomorrow' | 'weekday' | 'explicit_date' | 'fallback';
}

export function parseSchedulingExpression(text: string, referenceDate: Date = new Date()): ParsedScheduleResult {
  let hasExplicitDate = false;
  let rolloverOccurred = false;
  let parsedType: ParsedScheduleResult['parsedType'] = 'fallback';

  // 1. Parse time components (hours, minutes, AM/PM)
  let hours = -1;
  let minutes = 0;
  let ampm: string | null = null;

  // Try matching HH:MM AM/PM or HH:MM
  let timeMatch = text.match(/(\d{1,2}):(\d{2})\s*(pm|am|PM|AM)?/i);
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = parseInt(timeMatch[2], 10);
    if (timeMatch[3]) {
      ampm = timeMatch[3].toUpperCase();
    }
  } else {
    // Try matching HH AM/PM
    timeMatch = text.match(/(\d{1,2})\s*(pm|am|PM|AM)/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = 0;
      ampm = timeMatch[2].toUpperCase();
    }
  }

  // Fallback if no time matches but there's a reference to tomorrow/weekday
  if (hours === -1) {
    // Default to +1 hour from reference
    const defaultDate = new Date(referenceDate.getTime() + 60 * 60 * 1000);
    hours = defaultDate.getHours();
    minutes = 0;
    ampm = hours >= 12 ? 'PM' : 'AM';
  }

  // Convert hours to 24-hour format
  let targetHours = hours;
  if (ampm) {
    if (ampm === 'PM' && hours < 12) targetHours += 12;
    else if (ampm === 'AM' && hours === 12) targetHours = 0;
  } else if (hours < 12) {
    // No AM/PM: standard assumption is PM for 1-7 (e.g. "schedule at 6" -> 6 PM)
    if (hours >= 1 && hours <= 7) {
      targetHours += 12;
    }
  }

  // 2. Initialize date base
  let dateBase = new Date(referenceDate);

  // 3. Detect explicit dates
  const textLower = text.toLowerCase();

  // Check for "tomorrow"
  if (/\btomorrow\b/i.test(textLower)) {
    hasExplicitDate = true;
    parsedType = 'tomorrow';
    dateBase.setDate(dateBase.getDate() + 1);
  }
  // Check for weekday (e.g., Friday, Friday at 12 PM)
  else {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const shortWeekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    let foundWeekdayIndex = -1;

    for (let i = 0; i < weekdays.length; i++) {
      const dayRegex = new RegExp(`\\b${weekdays[i]}\\b`, 'i');
      const shortDayRegex = new RegExp(`\\b${shortWeekdays[i]}\\b`, 'i');
      if (dayRegex.test(textLower) || shortDayRegex.test(textLower)) {
        foundWeekdayIndex = i;
        break;
      }
    }

    if (foundWeekdayIndex !== -1) {
      hasExplicitDate = true;
      parsedType = 'weekday';
      const currentDay = dateBase.getDay();
      let daysToAdd = foundWeekdayIndex - currentDay;
      if (daysToAdd <= 0) {
        daysToAdd += 7; // Next week's occurrence
      }
      dateBase.setDate(dateBase.getDate() + daysToAdd);
    }
    // Check for explicit dates like YYYY-MM-DD or MM/DD/YYYY
    else {
      const yyyymmddMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
      const mmddyyyyMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
      const textDateMatch = text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\b/i);

      if (yyyymmddMatch) {
        hasExplicitDate = true;
        parsedType = 'explicit_date';
        dateBase.setFullYear(
          parseInt(yyyymmddMatch[1], 10),
          parseInt(yyyymmddMatch[2], 10) - 1,
          parseInt(yyyymmddMatch[3], 10)
        );
      } else if (mmddyyyyMatch) {
        hasExplicitDate = true;
        parsedType = 'explicit_date';
        dateBase.setFullYear(
          parseInt(mmddyyyyMatch[3], 10),
          parseInt(mmddyyyyMatch[1], 10) - 1,
          parseInt(mmddyyyyMatch[2], 10)
        );
      } else if (textDateMatch) {
        hasExplicitDate = true;
        parsedType = 'explicit_date';
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthStr = textDateMatch[1].substring(0, 3).toLowerCase();
        const monthIndex = months.indexOf(monthStr);
        const dayNum = parseInt(textDateMatch[2], 10);
        if (monthIndex !== -1) {
          dateBase.setMonth(monthIndex, dayNum);
        }
      }
    }
  }

  // 4. Assemble final local scheduled datetime
  dateBase.setHours(targetHours, minutes, 0, 0);

  // 5. Apply rollover logic if NO explicit date was specified
  if (!hasExplicitDate) {
    // If the requested time has already passed today, automatically schedule for tomorrow
    if (dateBase.getTime() <= referenceDate.getTime()) {
      dateBase.setDate(dateBase.getDate() + 1);
      rolloverOccurred = true;
      parsedType = 'time_only_tomorrow';
    } else {
      parsedType = 'time_only_today';
    }
  }

  return {
    localDate: dateBase,
    rolloverOccurred,
    hasExplicitDate,
    parsedType
  };
}

/**
 * Safely serializes a local Date object into an ISO-8601 string containing
 * the exact local timezone offset (e.g. "2026-06-28T18:00:00-07:00")
 * to prevent ISO parsing shifts on remote APIs.
 */
export function getLocalISOString(date: Date): string {
  const tzOffset = -date.getTimezoneOffset();
  const diff = tzOffset >= 0 ? '+' : '-';
  const pad = (num: number) => String(num).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const absOffsetHours = pad(Math.floor(Math.abs(tzOffset) / 60));
  const absOffsetMinutes = pad(Math.abs(tzOffset) % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${diff}${absOffsetHours}:${absOffsetMinutes}`;
}
