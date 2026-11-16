// Dates travel as "YYYY-MM-DD" strings. These helpers avoid timezone surprises
// by always building dates at local midnight.

export const parseDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const toISO = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const todayISO = () => toISO(new Date());

export const addDays = (iso, n) => {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const formatDay = (iso, opts = { weekday: "short", day: "numeric", month: "short" }) =>
  parseDate(iso).toLocaleDateString(undefined, opts);

export const formatLong = (iso) =>
  parseDate(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function relativeDay(iso, today = todayISO()) {
  if (iso === today) return "Today";
  if (iso === addDays(today, 1)) return "Tomorrow";
  if (iso === addDays(today, -1)) return "Yesterday";
  return formatDay(iso);
}

export const formatHours = (h) => {
  const n = Math.round(Number(h) * 100) / 100;
  return `${n}h`;
};
