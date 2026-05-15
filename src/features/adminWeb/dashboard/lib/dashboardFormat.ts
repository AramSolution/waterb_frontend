export function getCurrentBaseMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function formatDashboardCount(
  value: number | null | undefined,
): string {
  const n = value ?? 0;
  return n.toLocaleString("ko-KR");
}

export function formatDashboardAmount(
  value: number | null | undefined,
): string {
  const n = value ?? 0;
  return n.toLocaleString("ko-KR");
}

export function formatChangePercent(
  value: number | null | undefined,
): string | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  return value.toFixed(2);
}
