const DEFAULT_LOCALE = "en-NG";
const DEFAULT_CURRENCY = "NGN";
const DEFAULT_TIME_ZONE = "Africa/Lagos";

type NumberInput = number | string | null | undefined;

function toNumber(value: NumberInput) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoney(
  value: NumberInput,
  options: {
    locale?: string;
    currency?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {},
) {
  const {
    locale = DEFAULT_LOCALE,
    currency = DEFAULT_CURRENCY,
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  } = options;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(toNumber(value));
}

export function formatDate(
  value: string | Date,
  options: {
    locale?: string;
    timeZone?: string;
    day?: "2-digit" | "numeric";
    month?: "2-digit" | "numeric" | "short" | "long";
    year?: "2-digit" | "numeric";
  } = {},
) {
  const {
    locale = DEFAULT_LOCALE,
    timeZone = DEFAULT_TIME_ZONE,
    day = "2-digit",
    month = "2-digit",
    year = "numeric",
  } = options;

  return new Intl.DateTimeFormat(locale, {
    day,
    month,
    year,
    timeZone,
  }).format(new Date(value));
}

export function formatTime(
  value: string | Date,
  options: {
    locale?: string;
    timeZone?: string;
    hour12?: boolean;
  } = {},
) {
  const {
    locale = DEFAULT_LOCALE,
    timeZone = DEFAULT_TIME_ZONE,
    hour12 = true,
  } = options;

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12,
    timeZone,
  }).format(new Date(value));
}
