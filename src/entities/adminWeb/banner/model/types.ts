export interface AdminBannerRow {
  bannerId: string;
  title: string;
  content: string;
  /** 시작 일시 (`datetime-local` 값, 예: 2025-01-01T09:00) */
  postStartDttm: string;
  /** 종료 일시 */
  postEndDttm: string;
  imageUrl: string;
  sortOrder: number;
  /** 사용 Y / 미사용 N */
  useYn: string;
  /** 목록 화면 표시용 행 번호 */
  rnum?: string;
}
