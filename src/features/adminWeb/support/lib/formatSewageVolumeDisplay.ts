/**
 * 노란 오수량 칸 표시 전용: 상태·계산·API에는 원문(`sewageVolume` / `sewageQty`) 유지,
 * 화면에는 소수 둘째 자리까지(표준 반올림).
 */
export function formatSewageVolumeDisplayTwoDecimals(raw: string): string {
  const t = String(raw ?? "").replace(/,/g, "").trim();
  if (!t) return "";
  const n = Number(t);
  if (!Number.isFinite(n)) return t;
  return n.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    useGrouping: false,
  });
}
