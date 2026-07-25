export interface DateDetails {
  dateObj: Date;
  dateKey: string;      // YYYY-MM-DD
  weekKey: string;      // YYYY-MM-DD (Sunday start)
  monthKey: string;     // YYYY-MM
  yearKey: string;      // YYYY
  dayOfWeekName: string;// Sunday, Monday, Tuesday, etc.
  displayDate: string;  // DD/MM/YYYY
  displayMonth: string; // Jul 2026
  displayWeek: string;  // 19/07 - 24/07/2026 (Sun-Fri)
}

/**
 * Parses any date string (e.g. 25-07-2026, 2026-07-25, 25/07/2026) into DateDetails
 * Week is defined as 6 days from Sunday to Friday.
 */
export function parseDateString(dateStr: string): DateDetails | null {
  if (!dateStr) return null;
  const str = dateStr.trim();
  let year = 0;
  let month = 0; // 1-12
  let day = 0;

  // Pattern 1: YYYY-MM-DD or YYYY/MM/DD
  let match = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    // Pattern 2: DD-MM-YYYY or DD/MM/YYYY
    match = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (match) {
      day = Number(match[1]);
      month = Number(match[2]);
      year = Number(match[3]);
    } else {
      // Pattern 3: Standard JS Date fallback
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        year = d.getFullYear();
        month = d.getMonth() + 1;
        day = d.getDate();
      } else {
        return null;
      }
    }
  }

  if (year < 1990 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const dateObj = new Date(year, month - 1, day);
  const pad = (n: number) => String(n).padStart(2, '0');

  const dateKey = `${year}-${pad(month)}-${pad(day)}`;
  const monthKey = `${year}-${pad(month)}`;
  const yearKey = `${year}`;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeekName = dayNames[dateObj.getDay()];

  // 6-day Workweek Calculation (Sunday to Friday)
  // Sunday = 0, Monday = 1, ..., Friday = 5, Saturday = 6
  const dayOfWeekIndex = dateObj.getDay();
  const sun = new Date(year, month - 1, day);
  sun.setDate(day - dayOfWeekIndex); // Date of Sunday starting this week

  const fri = new Date(sun);
  fri.setDate(sun.getDate() + 5); // Date of Friday ending this 6-day workweek

  const sunKey = `${sun.getFullYear()}-${pad(sun.getMonth() + 1)}-${pad(sun.getDate())}`;
  const weekKey = `WEEK-${sunKey}`;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const displayMonth = `${monthNames[month - 1]} ${year}`;
  const displayDate = `${pad(day)}/${pad(month)}/${year}`;
  
  // Format week range: e.g. "19/07 - 24/07/2026 (Sun-Fri)"
  const displayWeek = `${pad(sun.getDate())}/${pad(sun.getMonth() + 1)} - ${pad(fri.getDate())}/${pad(fri.getMonth() + 1)}/${fri.getFullYear()} (Sun-Fri)`;

  return {
    dateObj,
    dateKey,
    weekKey,
    monthKey,
    yearKey,
    dayOfWeekName,
    displayDate,
    displayMonth,
    displayWeek,
  };
}
