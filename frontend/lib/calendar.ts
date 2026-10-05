/**
 * Ethiopian (Ge'ez) calendar conversions.
 *
 * The canonical timestamp is always Gregorian ISO-8601; conversion happens
 * only at the presentation layer. Anchors used:
 *   Meskerem 1, 2016 EC = 2023-09-11
 *   Meskerem 1, 2017 EC = 2024-09-11 (Genna 2017 = 2025-01-07)
 *
 * Ethiopian years divisible by 4 are leap years (Pagumen has 6 days).
 */

const JDN_EPOCH = 1724220; // JDN of Meskerem 1, 1 EC (derived from anchors above)
const UNIX_EPOCH_JDN = 2440588; // JDN of 1970-01-01

export interface EthiopianDate {
  year: number;
  month: number; // 1..13
  day: number;
}

export const ETHIOPIC_MONTHS = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miazia",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagumen",
];

export const ETHIOPIC_MONTHS_AM = [
  "መስከረም",
  "ጥቅምት",
  "ኅዳር",
  "ታኅሣሥ",
  "ጥር",
  "የካቲት",
  "መጋቢት",
  "ሚያዝያ",
  "ግንቦት",
  "ሰኔ",
  "ሐምሌ",
  "ነሐሴ",
  "ጳጉሜን",
];

function ethiopianNewYearJdn(year: number): number {
  return JDN_EPOCH + 365 * (year - 1) + Math.ceil(year / 4);
}

export function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 0;
}

export function ethiopianDaysInMonth(year: number, month: number): number {
  if (month <= 12) return 30;
  return isEthiopianLeapYear(year) ? 6 : 5;
}

function gregorianFromJdn(jdn: number): { year: number; month: number; day: number } {
  const unixDays = jdn - UNIX_EPOCH_JDN;
  const date = new Date(unixDays * 86_400_000);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function toEthiopian(date: Date): EthiopianDate {
  const jdn = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000) + UNIX_EPOCH_JDN;

  let year = Math.floor((jdn - JDN_EPOCH) / 365.2425) + 1;

  while (ethiopianNewYearJdn(year) > jdn) year -= 1;
  while (ethiopianNewYearJdn(year + 1) <= jdn) year += 1;

  const dayOfYear = jdn - ethiopianNewYearJdn(year);
  const month = Math.min(13, Math.floor(dayOfYear / 30) + 1);
  const day = month === 13 ? dayOfYear - 360 + 1 : (dayOfYear % 30) + 1;

  return { year, month, day };
}

export function toGregorian(ethiopian: EthiopianDate): Date {
  const { year, month, day } = ethiopian;
  const dayOfYear = month === 13 ? 360 + (day - 1) : (month - 1) * 30 + (day - 1);
  const jdn = ethiopianNewYearJdn(year) + dayOfYear;
  const { year: gy, month: gm, day: gd } = gregorianFromJdn(jdn);
  return new Date(gy, gm - 1, gd);
}

export function formatEthiopian(date: Date, language: "en" | "am" = "en"): string {
  const eth = toEthiopian(date);
  const monthNames = language === "am" ? ETHIOPIC_MONTHS_AM : ETHIOPIC_MONTHS;
  return `${monthNames[eth.month - 1]} ${eth.day}, ${eth.year}`;
}

export function formatEthiopianShort(date: Date, language: "en" | "am" = "en"): string {
  const eth = toEthiopian(date);
  const monthNames = language === "am" ? ETHIOPIC_MONTHS_AM : ETHIOPIC_MONTHS;
  return `${eth.day} ${monthNames[eth.month - 1].slice(0, 3)} ${eth.year}`;
}

export function formatGregorian(date: Date, language: "en" | "am" = "en"): string {
  return date.toLocaleDateString(language === "am" ? "am-ET" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Renders an ISO date using the tenant's calendar preference.
 */
export function formatDateByCalendar(
  iso: string | null | undefined,
  calendar: "ethiopian" | "gregorian" = "ethiopian",
  language: "en" | "am" = "en",
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return calendar === "ethiopian" ? formatEthiopian(date, language) : formatGregorian(date, language);
}
