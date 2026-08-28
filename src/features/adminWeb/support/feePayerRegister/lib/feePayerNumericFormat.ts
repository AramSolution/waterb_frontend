/** 원인자부담금 오수량 산정 — 숫자 입력 콤마 표시·API 전송 전 strip 공통 */

export function formatIntKo(n: number): string {
  if (!Number.isFinite(n)) return "";
  return Math.round(n).toLocaleString("ko-KR");
}

export function digitsOnly(raw: string): string {
  return String(raw ?? "").replace(/\D/g, "");
}

export function formatDigitsWithComma(raw: string): string {
  const d = digitsOnly(raw);
  if (!d) return "";
  return Number(d).toLocaleString("ko-KR");
}

/** 소수 입력 가능: 콤마 제거, 숫자·소수점만(점은 최대 1개) */
export function sanitizeDecimalNumericInput(raw: string): string {
  const noComma = String(raw ?? "").replace(/,/g, "");
  let out = "";
  let dotSeen = false;
  for (const ch of noComma) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
    } else if (ch === "." && !dotSeen) {
      dotSeen = true;
      out += ".";
    }
  }
  return out;
}

/** 입력 문자열 → 천 단위 콤마 + 소수 유지 */
export function formatDecimalWithComma(raw: string): string {
  const plain = sanitizeDecimalNumericInput(raw);
  if (plain === "") return "";

  const endsWithDot = plain.endsWith(".");
  const [intPart = "", decPart] = plain.split(".");

  const formattedInt =
    intPart === ""
      ? "0"
      : Number(intPart).toLocaleString("ko-KR");

  if (decPart !== undefined) {
    return `${formattedInt}.${decPart}`;
  }
  if (endsWithDot) {
    return `${formattedInt}.`;
  }
  return formattedInt;
}

export function formatDecimalWithCommaFromNumber(n: number): string {
  if (!Number.isFinite(n)) return "";
  const plain = n.toLocaleString("en-US", {
    maximumFractionDigits: 10,
    useGrouping: false,
  });
  return formatDecimalWithComma(plain);
}

const INTEGER_COMMA_ENTRY_FIELDS = new Set(["unitPrice", "causerCharge"]);
const INTEGER_COMMA_LINE_FIELDS = new Set(["roomCount", "householdCount"]);
const DECIMAL_COMMA_ENTRY_FIELDS = new Set(["sewageVolume", "sewageLevyAmount"]);
const DECIMAL_COMMA_LINE_FIELDS = new Set(["area", "dailySewage"]);

export function sanitizeNumericField(name: string, value: string): string {
  if (
    INTEGER_COMMA_ENTRY_FIELDS.has(name) ||
    INTEGER_COMMA_LINE_FIELDS.has(name)
  ) {
    const formatted = formatDigitsWithComma(value);
    return formatted === "" && INTEGER_COMMA_LINE_FIELDS.has(name)
      ? "0"
      : formatted;
  }
  if (
    DECIMAL_COMMA_ENTRY_FIELDS.has(name) ||
    DECIMAL_COMMA_LINE_FIELDS.has(name)
  ) {
    const formatted = formatDecimalWithComma(value);
    return formatted === "" && DECIMAL_COMMA_LINE_FIELDS.has(name)
      ? "0"
      : formatted;
  }
  return value;
}

/** API·상세 로드 → 화면 정수 필드 */
export function formatLoadedIntegerField(
  raw: string | number | null | undefined,
): string {
  const t = String(raw ?? "").replace(/,/g, "").trim();
  if (!t) return "";
  const n = Number(t);
  if (!Number.isFinite(n)) return "";
  return formatIntKo(Math.trunc(n));
}

/** API·상세 로드 → 화면 소수 필드 */
export function formatLoadedDecimalField(
  raw: string | number | null | undefined,
): string {
  const t = String(raw ?? "").replace(/,/g, "").trim();
  if (!t) return "";
  const n = Number(t);
  if (!Number.isFinite(n)) return "";
  return formatDecimalWithCommaFromNumber(n);
}

export function formatLineNumericDisplay<T extends {
  area: string;
  dailySewage: string;
  roomCount: string;
  householdCount: string;
}>(line: T): T {
  return {
    ...line,
    area: formatLoadedDecimalField(line.area) || "0",
    dailySewage: formatLoadedDecimalField(line.dailySewage) || "0",
    roomCount: formatLoadedIntegerField(line.roomCount) || "0",
    householdCount: formatLoadedIntegerField(line.householdCount) || "0",
  };
}

export function formatEntryNumericDisplay<T extends {
  unitPrice: string;
  sewageVolume: string;
  causerCharge: string;
  sewageLevyAmount: string;
  lines: Array<{
    area: string;
    dailySewage: string;
    roomCount: string;
    householdCount: string;
  }>;
}>(entry: T): T {
  return {
    ...entry,
    unitPrice: String(entry.unitPrice ?? "").trim()
      ? formatLoadedIntegerField(entry.unitPrice)
      : "",
    sewageVolume: formatLoadedDecimalField(entry.sewageVolume) || "0",
    causerCharge: formatLoadedIntegerField(entry.causerCharge) || "0",
    sewageLevyAmount: formatLoadedDecimalField(entry.sewageLevyAmount) || "0",
    lines: entry.lines.map((line) => formatLineNumericDisplay(line)),
  };
}
