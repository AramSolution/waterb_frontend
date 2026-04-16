import type { AdminBannerRow } from "../model/types";

/** API 연동 전 화면 구성용 목 데이터 */
export const MOCK_BANNERS: AdminBannerRow[] = [
  {
    bannerId: "BNR_001",
    title: "메인 히어로 배너",
    content: "포털 메인 상단 노출",
    postStartDttm: "2025-01-01T00:00",
    postEndDttm: "2025-12-31T23:59",
    imageUrl: "/images/logo.png",
    sortOrder: 1,
    useYn: "Y",
  },
  {
    bannerId: "BNR_002",
    title: "이벤트 안내",
    content: "봄맞이 이벤트",
    postStartDttm: "2025-03-01T00:00",
    postEndDttm: "2025-03-31T23:59",
    imageUrl: "/images/logo.png",
    sortOrder: 2,
    useYn: "Y",
  },
];

export function getMockBannerById(
  bannerId: string | null,
): AdminBannerRow | undefined {
  if (!bannerId) return undefined;
  return MOCK_BANNERS.find((b) => b.bannerId === bannerId);
}
