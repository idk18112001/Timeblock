export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

export function formatTime(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
}

export function formatDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getDaysInMonth(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Get the first Monday of the calendar grid
  const startDate = new Date(firstDay);
  const dayOfWeek = firstDay.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
  startDate.setDate(firstDay.getDate() - daysToSubtract);
  
  // Generate 42 days (6 weeks)
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    days.push(day);
  }
  
  return days;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
}

export function getHoursArray(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

export function getQuarterHours(hour: number): string[] {
  return [
    `${hour.toString().padStart(2, '0')}:00`,
    `${hour.toString().padStart(2, '0')}:15`,
    `${hour.toString().padStart(2, '0')}:30`,
    `${hour.toString().padStart(2, '0')}:45`,
  ];
}
