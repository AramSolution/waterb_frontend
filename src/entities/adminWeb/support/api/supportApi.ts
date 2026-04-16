import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";
import { PRO_PART_DEFAULT_PIPE } from "@/entities/adminWeb/support/lib/proPartNature";

function getAdminProgramEndpoints(): {
  LIST: string;
  EXCEL_LIST: string;
  BASE: string;
  REGISTER: string;
  UPDATE: string;
} {
  return {
    LIST: API_ENDPOINTS.SUPPORT.LIST,
    EXCEL_LIST: API_ENDPOINTS.SUPPORT.EXCEL_LIST,
    BASE: API_ENDPOINTS.SUPPORT.BASE,
    REGISTER: API_ENDPOINTS.SUPPORT.REGISTER,
    UPDATE: API_ENDPOINTS.SUPPORT.UPDATE,
  };
}

// 지원사업 목록 조회 요청 파라미터 (백엔드 ArtpromListRequest와 매핑)
export interface SupportListParams {
  start?: number; // 시작 인덱스 (0부터 시작)
  length?: number; // 페이지 사이즈
  startIndex?: number; // 내부 사용 (start와 동일)
  lengthPage?: number; // 내부 사용 (length와 동일)
  searchRecFromDd?: string; // 모집기간 시작일 (YYYYMMDD 형식)
  searchRecToDd?: string; // 모집기간 종료일 (YYYYMMDD 형식)
  proGb?: string; // 사업구분 (PRO_GB) - 예: 01(샘플업무), 02(스터디 사업)
  // 테이블 필터 파라미터 (클라이언트 사이드 필터링용, 백엔드에는 전달하지 않음)
  filterStatus?: string; // 상태 필터
  filterBusinessId?: string; // 사업ID 필터
  filterBusinessNm?: string; // 사업명 필터
  filterRecruitTarget?: string; // 모집대상 필터
  filterRecruitYear?: string; // 모집연수 필터
  /** 멘토신청관리 등: true 시 REQ_GB 멘토=Y만 조회. 미지정 시 false(백엔드 기본과 동일) */
  isMentor?: boolean;
}

// 지원사업 정보 타입 (백엔드 ArtpromDTO와 매핑)
export interface Support {
  rnum?: string; // 번호 (ROW_NUMBER)
  proId?: string; // 사업ID (PRO_ID)
  proGb?: string; // 사업구분 (PRO_GB)
  proType?: string; // 사업유형 (PRO_TYPE)
  proNm?: string; // 사업명 (PRO_NM)
  proTargetNm?: string; // 모집대상명 (PRO_TARGET_NM)
  proTarget?: string; // 모집대상 (PRO_TARGET)
  recFromDd?: string; // 모집기간 시작일 (YYYYMMDD 형식) (REC_FROM_DD)
  recToDd?: string; // 모집기간 종료일 (YYYYMMDD 형식) (REC_TO_DD)
  recCnt?: number; // 모집연수 (REC_CNT)
  proSum?: string; // 사업요약 (PRO_SUM)
  proDesc?: string; // 사업설명 (PRO_DESC)
  etcNm?: string; // 기타내용 (ETC_NM, VARCHAR 512)
  proFileId?: string; // 사업파일ID (PRO_FILE_ID)
  fileId?: string; // 파일ID (FILE_ID)
  eduGb?: string; // 스터디사업용 사업구분 (EDU_GB) - 01: 마중물, 02: 희망
  sttusCode?: string; // 상태코드 (ARTAPPM STTUS_CODE: 01 임시저장, 02 신청, 03 승인, 04 완료, 11 반려, 12 중단, 99 취소)
  runSta?: string; // 진행상태 (RUN_STA). 샘플업무(PRO_GB 01): 01 모집예정, 02 모집중, 04 모집마감, 99 취소
  reqGb?: string; // 신청구분 (REQ_GB) - Y|Y|N|N 형식 (학생|학부모|학원|멘토)
  // 기존 필드와의 호환성을 위한 매핑
  businessId?: string; // proId와 동일
  businessNm?: string; // proNm과 동일
  status?: string; // runSta 우선, 없으면 sttusCode
  recruitTarget?: string; // proTargetNm과 동일
  recruitStartDate?: string; // recFromDd와 동일 (YYYY-MM-DD 형식으로 변환)
  recruitEndDate?: string; // recToDd와 동일 (YYYY-MM-DD 형식으로 변환)
  recruitYear?: string; // recCnt와 동일 (문자열로 변환)
  businessStartDate?: string; // recFromDd와 동일
  businessEndDate?: string; // recToDd와 동일
  [key: string]: any;
}

// 지원사업 목록 응답 타입
export interface SupportListResponse {
  result?: string;
  recordsFiltered?: string | number;
  recordsTotal?: string | number;
  data?: Support[];
  Array?: Support[];
  [key: string]: any;
}

// 지원사업 상세 조회 요청 파라미터
export interface SupportDetailParams {
  proId: string; // 사업ID
}

// 상세 조회 시 파일 항목 (백엔드 proFileList, fileList 항목)
export interface SupportFileItem {
  fileId?: string;
  seq?: string;
  orgfNm?: string;
  saveNm?: string;
  filePath?: string;
  fileExt?: string;
  fileSize?: number;
  fileType?: string;
  sttusCode?: string;
  [key: string]: unknown;
}

// 지원사업 상세 조회 응답 타입
export interface SupportDetailResponse {
  result?: string;
  detail?: Support;
  /** 홍보파일 목록 (PRO_FILE_ID로 조회) */
  proFileList?: SupportFileItem[];
  /** 첨부파일 목록 (FILE_ID로 조회) */
  fileList?: SupportFileItem[];
  [key: string]: any;
}

/** GET /api/admin/artprom/{proId}/pro-target — 백엔드 ArtpromProTargetResponse */
export interface ArtpromProTargetResponse {
  proId?: string;
  proTarget?: string;
}

/** GET /api/admin/artprom/{proId}/pro-gb — 백엔드 ArtpromProGbResponse */
export interface ArtpromProGbResponse {
  proId?: string;
  proGb?: string;
}

/** GET /api/admin/artprom/mentor-application/businesses — 멘토신청관리 사업명 셀렉트 */
export interface ArtpromMentorApplicationBusinessItem {
  proId?: string;
  proGb?: string;
  /** 사업구분명 (LETTCCMMNDETAILCODE EDR000) */
  proGbNm?: string;
  proType?: string;
  reqGb?: string;
  proNm?: string;
  runSta?: string;
  sttusCode?: string;
}

export interface ArtpromMentorApplicationBusinessListResponse {
  result?: string;
  message?: string;
  data?: ArtpromMentorApplicationBusinessItem[];
}

// 지원사업 등록 요청 파라미터 (백엔드 ArtpromInsertRequest와 매핑)
export interface SupportRegisterParams {
  proGb?: string; // 사업코드 (PRO_GB)
  proType?: string; // 사업유형 (PRO_TYPE)
  eduGb?: string; // 스터디사업 사업구분 (EDU_GB) - 01: 마중물, 02: 희망
  proNm: string; // 사업명 (PRO_NM) - 필수
  proTargetNm?: string; // 모집대상명 (PRO_TARGET_NM)
  proTarget: string; // 모집대상 (PRO_TARGET) - 콤마 구분 문자열 - 필수
  recFromDd: string; // 모집기간 시작일 (YYYYMMDD 형식) (REC_FROM_DD) - 필수
  recToDd: string; // 모집기간 종료일 (YYYYMMDD 형식) (REC_TO_DD) - 필수
  recCnt?: number; // 모집인원수 (REC_CNT)
  proFromDd?: string; // 사업기간 시작 (PRO_FROM_DD)
  proToDd?: string; // 사업기간 종료 (PRO_TO_DD)
  proSum?: string; // 사업개요 (PRO_SUM)
  proDesc?: string; // 사업설명 (PRO_DESC)
  etcNm?: string; // 기타내용 (ETC_NM, VARCHAR 512)
  proFileId?: string; // 사업파일ID (PRO_FILE_ID)
  fileId?: string; // 파일ID (FILE_ID)
  runSta?: string; // 진행상태 (RUN_STA). 샘플업무(PRO_GB 01): 01 모집예정, 02 모집중, 04 모집마감, 99 취소
  sttusCode?: string; // 사용여부 (STTUS_CODE) - A(사용)/D(삭제)
  reqGb?: string; // 신청구분 (REQ_GB) - Y|Y|N|N 형식 (학생|학부모|학원|멘토)
  /** 사업성격 (PRO_PART) — Y|N 5슬롯, 홍보 등록과 동일 */
  proPart?: string;
  /** 담당부서 (PRO_DEPA) */
  proDepa?: string;
  /** 담당자 (PRO_CHARGE) */
  proCharge?: string;
  /** 연락처 (PRO_TEL) */
  proTel?: string;
  /** 신청방법 (PRO_HOW) */
  proHow?: string;
  /** 홈페이지·URL (PRO_PAGE) */
  proPage?: string;
  basicYn?: string; // 기초생활수급자 (BASIC_YN) - Y/N
  poorYn?: string; // 차상위계층 (POOR_YN) - Y/N
  singleYn?: string; // 한부모가족 (SINGLE_YN) - Y/N
  UNIQ_ID?: string; // 최종변경자 (로그인 사용자 uniqId)
  proFile?: File; // 홍보파일 1개 (multipart)
  artpromFiles?: File[]; // 첨부파일 여러 개 (multipart)
}

// 지원사업 등록 응답 타입
export interface SupportRegisterResponse {
  result: string;
  message: string;
  [key: string]: any;
}

// 지원사업 수정 요청 파라미터 (백엔드 ArtpromUpdateRequest와 매핑)
export interface SupportUpdateParams {
  proId: string; // 사업ID (PRO_ID) - 필수
  proGb?: string; // 사업코드 (PRO_GB)
  proType?: string; // 사업유형 (PRO_TYPE)
  eduGb?: string; // 스터디사업 사업구분 (EDU_GB) - 01: 마중물, 02: 희망
  proNm: string; // 사업명 (PRO_NM) - 필수
  proTargetNm?: string; // 모집대상명 (PRO_TARGET_NM)
  proTarget: string; // 모집대상 (PRO_TARGET) - 콤마 구분 문자열 - 필수
  recFromDd: string; // 모집기간 시작일 (YYYYMMDD 형식) (REC_FROM_DD) - 필수
  recToDd: string; // 모집기간 종료일 (YYYYMMDD 형식) (REC_TO_DD) - 필수
  recCnt?: number; // 모집인원수 (REC_CNT)
  proFromDd?: string;
  proToDd?: string;
  proSum?: string; // 사업개요 (PRO_SUM)
  proDesc?: string; // 사업설명 (PRO_DESC)
  etcNm?: string; // 기타내용 (ETC_NM, VARCHAR 512)
  proFileId?: string; // 사업파일ID (PRO_FILE_ID)
  fileId?: string; // 파일ID (FILE_ID)
  runSta?: string; // 진행상태 (RUN_STA). 샘플업무(PRO_GB 01): 01 모집예정, 02 모집중, 04 모집마감, 99 취소
  sttusCode?: string; // 사용여부 (STTUS_CODE) - A(사용)/D(삭제)
  reqGb?: string; // 신청구분 (REQ_GB) - Y|Y|N|N 형식 (학생|학부모|학원|멘토)
  /** 사업성격 (PRO_PART) — Y|N 5슬롯 */
  proPart?: string;
  proDepa?: string;
  proCharge?: string;
  proTel?: string;
  proHow?: string;
  proPage?: string;
  basicYn?: string; // 기초생활수급자 (BASIC_YN) - Y/N
  poorYn?: string; // 차상위계층 (POOR_YN) - Y/N
  singleYn?: string; // 한부모가족 (SINGLE_YN) - Y/N
  UNIQ_ID?: string; // 최종변경자 (로그인 사용자 uniqId)
  proFile?: File; // 홍보파일 1개 (multipart, 교체)
  artpromFiles?: File[]; // 첨부파일 추가 (multipart)
}

// 지원사업 수정 응답 타입
export interface SupportUpdateResponse {
  result: string;
  message: string;
  [key: string]: any;
}

// 지원사업 삭제 요청 파라미터
export interface SupportDeleteParams {
  businessId: string;
  uniqId: string;
}

// 지원사업 삭제 응답 타입
export interface SupportDeleteResponse {
  result: string;
  message: string;
  [key: string]: any;
}

// 신청인 목록 조회 요청 파라미터
export interface ApplicantListParams {
  businessId: string;
}

// 신청인 정보 타입
export interface Applicant {
  applicantId: string;
  applicantNm: string;
  applicantEmail: string;
  applicantPhone: string;
  applyDate: string;
  [key: string]: any;
}

// 신청인 목록 응답 타입
export interface ApplicantListResponse {
  data?: Applicant[];
  Array?: Applicant[];
  [key: string]: any;
}

// 백엔드 ArtappmListRequest 타입 (백엔드 API 요청 형식)
interface ArtappmListRequest {
  start?: number;
  length?: number;
  startIndex?: number;
  lengthPage?: number;
  searchProId?: string; // 사업ID (필수)
  searchProSeq?: string; // 회차
  searchReqEsntlId?: string; // 신청자 ID
  searchSttusCode?: string; // 상태
  searchResultGb?: string; // 선정여부
  searchUserNm?: string; // 신청자명 (SQL: DECRYPT(U.USER_NM) LIKE)
}

// 백엔드 ArtappmDTO 타입 (백엔드 API 응답 형식)
export interface ArtappmDTO {
  reqId?: string; // 지원사업신청ID (REQ_ID)
  proId?: string;
  proSeq?: string;
  reqEsntlId?: string;
  cEsntlId?: string;
  /** 신청 유형 코드/명 (예: 1인탐구형/모둠탐구형 등) */
  proType?: string;
  proTypeNm?: string;
  userNm?: string; // 신청자명(학생 이름) - SQL: USER_NM
  headNm?: string; // 세대주명
  pEsntlId?: string; // 학부모ID
  pUserNm?: string; // 보호자명
  pMbtlnum?: string; // (사용 안 함) 과거 필드
  mbtlnum?: string; // 보호자 연락처 - SQL: MBTLNUM
  cMbtlnum?: string; // 학생 연락처 - SQL: C_MBTLNUM
  brthdy?: string; // 생년월일
  pIhidnum?: string; // 학부모 주민번호
  cIhidnum?: string; // 학생 주민번호
  certYn?: string;
  schoolGb?: string; // 학교구분
  schoolNm?: string; // 학교명
  schoolLvl?: number; // 학교레벨
  schoolNo?: number; // 학교번호
  payBankCode?: string;
  payBank?: string;
  holderNm?: string; // 예금주
  reqPart?: string;
  playPart?: string;
  reqObj?: string;
  reqPlay?: string;
  reqPlan?: string;
  mchilYn?: string; // 다자녀유무
  mchilNm?: string; // 다자녀명
  reqDesc?: string;
  fileId?: string;
  resultGb?: string; // 선정여부
  reqDt?: string; // 신청일시
  aprrDt?: string; // 승인일시
  chgDt?: string; // 변경일시
  stopDt?: string; // 중단일시
  reaDesc?: string; // 사유
  sttusCode?: string; // 상태코드 (ARTAPPM: 01 임시저장, 02 신청, 03 승인, 04 완료, 11 반려, 12 중단, 99 취소)
  chgUserId?: string;
  crtDate?: string;
  chgDate?: string;
  zip?: string; // 우편번호
  adres?: string; // 주소
  detailAdres?: string; // 상세주소
  fullAdres?: string; // 전체 주소(ADRES + DETAIL_ADRES)
  rnum?: string; // 번호
}

// 백엔드 ArtappmListResponse 타입
interface ArtappmListResponse {
  data?: ArtappmDTO[];
  recordsTotal?: number;
  recordsFiltered?: number;
  result?: string;
}

// 수강확인증 목록 조회 요청 (ArtappmListRequest와 동일한 키 사용)
export interface StudyCertListParams {
  start?: number;
  length?: number;
  /** reqId 전용 (있으면 searchProId/searchReqEsntlId 미사용) */
  searchReqId?: string;
  searchProId?: string;
  searchProSeq?: string;
  searchReqEsntlId?: string;
}

// 수강확인증 목록 1건 (백엔드 StudyCertListItemResponse)
export interface StudyCertListItemDto {
  rnum?: string;
  reqId?: string;
  proId?: string;
  proSeq?: string;
  reqEsntlId?: string;
  fileId?: number;
  seq?: number;
  uploadDttm?: string;
  fileDesc?: string;
}

// 수강확인증 목록 응답 (백엔드 StudyCertListResponse)
export interface StudyCertListResponse {
  data?: StudyCertListItemDto[];
  recordsTotal?: number;
  recordsFiltered?: number;
  result?: string;
}

// 수강확인증 삭제 파라미터 (reqId 전용)
export interface StudyCertDeleteParams {
  reqId: string;
  seq: number;
}

// 수강확인증 삭제 응답 (백엔드 ArtappmResultResponse)
export interface StudyCertDeleteResponse {
  result?: string;
  message?: string;
}

// 수강확인증 업로드 요청 (백엔드 StudyCertUploadRequest, multipart "data" 파트)
// seq 없음=추가(append), 있음=해당 SEQ 수정. 수정 시 studyCertFile 없으면 FILE_DESC·UPLOAD_DTTM만 갱신
export interface StudyCertUploadData {
  fileDesc?: string;
  uploadDttm?: string; // yyyy-MM-dd 또는 yyyy-MM-dd HH:mm:ss, 없으면 서버 NOW()
  seq?: number; // 수정 시 해당 수강확인증 SEQ
}

// 수강확인증 상세 1건 (백엔드 StudyCertDetailResponse)
export interface StudyCertDetailItemDto {
  uploadDttm?: string; // 일자 (Date → ISO string)
  fileDesc?: string; // 내용
  fileId?: string;
  seq?: number;
  orgfNm?: string; // 원본 파일명
}

// 수강확인증 상세 조회 API 응답 (백엔드 StudyCertDetailApiResponse)
export interface StudyCertDetailApiResponse {
  detail?: StudyCertDetailItemDto | null;
  result?: string;
  message?: string;
}

// 선정관리용 신청 목록 조회 요청 (백엔드 ArtappmSelectionListRequest)
export interface SelectionListParams {
  proId: string; // 지원사업코드 (필수, 프론트 businessId와 동일)
}

// 선정관리용 신청 목록 조회 응답 (백엔드 ArtappmExcelListResponse)
export interface SelectionListResponse {
  data?: ArtappmDTO[];
  result?: string;
}

// 랜덤 신청자 선정 요청 (백엔드 ChoiceListRequest)
export interface ChoiceListRequest {
  /** 구분 (01: artappm) */
  aGubun: string;
  /** 사업 ID */
  aProId: string;
  /** 사업 회차 */
  aProSeq: number;
  /** 선정 인원 수 */
  aDataCnt: number;
  /** 선정 순위 옵션 (파이프 구분 문자열: 01|00|00|00 등) */
  aRank: string;
}

// 랜덤 신청자 선정 응답 1건 (백엔드 ChoiceListResponse)
export interface ChoiceListItem {
  seqNo?: number;
  cEsntlId?: string;
}

// 선정관리 선정여부 일괄 변경 요청 아이템 (백엔드 ArtappmSelectionUpdateRequest, REQ_ID 기준)
export interface SelectionUpdateItem {
  reqId: string;
  /** Y(선정), N(미선정), R(예비) */
  resultGb: string;
}

// 선정관리 선정여부 일괄 변경 요청 (백엔드 ArtappmSelectionBatchUpdateRequest)
export interface SelectionBatchUpdateRequest {
  list: SelectionUpdateItem[];
}

// 선정관리 선정여부 일괄 변경 응답 (백엔드 ArtappmResultResponse)
export interface SelectionBatchUpdateResponse {
  result?: string;
  message?: string;
}

// 일정관리: ARTPROD 1건 (백엔드 ArtprodScheduleItemResponse)
export interface ArtprodScheduleItemDto {
  proId?: string;
  proSeq?: number;
  spaceId?: string;
  workDate?: string;
  startTime?: string;
  endTime?: string;
  weekYn?: string;
  /** 모집인원 등 (REC_CNT) */
  recCnt?: string;
  item1?: string;
  item2?: string;
  item3?: string;
  item4?: string;
  useYn?: string;
}

// 일정관리 목록 응답 (백엔드 ArtprodScheduleListResponse)
export interface ArtprodScheduleListResponse {
  result?: string;
  data?: ArtprodScheduleItemDto[];
}

// 일정관리 목록 + 신청 인원 응답 (백엔드 ArtprodScheduleItemResponse + APPLY_CNT)
export interface ArtprodScheduleWithApplyItemDto extends ArtprodScheduleItemDto {
  applyCnt?: number;
  applyCntStr?: string;
}

export interface ArtprodScheduleWithApplyListResponse {
  result?: string;
  data?: ArtprodScheduleWithApplyItemDto[];
}

// 일정 저장 요청 한 건 (백엔드 ArtprodScheduleItemSaveRequest)
export interface ArtprodScheduleItemSaveDto {
  /** 기존 일정 PRO_SEQ (있으면 UPDATE, 없으면 null/미포함 시 INSERT) */
  proSeq?: number | null;
  /** 사업구분 (PRO_GB) */
  proGb?: string;
  spaceId?: string;
  workDate?: string;
  startTime?: string;
  endTime?: string;
  weekYn?: string;
  /** 모집인원 등 (REC_CNT) */
  recCnt?: string;
  item1?: string;
  item2?: string;
  item3?: string;
  item4?: string;
  useYn?: string;
}

// 일정 저장 요청 (백엔드 ArtprodScheduleSaveRequest)
export interface ArtprodScheduleSaveRequest {
  items?: ArtprodScheduleItemSaveDto[];
}

// 신청목록 상세 리스트 조회 요청 파라미터
export interface SupportDetailListParams {
  businessId: string; // 사업ID (필수)
  applicantNm?: string; // 신청자명 필터 (백엔드: searchUserNm)
  length?: string;
  start?: string;
  // 테이블 필터 파라미터
  filterStatus?: string; // 상태 필터 (접수,승인,거절,취소,완료)
  filterType?: string; // 유형 필터
  filterParentNm?: string; // 보호자명 필터
  filterSchoolNm?: string; // 학교명 필터
  filterStudentNm?: string; // 학생명 필터
}

// 신청목록 상세 정보 타입
export interface SupportDetailItem {
  rnum: string; // 번호
  reqId?: string; // 지원사업신청ID (REQ_ID, 삭제/상세 by-req-id용)
  applicationId: string; // 신청ID
  status: string; // 상태 (접수,승인,거절,취소,완료)
  type: string; // 유형
  resultGb?: string; // 선정여부 (API RESULT_GB)
  parentNm: string; // 보호자명
  parentPhone: string; // 보호자 연락처
  schoolNm: string; // 학교명
  gradeInfo: string; // 학년정보
  studentNm: string; // 학생명
  studentPhone: string; // 학생 연락처
  address: string; // 주소
  businessId: string; // 사업ID
  businessNm: string; // 사업명
  proSeq?: string; // 회차(proSeq) - 상세 조회용
  [key: string]: any;
}

// 신청목록 상세 리스트 응답 타입
export interface SupportDetailListResponse {
  result?: string;
  recordsFiltered?: string | number;
  recordsTotal?: string | number;
  data?: SupportDetailItem[];
  Array?: SupportDetailItem[];
  businessNm?: string; // 사업명
  [key: string]: any;
}

// 신청목록 상세 리스트 삭제 요청 파라미터 (REQ_ID 기준)
export interface SupportDetailDeleteParams {
  /** 지원사업신청ID (REQ_ID). 백엔드 DELETE /api/admin/artappm/{reqId} */
  reqId: string;
}

// 신청목록 상세 리스트 삭제 응답 타입
export interface SupportDetailDeleteResponse {
  result?: string;
  message?: string;
  [key: string]: any;
}

/**
 * PRO_TARGET 원문에서 `|`로 나눈 첫 구간의 첫 문자만 사용 (예: "H1|J2" → "H").
 */
function normalizeProTargetToFirstSegmentFirstChar(
  raw: string | undefined | null,
): string {
  if (raw == null || raw === "") return "";
  const firstSegment = raw.split("|")[0]?.trim() ?? "";
  if (!firstSegment) return "";
  return firstSegment.charAt(0);
}

// 지원사업 서비스
// TODO: 백엔드 API 완료 후 실제 구현
export class SupportService {
  /**
   * 지원사업 목록 조회
   */
  static async getSupportList(
    params: SupportListParams,
  ): Promise<SupportListResponse> {
    try {
      const ep = getAdminProgramEndpoints();
      // 상태 필터: 백엔드 ArtpromListRequest는 searchRunSta 필드 사용 (RUN_STA 조건)
      const searchRunSta =
        params.filterStatus && params.filterStatus.trim() !== ""
          ? params.filterStatus
          : undefined;
      const searchProNm =
        params.filterBusinessNm && params.filterBusinessNm.trim() !== ""
          ? params.filterBusinessNm.trim()
          : undefined;

      const isMentor = params.isMentor === true;

      // 백엔드 요청 형식에 맞게 변환
      const requestParams: any = {
        start: params.start ?? 0,
        length: params.length ?? 15,
        startIndex: params.start ?? 0, // 백엔드 SQL에서 사용하는 파라미터
        lengthPage: params.length ?? 15, // 백엔드 SQL에서 사용하는 파라미터
        searchRecFromDd: params.searchRecFromDd || undefined,
        searchRecToDd: params.searchRecToDd || undefined,
        searchRunSta, // 샘플업무 기본(PRO_GB 01): 01 모집예정, 02 모집중, 04 모집마감, 99 취소
        searchProNm,
        isMentor: params.isMentor ?? false,
      };
      if (!isMentor) {
        requestParams.searchProGb = params.proGb || "01";
      }

      console.log(
        "📤 백엔드로 전달되는 요청 파라미터:",
        JSON.stringify(requestParams, null, 2),
      );
      console.log("📤 날짜 필터 확인:");
      console.log(
        `  - searchRecFromDd: ${requestParams.searchRecFromDd} (타입: ${typeof requestParams.searchRecFromDd})`,
      );
      console.log(
        `  - searchRecToDd: ${requestParams.searchRecToDd} (타입: ${typeof requestParams.searchRecToDd})`,
      );

      const response = await apiClient.post<SupportListResponse>(
        ep.LIST,
        requestParams,
      );

      console.log("📥 API 응답:", response);
      if (response && typeof response === "object") {
        const responseObj = response as SupportListResponse;
        console.log("📥 API 응답 상세:");
        console.log(`  - result: ${responseObj.result}`);
        console.log(`  - recordsTotal: ${responseObj.recordsTotal}`);
        console.log(`  - recordsFiltered: ${responseObj.recordsFiltered}`);
        if (Array.isArray(responseObj.data)) {
          console.log(`  - data.length: ${responseObj.data.length}`);
          if (responseObj.data.length > 0) {
            console.log(
              `  - 첫 번째 데이터의 status: ${responseObj.data[0]?.sttusCode || responseObj.data[0]?.status}`,
            );
          }
        }
      }

      // 응답 데이터를 Support 타입으로 변환 (필드명 매핑)
      if (response.data && Array.isArray(response.data)) {
        response.data = response.data.map((item: any) => {
          const support: Support = {
            ...item,
            // 기존 필드명과의 호환성 유지
            businessId: item.proId,
            businessNm: item.proNm,
            status: item.runSta || item.sttusCode, // 진행상태(runSta) 우선, 없으면 상태코드(sttusCode)
            recruitTarget: item.proTargetNm,
            recruitStartDate: item.recFromDd
              ? `${item.recFromDd.substring(0, 4)}-${item.recFromDd.substring(4, 6)}-${item.recFromDd.substring(6, 8)}`
              : "",
            recruitEndDate: item.recToDd
              ? `${item.recToDd.substring(0, 4)}-${item.recToDd.substring(4, 6)}-${item.recToDd.substring(6, 8)}`
              : "",
            recruitYear: item.recCnt?.toString() || "",
            businessStartDate: item.recFromDd
              ? `${item.recFromDd.substring(0, 4)}-${item.recFromDd.substring(4, 6)}-${item.recFromDd.substring(6, 8)}`
              : "",
            businessEndDate: item.recToDd
              ? `${item.recToDd.substring(0, 4)}-${item.recToDd.substring(4, 6)}-${item.recToDd.substring(6, 8)}`
              : "",
            // 스터디사업 사업구분 코드(EDU_GB) 전달
            eduGb: item.eduGb,
          };
          return support;
        });
      }

      return response;
    } catch (error) {
      console.error("Get support list error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "지원사업 목록을 불러오는 중 오류가 발생했습니다.");
    }
  }

  /**
   * 지원사업 상세 조회 (GET /api/admin/artprom/{proId} 또는 artapps)
   */
  static async getSupportDetail(
    params: SupportDetailParams,
  ): Promise<SupportDetailResponse> {
    try {
      const ep = getAdminProgramEndpoints();
      const response = await apiClient.get<SupportDetailResponse>(
        `${ep.BASE}/${params.proId}`,
      );

      // 응답 데이터를 Support 타입으로 변환 (필드명 매핑)
      if (response.detail) {
        const item = response.detail as any;
        const support: Support = {
          ...item,
          // 기존 필드명과의 호환성 유지
          businessId: item.proId,
          businessNm: item.proNm,
          status: item.runSta || item.sttusCode, // 진행상태(runSta) 우선, 없으면 상태코드(sttusCode)
          recruitTarget: item.proTargetNm,
          recruitStartDate: item.recFromDd
            ? `${item.recFromDd.substring(0, 4)}-${item.recFromDd.substring(4, 6)}-${item.recFromDd.substring(6, 8)}`
            : "",
          recruitEndDate: item.recToDd
            ? `${item.recToDd.substring(0, 4)}-${item.recToDd.substring(4, 6)}-${item.recToDd.substring(6, 8)}`
            : "",
          recruitYear: item.recCnt?.toString() || "",
          businessStartDate: item.recFromDd
            ? `${item.recFromDd.substring(0, 4)}-${item.recFromDd.substring(4, 6)}-${item.recFromDd.substring(6, 8)}`
            : "",
          businessEndDate: item.recToDd
            ? `${item.recToDd.substring(0, 4)}-${item.recToDd.substring(4, 6)}-${item.recToDd.substring(6, 8)}`
            : "",
          reqGb: item.reqGb || "", // 신청구분 추가
          eduGb: item.eduGb, // 스터디사업 사업구분 코드
        };
        response.detail = support;
      }

      return response;
    } catch (error) {
      console.error("Get support detail error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "지원사업 상세 정보를 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 지원사업 사업대상(PRO_TARGET) 조회 (GET /api/admin/artprom/{proId}/pro-target)
   */
  static async getProTarget(proId: string): Promise<ArtpromProTargetResponse> {
    const trimmed = proId?.trim();
    if (!trimmed) {
      return { proId: "", proTarget: "" };
    }
    try {
      const response = await apiClient.get<ArtpromProTargetResponse>(
        API_ENDPOINTS.SUPPORT.PRO_TARGET(trimmed),
      );
      const base = response ?? { proId: trimmed, proTarget: "" };
      return {
        ...base,
        proId: base.proId ?? trimmed,
        proTarget: normalizeProTargetToFirstSegmentFirstChar(base.proTarget),
      };
    } catch (error) {
      console.error("Get PRO_TARGET error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "사업대상(PRO_TARGET) 정보를 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 지원사업 사업구분(PRO_GB) 조회 (GET /api/admin/artprom/{proId}/pro-gb)
   */
  static async getProGb(proId: string): Promise<string> {
    const trimmed = proId?.trim();
    if (!trimmed) return '';
    try {
      const response = await apiClient.get<ArtpromProGbResponse>(
        API_ENDPOINTS.SUPPORT.PRO_GB(trimmed),
      );
      const base = response ?? { proId: trimmed, proGb: '' };
      return String(base.proGb ?? '').trim();
    } catch (error) {
      console.error('Get PRO_GB error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, '사업구분(PRO_GB) 정보를 불러오는 중 오류가 발생했습니다.');
    }
  }

  /**
   * 멘토신청관리 — 사업명 셀렉트용 지원사업 목록
   * GET /api/admin/artprom/mentor-application/businesses
   */
  static async getMentorApplicationBusinessList(): Promise<
    ArtpromMentorApplicationBusinessItem[]
  > {
    try {
      const response =
        await apiClient.get<ArtpromMentorApplicationBusinessListResponse>(
          API_ENDPOINTS.SUPPORT.MENTOR_APPLICATION_BUSINESSES,
        );
      if (response?.result !== "00") {
        throw new ApiError(
          0,
          response?.message ||
            "멘토 신청용 사업 목록을 불러오지 못했습니다.",
        );
      }
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "멘토 신청용 사업 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 지원사업 등록
   */
  static async registerSupport(
    params: SupportRegisterParams,
  ): Promise<SupportRegisterResponse> {
    try {
      const ep = getAdminProgramEndpoints();
      // 날짜 형식 변환: YYYY-MM-DD -> YYYYMMDD
      const convertDateToYYYYMMDD = (dateStr: string): string => {
        if (!dateStr) return "";
        return dateStr.replace(/-/g, "");
      };

      // 체크박스 값을 DB 저장 형식으로 변환 (ELEMENTARY_1 → E1, HIGH_1 → H1 등)
      const convertTargetToDbFormat = (targetStr: string): string => {
        const targetMapping: { [key: string]: string } = {
          ELEMENTARY_1: "E1",
          ELEMENTARY_2: "E2",
          ELEMENTARY_3: "E3",
          ELEMENTARY_4: "E4",
          ELEMENTARY_5: "E5",
          ELEMENTARY_6: "E6",
          MIDDLE_1: "J1",
          MIDDLE_2: "J2",
          MIDDLE_3: "J3",
          HIGH_1: "H1",
          HIGH_2: "H2",
          HIGH_3: "H3",
          OTHER: "T1", // 기타: DB는 T1 사용
        };

        return targetStr
          .split(",")
          .map((value) => {
            const trimmed = value.trim();
            return targetMapping[trimmed] || trimmed;
          })
          .filter((v) => v !== "")
          .join("|");
      };

      // 모집대상명 생성 (E1/J1/H1/T1 및 구 형식 지원)
      const getTargetNm = (targetArray: string[]): string => {
        const targetLabels: { [key: string]: string } = {
          E1: "초등학생 1학년",
          E2: "초등학생 2학년",
          E3: "초등학생 3학년",
          E4: "초등학생 4학년",
          E5: "초등학생 5학년",
          E6: "초등학생 6학년",
          J1: "중학생 1학년",
          J2: "중학생 2학년",
          J3: "중학생 3학년",
          H1: "고등학생 1학년",
          H2: "고등학생 2학년",
          H3: "고등학생 3학년",
          T1: "기타1",
          ELEMENTARY_1: "초등학생 1학년",
          ELEMENTARY_2: "초등학생 2학년",
          ELEMENTARY_3: "초등학생 3학년",
          ELEMENTARY_4: "초등학생 4학년",
          ELEMENTARY_5: "초등학생 5학년",
          ELEMENTARY_6: "초등학생 6학년",
          MIDDLE_1: "중학생 1학년",
          MIDDLE_2: "중학생 2학년",
          MIDDLE_3: "중학생 3학년",
          HIGH_1: "고등학생 1학년",
          HIGH_2: "고등학생 2학년",
          HIGH_3: "고등학생 3학년",
          OTHER: "기타",
        };

        return targetArray
          .map((value) => targetLabels[value] || value)
          .join(", ");
      };

      // 사업대상 배열을 문자열로 변환
      const targetArray = params.proTarget
        .split(",")
        .filter((t) => t.trim() !== "");
      // 폼에서 입력한 사업대상명이 있으면 사용, 없으면 자동 생성
      const proTargetNm =
        (params.proTargetNm && params.proTargetNm.trim()) ||
        getTargetNm(targetArray);
      // DB 저장 형식으로 변환 (E1, H1 등)
      const proTargetDb = convertTargetToDbFormat(params.proTarget);

      // sessionStorage에서 사용자 정보 가져오기
      let uniqId = "";
      try {
        if (typeof window !== "undefined") {
          const userStr = sessionStorage.getItem("user");
          if (userStr) {
            const user = JSON.parse(userStr);
            uniqId = user?.uniqId || user?.uniq_id || "";
          }
        }
      } catch (error) {
        console.error("user 객체 파싱 오류:", error);
      }

      if (!uniqId) {
        console.warn(
          "⚠️ UNIQ_ID를 찾을 수 없습니다. sessionStorage의 user 객체를 확인하세요.",
        );
      }

      const requestParams: any = {
        proGb: params.proGb || "01", // 기본값: 01
        proType: params.proType || "02", // 기본값: 02
        eduGb: params.eduGb || "", // 스터디사업 사업구분 (01: 마중물, 02: 희망)
        proNm: params.proNm,
        proTargetNm: proTargetNm,
        proTarget: proTargetDb, // DB 형식으로 변환된 값 (E1, H1 등)
        recFromDd: convertDateToYYYYMMDD(params.recFromDd),
        recToDd: convertDateToYYYYMMDD(params.recToDd),
        recCnt: params.recCnt ? parseInt(params.recCnt.toString(), 10) : 0,
        proFromDd: convertDateToYYYYMMDD(params.proFromDd ?? ""),
        proToDd: convertDateToYYYYMMDD(params.proToDd ?? ""),
        proSum: params.proSum || "",
        proDesc: params.proDesc || "",
        etcNm: params.etcNm ?? "",
        proFileId: params.proFileId || "",
        fileId: params.fileId || "",
        runSta: params.runSta || "01", // 진행상태 01~99
        sttusCode: "A", // 사용여부 A(사용)/D(삭제)
        reqGb: params.reqGb || "", // 신청구분 (Y|Y|N|N 형식)
        proPart: params.proPart?.trim() || PRO_PART_DEFAULT_PIPE,
        proDepa: params.proDepa?.trim() ?? "",
        proCharge: params.proCharge?.trim() ?? "",
        proTel: params.proTel?.trim() ?? "",
        proHow: params.proHow?.trim() ?? "",
        proPage: params.proPage?.trim() ?? "",
        basicYn: params.basicYn || "N", // 기초생활수급자 (Y/N, 기본값: N)
        poorYn: params.poorYn || "N", // 차상위계층 (Y/N, 기본값: N)
        singleYn: params.singleYn || "N", // 한부모가족 (Y/N, 기본값: N)
        UNIQ_ID: params.UNIQ_ID || uniqId,
      };

      // 백엔드 multipart: data(JSON), proFile(선택), artpromFiles(선택)
      const formData = new FormData();
      formData.append(
        "data",
        new Blob([JSON.stringify(requestParams)], { type: "application/json" }),
      );
      if (params.proFile && params.proFile.size > 0) {
        formData.append("proFile", params.proFile);
      }
      if (params.artpromFiles && params.artpromFiles.length > 0) {
        params.artpromFiles.forEach((file) =>
          formData.append("artpromFiles", file),
        );
      }

      const response = await apiClient.post<SupportRegisterResponse>(
        ep.REGISTER,
        formData,
      );

      return response;
    } catch (error) {
      console.error("Register support error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "지원사업 등록 중 오류가 발생했습니다.");
    }
  }

  /**
   * 지원사업 수정
   */
  static async updateSupport(
    params: SupportUpdateParams,
  ): Promise<SupportUpdateResponse> {
    try {
      const ep = getAdminProgramEndpoints();
      // 날짜 형식 변환: YYYY-MM-DD -> YYYYMMDD
      const convertDateToYYYYMMDD = (dateStr: string): string => {
        if (!dateStr) return "";
        return dateStr.replace(/-/g, "");
      };

      // 체크박스 값을 DB 저장 형식으로 변환 (ELEMENTARY_1 → E1, HIGH_1 → H1 등)
      const convertTargetToDbFormat = (targetStr: string): string => {
        const targetMapping: { [key: string]: string } = {
          ELEMENTARY_1: "E1",
          ELEMENTARY_2: "E2",
          ELEMENTARY_3: "E3",
          ELEMENTARY_4: "E4",
          ELEMENTARY_5: "E5",
          ELEMENTARY_6: "E6",
          MIDDLE_1: "J1",
          MIDDLE_2: "J2",
          MIDDLE_3: "J3",
          HIGH_1: "H1",
          HIGH_2: "H2",
          HIGH_3: "H3",
          OTHER: "T1", // 기타: DB는 T1 사용
        };

        return targetStr
          .split(",")
          .map((value) => {
            const trimmed = value.trim();
            return targetMapping[trimmed] || trimmed;
          })
          .filter((v) => v !== "")
          .join("|");
      };

      // 모집대상명 생성 (E1/J1/H1/T1 및 구 형식 지원)
      const getTargetNm = (targetArray: string[]): string => {
        const targetLabels: { [key: string]: string } = {
          E1: "초등학생 1학년",
          E2: "초등학생 2학년",
          E3: "초등학생 3학년",
          E4: "초등학생 4학년",
          E5: "초등학생 5학년",
          E6: "초등학생 6학년",
          J1: "중학생 1학년",
          J2: "중학생 2학년",
          J3: "중학생 3학년",
          H1: "고등학생 1학년",
          H2: "고등학생 2학년",
          H3: "고등학생 3학년",
          T1: "기타1",
          ELEMENTARY_1: "초등학생 1학년",
          ELEMENTARY_2: "초등학생 2학년",
          ELEMENTARY_3: "초등학생 3학년",
          ELEMENTARY_4: "초등학생 4학년",
          ELEMENTARY_5: "초등학생 5학년",
          ELEMENTARY_6: "초등학생 6학년",
          MIDDLE_1: "중학생 1학년",
          MIDDLE_2: "중학생 2학년",
          MIDDLE_3: "중학생 3학년",
          HIGH_1: "고등학생 1학년",
          HIGH_2: "고등학생 2학년",
          HIGH_3: "고등학생 3학년",
          OTHER: "기타",
        };

        return targetArray
          .map((value) => targetLabels[value] || value)
          .join(", ");
      };

      // 사업대상 배열을 문자열로 변환
      const targetArray = params.proTarget
        .split(",")
        .filter((t) => t.trim() !== "");
      // 폼에서 입력한 사업대상명이 있으면 사용, 없으면 자동 생성
      const proTargetNm =
        (params.proTargetNm && params.proTargetNm.trim()) ||
        getTargetNm(targetArray);
      // DB 저장 형식으로 변환 (E1, H1 등)
      const proTargetDb = convertTargetToDbFormat(params.proTarget);

      // sessionStorage에서 사용자 정보 가져오기
      let uniqId = "";
      try {
        if (typeof window !== "undefined") {
          const userStr = sessionStorage.getItem("user");
          if (userStr) {
            const user = JSON.parse(userStr);
            uniqId = user?.uniqId || user?.uniq_id || "";
          }
        }
      } catch (error) {
        console.error("user 객체 파싱 오류:", error);
      }

      if (!uniqId) {
        console.warn(
          "⚠️ UNIQ_ID를 찾을 수 없습니다. sessionStorage의 user 객체를 확인하세요.",
        );
      }

      const requestParams: any = {
        proId: params.proId,
        proGb: params.proGb || "01", // 기본값: 01
        proType: params.proType || "02", // 기본값: 02
        eduGb: params.eduGb || "", // 스터디사업 사업구분 (01: 마중물, 02: 희망)
        proNm: params.proNm,
        proTargetNm: proTargetNm,
        proTarget: proTargetDb, // DB 형식으로 변환된 값 (E1, H1 등)
        recFromDd: convertDateToYYYYMMDD(params.recFromDd),
        recToDd: convertDateToYYYYMMDD(params.recToDd),
        recCnt: params.recCnt ? parseInt(params.recCnt.toString(), 10) : 0,
        proFromDd: convertDateToYYYYMMDD(params.proFromDd ?? ""),
        proToDd: convertDateToYYYYMMDD(params.proToDd ?? ""),
        proSum: params.proSum || "",
        proDesc: params.proDesc || "",
        etcNm: params.etcNm ?? "",
        proFileId: params.proFileId || "",
        fileId: params.fileId || "",
        runSta: params.runSta || "01", // 진행상태 01~99
        sttusCode: "A", // 사용여부 A(사용)/D(삭제)
        reqGb: params.reqGb || "", // 신청구분 (Y|Y|N|N 형식)
        proPart: params.proPart?.trim() || PRO_PART_DEFAULT_PIPE,
        proDepa: params.proDepa?.trim() ?? "",
        proCharge: params.proCharge?.trim() ?? "",
        proTel: params.proTel?.trim() ?? "",
        proHow: params.proHow?.trim() ?? "",
        proPage: params.proPage?.trim() ?? "",
        basicYn: params.basicYn || "N", // 기초생활수급자 (Y/N, 기본값: N)
        poorYn: params.poorYn || "N", // 차상위계층 (Y/N, 기본값: N)
        singleYn: params.singleYn || "N", // 한부모가족 (Y/N, 기본값: N)
        UNIQ_ID: params.UNIQ_ID || uniqId,
      };

      // 백엔드 multipart + PUT: data(JSON), proFile(선택), artpromFiles(선택)
      const formData = new FormData();
      formData.append(
        "data",
        new Blob([JSON.stringify(requestParams)], { type: "application/json" }),
      );
      if (params.proFile && params.proFile.size > 0) {
        formData.append("proFile", params.proFile);
      }
      if (params.artpromFiles && params.artpromFiles.length > 0) {
        params.artpromFiles.forEach((file) =>
          formData.append("artpromFiles", file),
        );
      }

      const response = await apiClient.put<SupportUpdateResponse>(
        ep.UPDATE,
        formData,
      );

      return response;
    } catch (error) {
      console.error("Update support error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "지원사업 수정 중 오류가 발생했습니다.");
    }
  }

  /**
   * 지원사업 삭제 (DELETE /api/admin/artprom/{proId} 또는 artapps; uniqId 쿼리 선택)
   */
  static async deleteSupport(
    params: SupportDeleteParams,
  ): Promise<SupportDeleteResponse> {
    try {
      const ep = getAdminProgramEndpoints();
      const uniqIdQs =
        params.uniqId != null && String(params.uniqId).trim() !== ""
          ? `?uniqId=${encodeURIComponent(String(params.uniqId))}`
          : "";
      const response = await apiClient.delete<SupportDeleteResponse>(
        `${ep.BASE}/${params.businessId}${uniqIdQs}`,
      );

      return response;
    } catch (error) {
      console.error("Delete support error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "지원사업 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 홍보파일 1건 삭제 (DELETE /api/admin/artprom/{proId}/pro-files/{fileId}/{seq})
   */
  static async deleteProFile(
    proId: string,
    fileId: string | number,
    seq: string | number,
  ): Promise<SupportDeleteResponse> {
    try {
      const ep = getAdminProgramEndpoints();
      const response = await apiClient.delete<SupportDeleteResponse>(
        `${ep.BASE}/${proId}/pro-files/${fileId}/${seq}`,
      );
      return response;
    } catch (error) {
      console.error("Delete pro file error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "홍보파일 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 첨부파일 1건 삭제 (DELETE /api/admin/artprom/{proId}/files/{fileId}/{seq})
   */
  static async deleteFile(
    proId: string,
    fileId: string | number,
    seq: string | number,
  ): Promise<SupportDeleteResponse> {
    try {
      const ep = getAdminProgramEndpoints();
      const response = await apiClient.delete<SupportDeleteResponse>(
        `${ep.BASE}/${proId}/files/${fileId}/${seq}`,
      );
      return response;
    } catch (error) {
      console.error("Delete file error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "첨부파일 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 지원사업 엑셀 목록 조회
   * 엑셀 다운로드용 지원사업 목록을 조회합니다(검색 조건 적용, 페이징 없음).
   */
  static async getSupportsExcel(
    params: Omit<SupportListParams, "length" | "start">,
  ): Promise<SupportListResponse> {
    try {
      const ep = getAdminProgramEndpoints();
      // 엑셀 다운로드는 페이징 파라미터 제외, 검색 조건만 포함 (백엔드 searchRunSta 사용)
      const searchRunSta =
        params.filterStatus && params.filterStatus.trim() !== ""
          ? params.filterStatus
          : undefined;
      const searchProNm =
        params.filterBusinessNm && params.filterBusinessNm.trim() !== ""
          ? params.filterBusinessNm.trim()
          : undefined;
      const isMentor = params.isMentor === true;
      const requestParams: any = {
        searchRecFromDd: params.searchRecFromDd || undefined,
        searchRecToDd: params.searchRecToDd || undefined,
        searchRunSta, // 샘플업무 기본(PRO_GB 01): 01 모집예정, 02 모집중, 04 모집마감, 99 취소
        searchProNm,
        isMentor: params.isMentor ?? false,
      };
      if (!isMentor) {
        requestParams.searchProGb = params.proGb || "01";
      }

      const response = await apiClient.post<SupportListResponse>(
        ep.EXCEL_LIST,
        requestParams,
      );

      // 응답 데이터를 Support 타입으로 변환 (필드명 매핑)
      if (response.data && Array.isArray(response.data)) {
        response.data = response.data.map((item: any) => {
          const support: Support = {
            ...item,
            // 기존 필드명과의 호환성 유지
            businessId: item.proId,
            businessNm: item.proNm,
            status: item.runSta || item.sttusCode, // 진행상태(runSta) 우선, 없으면 상태코드(sttusCode)
            recruitTarget: item.proTargetNm,
            recruitStartDate: item.recFromDd
              ? `${item.recFromDd.substring(0, 4)}-${item.recFromDd.substring(4, 6)}-${item.recFromDd.substring(6, 8)}`
              : "",
            recruitEndDate: item.recToDd
              ? `${item.recToDd.substring(0, 4)}-${item.recToDd.substring(4, 6)}-${item.recToDd.substring(6, 8)}`
              : "",
            recruitYear: item.recCnt?.toString() || "",
            businessStartDate: item.recFromDd
              ? `${item.recFromDd.substring(0, 4)}-${item.recFromDd.substring(4, 6)}-${item.recFromDd.substring(6, 8)}`
              : "",
            businessEndDate: item.recToDd
              ? `${item.recToDd.substring(0, 4)}-${item.recToDd.substring(4, 6)}-${item.recToDd.substring(6, 8)}`
              : "",
          };
          return support;
        });
      }

      return response;
    } catch (error) {
      console.error("Get supports excel error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "지원사업 Excel 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 신청인 목록 조회
   * TODO: 백엔드 API 완료 후 구현
   */
  static async getApplicantList(
    params: ApplicantListParams,
  ): Promise<ApplicantListResponse> {
    // TODO: 백엔드 API 완료 후 실제 구현
    // try {
    //   const response = await apiClient.post<ApplicantListResponse>(
    //     API_ENDPOINTS.SUPPORT.APPLICANT_LIST,
    //     params
    //   );
    //   return response;
    // } catch (error) {
    //   console.error("Get applicant list error:", error);
    //   if (error instanceof ApiError) {
    //     throw error;
    //   }
    //   throw new ApiError(0, "신청인 목록을 불러오는 중 오류가 발생했습니다.");
    // }

    // 임시: 빈 응답 반환
    return {
      data: [],
    };
  }

  /**
   * 신청목록 상세 리스트 조회
   * 백엔드 API: POST /api/admin/artappm/list
   */
  static async getSupportDetailList(
    params: SupportDetailListParams,
  ): Promise<SupportDetailListResponse> {
    try {
      const startIndex = parseInt(params.start ?? "0", 10) || 0;
      const lengthPage = parseInt(params.length ?? "15", 10) || 15;

      // searchProId 검증
      if (!params.businessId || params.businessId.trim() === "") {
        throw new ApiError(400, "사업ID(businessId)는 필수입니다.");
      }

      // 백엔드 요청 형식으로 변환
      const requestParams: ArtappmListRequest = {
        start: startIndex,
        length: lengthPage,
        startIndex: startIndex,
        lengthPage: lengthPage,
        searchProId: params.businessId, // 필수: 사업ID
        searchUserNm: params.applicantNm || undefined, // 신청자명 필터 (학생명)
        // searchSttusCode: params.filterStatus || undefined, // 상태 필터 (필요시)
      };

      console.log(
        "📤 신청목록 상세 리스트 조회 요청:",
        JSON.stringify(requestParams, null, 2),
      );

      const response = await apiClient.post<ArtappmListResponse>(
        API_ENDPOINTS.SUPPORT.DETAIL_LIST,
        requestParams,
      );

      console.log("📥 신청목록 상세 리스트 조회 응답 (원본):", response);
      console.log("📥 응답 데이터 타입:", typeof response);
      console.log("📥 응답.data 타입:", typeof response.data);
      console.log("📥 응답.data 길이:", response.data?.length);

      // 응답이 없거나 데이터가 없는 경우
      if (!response || !response.data || response.data.length === 0) {
        console.warn("⚠️ 응답 데이터가 없습니다.");
        return {
          result: response?.result || "00",
          recordsTotal: response?.recordsTotal || 0,
          recordsFiltered: response?.recordsFiltered || 0,
          data: [],
          businessNm: "",
        };
      }

      // 백엔드 응답을 프론트엔드 형식으로 변환
      const mappedData: SupportDetailItem[] =
        response.data.map((item: ArtappmDTO) => {
          console.log("📦 매핑 중인 아이템:", item);
          // 학년정보 조합 (schoolLvl + schoolNo) - 백엔드 SQL과 동일하게 표시
          const schoolLvl =
            item.schoolLvl !== undefined && item.schoolLvl !== null
              ? Number(item.schoolLvl)
              : undefined;
          const schoolNo =
            item.schoolNo !== undefined && item.schoolNo !== null
              ? Number(item.schoolNo)
              : undefined;
          const hasLvl = !!schoolLvl && schoolLvl > 0;
          const hasNo = !!schoolNo && schoolNo > 0;
          const gradeInfo =
            hasLvl && hasNo
              ? `${schoolLvl}학년 ${schoolNo}반`
              : hasLvl
                ? `${schoolLvl}학년`
                : hasNo
                  ? `${schoolNo}반`
                  : "";

          // 주소 조합: FULL_ADRES 우선, 없으면 ADRES + DETAIL_ADRES
          const address =
            item.fullAdres ||
            [item.adres || "", item.detailAdres || ""].join(" ").trim();

          return {
            rnum: item.rnum || "",
            reqId: item.reqId || "", // 지원사업신청ID (삭제/상세 by-req-id용)
            applicationId: item.reqEsntlId || "", // 신청자 ID
            status: item.sttusCode || "", // 상태코드 (ARTAPPM: 04 완료, 11 반려, 12 중단 등)
            type: item.proTypeNm || item.proType || "", // 유형 (1인탐구형/모둠탐구형 등)
            resultGb: item.resultGb || "", // 선정여부 (API RESULT_GB)
            parentNm: item.pUserNm || "", // 보호자명
            parentPhone: item.mbtlnum || "", // 보호자 연락처 (MBTLNUM)
            schoolNm: item.schoolNm || "", // 학교명
            gradeInfo: gradeInfo, // 학년정보
            studentNm: item.userNm || "", // 학생명(신청자명)
            studentPhone: item.cMbtlnum || "", // 학생 연락처 (C_MBTLNUM)
            address,
            businessId: item.proId || params.businessId,
            businessNm: "", // 사업명은 별도 조회 필요
            proSeq: item.proSeq || "",
            // 백엔드 원본 데이터도 포함 (필요시 사용)
            ...item,
          };
        }) || [];

      console.log("✅ 최종 매핑된 데이터:", {
        count: mappedData.length,
        firstItem: mappedData[0],
        total: response.recordsTotal || 0,
      });

      return {
        result: response.result || "00",
        recordsTotal: response.recordsTotal || 0,
        recordsFiltered: response.recordsFiltered || 0,
        data: mappedData,
        businessNm: "", // 사업명은 별도 조회 필요
      };
    } catch (error) {
      console.error("신청목록 상세 리스트 조회 오류:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "신청목록 상세 리스트를 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 신청목록 상세 리스트 삭제 (REQ_ID 기준)
   * 백엔드 API: DELETE /api/admin/artappm/{reqId}
   */
  static async deleteSupportDetail(
    params: SupportDetailDeleteParams,
  ): Promise<SupportDetailDeleteResponse> {
    try {
      const { reqId } = params;

      if (!reqId || !reqId.trim()) {
        throw new ApiError(400, "신청목록 삭제를 위한 reqId가 필요합니다.");
      }

      const response = await apiClient.delete<SupportDetailDeleteResponse>(
        `${API_ENDPOINTS.SUPPORT.APPLICATION_DETAIL_BASE}/${encodeURIComponent(reqId)}`,
      );

      return response;
    } catch (error) {
      console.error("신청목록 상세 삭제 오류:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "신청목록 상세 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 수강확인증 엑셀 목록 조회 (페이징 없음)
   * 백엔드 API: POST /api/admin/artappm/study-cert-list/excel
   * searchReqId 있으면 reqId 전용, 없으면 searchProId/searchProSeq/searchReqEsntlId.
   */
  static async getStudyCertExcelList(
    params: Omit<StudyCertListParams, "start" | "length">,
  ): Promise<StudyCertListResponse> {
    try {
      const requestBody = params.searchReqId
        ? { searchReqId: params.searchReqId }
        : {
            searchProId: params.searchProId ?? "",
            searchProSeq: params.searchProSeq ?? "0",
            searchReqEsntlId: params.searchReqEsntlId ?? "",
          };
      const response = await apiClient.post<StudyCertListResponse>(
        API_ENDPOINTS.SUPPORT.STUDY_CERT_EXCEL,
        requestBody,
      );
      return response;
    } catch (error) {
      console.error("수강확인증 엑셀 목록 조회 오류:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "수강확인증 엑셀 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 수강확인증 목록 조회
   * 백엔드 API: POST /api/admin/artappm/study-cert-list
   */
  static async getStudyCertList(
    params: StudyCertListParams,
  ): Promise<StudyCertListResponse> {
    try {
      const requestBody = params.searchReqId
        ? {
            start: params.start ?? 0,
            length: params.length ?? 15,
            searchReqId: params.searchReqId,
          }
        : {
            start: params.start ?? 0,
            length: params.length ?? 15,
            searchProId: params.searchProId ?? "",
            searchProSeq: params.searchProSeq ?? "0",
            searchReqEsntlId: params.searchReqEsntlId ?? "",
          };
      const response = await apiClient.post<StudyCertListResponse>(
        `${API_ENDPOINTS.SUPPORT.APPLICATION_DETAIL_BASE}/study-cert-list`,
        requestBody,
      );
      return response;
    } catch (error) {
      console.error("수강확인증 목록 조회 오류:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "수강확인증 목록을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 수강확인증 삭제 (reqId 전용)
   * 백엔드 API: DELETE /api/admin/artappm/by-req-id/{reqId}/study-cert?seq=
   */
  static async deleteStudyCert(
    params: StudyCertDeleteParams,
  ): Promise<StudyCertDeleteResponse> {
    try {
      const { reqId, seq } = params;
      const response = await apiClient.delete<StudyCertDeleteResponse>(
        `${API_ENDPOINTS.SUPPORT.APPLICATION_DETAIL_BASE}/by-req-id/${encodeURIComponent(reqId)}/study-cert?seq=${encodeURIComponent(String(seq))}`,
      );
      return response;
    } catch (error) {
      console.error("수강확인증 삭제 오류:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "수강확인증 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 수강확인증 상세 조회 (reqId 전용)
   * 백엔드 API: GET /api/admin/artappm/by-req-id/{reqId}/study-cert?seq=
   */
  static async getStudyCertDetail(params: {
    reqId: string;
    seq: number;
  }): Promise<StudyCertDetailApiResponse> {
    try {
      const { reqId, seq } = params;
      const response = await apiClient.get<StudyCertDetailApiResponse>(
        `${API_ENDPOINTS.SUPPORT.APPLICATION_DETAIL_BASE}/by-req-id/${encodeURIComponent(reqId)}/study-cert?seq=${encodeURIComponent(String(seq))}`,
      );
      return response;
    } catch (error) {
      console.error("수강확인증 상세 조회 오류:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "수강확인증 상세를 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 수강확인증 업로드 (등록/수정, reqId 전용)
   * 백엔드 API: PUT /api/admin/artappm/by-req-id/{reqId}/study-cert
   * data.seq 없음=추가(studyCertFile 필수), 있음=해당 SEQ 수정
   */
  static async uploadStudyCert(params: {
    reqId: string;
    data: StudyCertUploadData;
    studyCertFile?: File;
  }): Promise<StudyCertDeleteResponse> {
    try {
      const { reqId, data, studyCertFile } = params;
      const formData = new FormData();
      formData.append(
        "data",
        new Blob([JSON.stringify(data)], { type: "application/json" }),
      );
      if (studyCertFile != null) {
        formData.append("studyCertFile", studyCertFile);
      }
      const response = await apiClient.put<StudyCertDeleteResponse>(
        `${API_ENDPOINTS.SUPPORT.APPLICATION_DETAIL_BASE}/by-req-id/${encodeURIComponent(reqId)}/study-cert`,
        formData,
      );
      return response;
    } catch (error) {
      console.error("수강확인증 업로드 오류:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, "수강확인증 등록 중 오류가 발생했습니다.");
    }
  }

  /**
   * 신청목록 상세 리스트 엑셀 조회
   * 백엔드 API: POST /api/admin/artappm/excel-list
   */
  static async getSupportDetailListExcel(
    params: Omit<SupportDetailListParams, "length" | "start">,
  ): Promise<SupportDetailListResponse> {
    try {
      // searchProId 검증
      if (!params.businessId || params.businessId.trim() === "") {
        throw new ApiError(400, "사업ID(businessId)는 필수입니다.");
      }

      // 백엔드 요청 형식으로 변환 (페이징 파라미터 제외)
      const requestParams: ArtappmListRequest = {
        searchProId: params.businessId, // 필수: 사업ID
        searchUserNm: params.applicantNm || undefined, // 신청자명 필터 (학생명)
        // searchSttusCode: params.filterStatus || undefined, // 상태 필터 (필요시)
      };

      console.log(
        "📤 신청목록 상세 리스트 엑셀 조회 요청:",
        JSON.stringify(requestParams, null, 2),
      );

      const response = await apiClient.post<ArtappmListResponse>(
        API_ENDPOINTS.SUPPORT.DETAIL_EXCEL_LIST,
        requestParams,
      );

      console.log("📥 신청목록 상세 리스트 엑셀 조회 응답:", response);

      // 백엔드 응답을 프론트엔드 형식으로 변환
      const mappedData: SupportDetailItem[] =
        response.data?.map((item: ArtappmDTO) => {
          // 학년정보 조합 (schoolLvl + schoolNo) - 백엔드 SQL과 동일하게 표시
          const schoolLvl =
            item.schoolLvl !== undefined && item.schoolLvl !== null
              ? Number(item.schoolLvl)
              : undefined;
          const schoolNo =
            item.schoolNo !== undefined && item.schoolNo !== null
              ? Number(item.schoolNo)
              : undefined;
          const hasLvl = !!schoolLvl && schoolLvl > 0;
          const hasNo = !!schoolNo && schoolNo > 0;
          const gradeInfo =
            hasLvl && hasNo
              ? `${schoolLvl}학년 ${schoolNo}반`
              : hasLvl
                ? `${schoolLvl}학년`
                : hasNo
                  ? `${schoolNo}반`
                  : "";

          // 주소 조합: FULL_ADRES 우선, 없으면 ADRES + DETAIL_ADRES
          const address =
            item.fullAdres ||
            [item.adres || "", item.detailAdres || ""].join(" ").trim();

          return {
            rnum: item.rnum || "",
            applicationId: item.reqEsntlId || "", // 신청자 ID
            status: item.sttusCode || "", // 상태코드 (ARTAPPM: 04 완료, 11 반려, 12 중단 등)
            type: item.proTypeNm || item.proType || "", // 유형 (1인탐구형/모둠탐구형 등)
            resultGb: item.resultGb || "", // 선정여부 (API RESULT_GB)
            parentNm: item.pUserNm || "", // 보호자명
            parentPhone: item.mbtlnum || "", // 보호자 연락처 (MBTLNUM)
            schoolNm: item.schoolNm || "", // 학교명
            gradeInfo: gradeInfo, // 학년정보
            studentNm: item.userNm || "", // 학생명(신청자명)
            studentPhone: item.cMbtlnum || "", // 학생 연락처 (C_MBTLNUM)
            address,
            businessId: item.proId || params.businessId,
            businessNm: "", // 사업명은 별도 조회 필요
            // 백엔드 원본 데이터도 포함 (필요시 사용)
            ...item,
          };
        }) || [];

      return {
        result: response.result || "00",
        recordsTotal: response.recordsTotal || mappedData.length,
        recordsFiltered: response.recordsFiltered || mappedData.length,
        data: mappedData,
        businessNm: "", // 사업명은 별도 조회 필요
      };
    } catch (error) {
      console.error("신청목록 상세 리스트 엑셀 조회 오류:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        "신청목록 상세 리스트 엑셀을 불러오는 중 오류가 발생했습니다.",
      );
    }
  }

  /**
   * 선정관리용 지원사업 신청 목록 조회 (페이징 없음)
   * 백엔드 API: POST /api/admin/artappm/selection-list
   */
  static async getSelectionList(
    params: SelectionListParams,
  ): Promise<SelectionListResponse> {
    if (!params.proId || params.proId.trim() === "") {
      throw new ApiError(400, "사업ID(proId)는 필수입니다.");
    }
    const response = await apiClient.post<SelectionListResponse>(
      API_ENDPOINTS.SUPPORT.SELECTION_LIST,
      { proId: params.proId },
    );
    return {
      data: response.data ?? [],
      result: response.result ?? "00",
    };
  }

  /**
   * 랜덤 신청자 선정(f_choicelist)
   * 백엔드 API: POST /api/admin/artappm/choice-list
   */
  static async getChoiceList(
    params: ChoiceListRequest,
  ): Promise<ChoiceListItem[]> {
    if (!params.aProId || params.aProId.trim() === "") {
      throw new ApiError(400, "사업ID(aProId)는 필수입니다.");
    }
    if (!Number.isInteger(params.aProSeq) || params.aProSeq < 0) {
      throw new ApiError(400, "사업회차(aProSeq)가 올바르지 않습니다.");
    }
    if (!Number.isInteger(params.aDataCnt) || params.aDataCnt <= 0) {
      throw new ApiError(400, "선정 인원(aDataCnt)은 1 이상이어야 합니다.");
    }
    if (!params.aRank || params.aRank.trim() === "") {
      throw new ApiError(400, "선정 우선순위(aRank)는 필수입니다.");
    }

    const response = await apiClient.post<
      ChoiceListItem[] | { data?: ChoiceListItem[]; list?: ChoiceListItem[] }
    >(API_ENDPOINTS.SUPPORT.CHOICE_LIST, params);
    const raw = Array.isArray(response)
      ? response
      : ((response as { data?: ChoiceListItem[] })?.data ??
        (response as { list?: ChoiceListItem[] })?.list ??
        []);
    const list = Array.isArray(raw) ? raw : [];
    return list.map((item: any) => ({
      seqNo: item.seqNo ?? item.seq_no,
      cEsntlId: item.cEsntlId ?? item.c_esntl_id ?? "",
    }));
  }

  /**
   * 지원사업 일정 목록 조회 (ARTPROD, 일정관리 화면용)
   * 백엔드 API: GET /api/admin/artprom/{proId}/schedule
   */
  static async getScheduleList(
    proId: string,
  ): Promise<ArtprodScheduleListResponse> {
    if (!proId || proId.trim() === "") {
      return { result: "01", data: [] };
    }
    const response = await apiClient.get<ArtprodScheduleListResponse>(
      `${API_ENDPOINTS.SUPPORT.BASE}/${encodeURIComponent(proId)}/schedule`,
    );
    return {
      result: response.result ?? "00",
      data: response.data ?? [],
    };
  }

  /**
   * 지원사업 일정 + 신청 인원 목록 조회 (ARTPROD + ARTAPPM 집계)
   * 백엔드 API: GET /api/admin/artprom/{proId}/schedule-with-apply
   */
  static async getScheduleListWithApplyCnt(
    proId: string,
  ): Promise<ArtprodScheduleWithApplyListResponse> {
    if (!proId || proId.trim() === "") {
      return { result: "01", data: [] };
    }
    const response = await apiClient.get<ArtprodScheduleWithApplyListResponse>(
      `${API_ENDPOINTS.SUPPORT.BASE}/${encodeURIComponent(proId)}/schedule-with-apply`,
    );
    return {
      result: response.result ?? "00",
      data: response.data ?? [],
    };
  }

  /**
   * 지원사업 일정 저장 (ARTPROD 전건 삭제 후 요청 목록으로 재등록)
   * 백엔드 API: PUT /api/admin/artprom/{proId}/schedule
   */
  static async saveScheduleList(
    proId: string,
    items: ArtprodScheduleItemSaveDto[],
  ): Promise<{ result?: string; message?: string }> {
    if (!proId || proId.trim() === "") {
      return { result: "01", message: "사업 ID가 없습니다." };
    }
    const response = await apiClient.put<{ result?: string; message?: string }>(
      `${API_ENDPOINTS.SUPPORT.BASE}/${encodeURIComponent(proId)}/schedule`,
      { items },
    );
    return response;
  }

  /**
   * 지원사업 일정 한 건 삭제 (ARTPROD)
   * 백엔드 API: DELETE /api/admin/artprom/{proId}/schedule/{proSeq}
   */
  static async deleteScheduleItem(
    proId: string,
    proSeq: number,
  ): Promise<{ result?: string; message?: string }> {
    if (!proId || proId.trim() === "" || proSeq == null) {
      return { result: "01", message: "사업 ID와 일정 번호가 필요합니다." };
    }
    const response = await apiClient.delete<{
      result?: string;
      message?: string;
    }>(
      `${API_ENDPOINTS.SUPPORT.BASE}/${encodeURIComponent(proId)}/schedule/${encodeURIComponent(String(proSeq))}`,
    );
    return response;
  }

  /**
   * 상담일자별 상담장소/시간 목록 (f_selectlist02, 공공형 진로진학 컨설팅 신청 화면 상담장소 SELECT용)
   * 백엔드 API: GET /api/admin/artprom/{proId}/schedule-options?date=YYYY-MM-DD
   */
  static async getScheduleOptions(
    proId: string,
    date: string,
  ): Promise<{ spaceData: string; proSeq: number }[]> {
    if (!proId || proId.trim() === "" || !date || date.trim() === "") {
      return [];
    }
    const response = await apiClient.get<
      | {
          spaceData?: string;
          space_data?: string;
          proSeq?: number;
          pro_seq?: number;
        }[]
      | {
          data?: {
            spaceData?: string;
            space_data?: string;
            proSeq?: number;
            pro_seq?: number;
          }[];
        }
    >(
      `${API_ENDPOINTS.SUPPORT.BASE}/${encodeURIComponent(proId)}/schedule-options?date=${encodeURIComponent(date)}`,
    );
    const raw = Array.isArray(response)
      ? response
      : ((response as { data?: any[] })?.data ?? []);
    if (!Array.isArray(raw)) return [];
    return (raw as any[]).map((item) => ({
      spaceData: item?.spaceData ?? item?.space_data ?? "",
      proSeq: Number(item?.proSeq ?? item?.pro_seq ?? 0),
    }));
  }

  /**
   * 선정관리 선정여부 일괄 변경
   * 백엔드 API: PUT /api/admin/artappm/selection-update
   */
  static async updateSelectionBatch(
    params: SelectionBatchUpdateRequest,
  ): Promise<SelectionBatchUpdateResponse> {
    if (!params.list || params.list.length === 0) {
      throw new ApiError(400, "변경할 선정 목록이 없습니다.");
    }
    const response = await apiClient.put<SelectionBatchUpdateResponse>(
      API_ENDPOINTS.SUPPORT.SELECTION_UPDATE,
      params,
    );
    return response;
  }
}
