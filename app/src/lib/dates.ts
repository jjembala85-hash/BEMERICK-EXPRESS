// All public times are shown in East Africa Time (UTC+3).
const eat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Kampala",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "15 Nov 2026, 14:05 EAT" */
export function formatEAT(date: Date) {
  return `${eat.format(date)} EAT`;
}
