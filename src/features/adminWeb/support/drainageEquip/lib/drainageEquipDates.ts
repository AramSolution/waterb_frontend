/** `<input type="date">`용 `YYYY-MM-DD` */
export function normalizeDrainageYmd(
  raw: string | null | undefined,
): string {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  if (t.length >= 10 && t[4] === "-" && t[7] === "-") return t.slice(0, 10);
  if (t.length === 8 && /^\d{8}$/.test(t)) {
    return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
  }
  return t.slice(0, 10);
}

export function getDrainageTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 납부 시 착공·준공예정·준공일 기본값: 저장된 날짜 → 없으면 등록일 */
export function defaultPaidDetailDates(
  reqDate: string,
  dates: { startDate: string; planDate: string; compDate: string },
): { startDate: string; planDate: string; compDate: string } {
  const base = normalizeDrainageYmd(reqDate) || getDrainageTodayYmd();
  return {
    startDate: normalizeDrainageYmd(dates.startDate) || base,
    planDate: normalizeDrainageYmd(dates.planDate) || base,
    compDate: normalizeDrainageYmd(dates.compDate) || base,
  };
}
