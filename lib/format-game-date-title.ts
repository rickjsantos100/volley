const GAME_DATE_TITLE_FORMATTER = new Intl.DateTimeFormat("pt-PT", {
  day: "numeric",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "numeric",
  timeZone: "Europe/Lisbon",
  weekday: "long",
});

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatGameDateTitle(date: Date) {
  const parts = GAME_DATE_TITLE_FORMATTER.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekday = capitalize(getPart("weekday").replace("-feira", ""));
  const month = MONTH_LABELS[Number(getPart("month")) - 1] ?? "";

  return `${weekday}, ${getPart("day")} ${month} - ${getPart("hour")}:${getPart("minute")}`;
}
