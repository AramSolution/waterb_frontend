/**
 * 지원사업 일정+신청인원 API (`selectArtprodListWithApplyCnt` 등) 공통 타입.
 * `BizInfoRcSection`·`BizInfoGcSection`·`BizInputPrSection`에서 공유.
 */

/** 회차/탐방 모달: 일정 + 신청 인원 목록 응답 행 */
export interface ScheduleWithApplyItem {
  proId?: string;
  proSeq?: number;
  workDate?: string;
  startTime?: string;
  endTime?: string;
  recCnt?: string;
  applyCnt?: number;
  applyCntStr?: string;
  item1?: string;
  item2?: string;
  item3?: string;
  item4?: string;
  spaceIdNm?: string;
  [key: string]: unknown;
}

/**
 * 일정 행의 시작시간. 백엔드 camelCase `startTime` 우선, 환경별 보조 키 대응.
 */
export function resolveScheduleStartTime(item: ScheduleWithApplyItem): string {
  const o = item as Record<string, unknown>;
  const v = item.startTime ?? o.START_TIME ?? o.start_time;
  return v == null ? "" : String(v).trim();
}
