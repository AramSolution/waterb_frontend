/**
 * 사용자웹 전용 API 엔드포인트 + 공통(API_CONFIG, CODE, FILES) re-export
 * 사용자 페이지 수정 시 이 파일만 변경하면 되므로 관리자웹과 충돌을 줄일 수 있음.
 *
 * `WATER_CERT_SIREN` re-export — `api.ts`에서 상수 변경 시 이 import와 사용처를 함께 수정.
 *
 * `USER_GPKI` 아래 절대 URL(`…/water/api/v1/…`)은 외부 행정망 연계 엔드포인트다.
 * 경로가 실제로 바뀔 때만 수정하고, 운영/인증 담당과 확인할 것.
 */
export { API_CONFIG, CODE, FILES, WATER_CERT_SIREN } from "./api";

export const API_ENDPOINTS = {
  /** 공통 - 소분류 코드 (사용자웹에서 은행코드 등 조회) */
  CODE: {
    DETAIL_LIST_BASE: "/api/cont/code",
  },
  /** 공통 - 파일 조회 */
  FILES: {
    VIEW: "/api/v1/files/view",
  },
  /** 사용자웹 - 행정정보 연계(GPKI) */
  USER_GPKI: {
    RESIDE_INSTT_CNFRIM:
      "https://test2.uaram.co.kr:8443/water/api/v1/ResideInsttCnfirm",
    REDUCTION_BSC_LIV_YN:
      "https://test2.uaram.co.kr:8443/water/api/v1/ReductionBscLivYnService",
    REDUCTION_POOR_YN:
      "https://test2.uaram.co.kr:8443/water/api/v1/ReductionPoorYnService",
    REDUCTION_SINGLE_PARENT_YN:
      "https://test2.uaram.co.kr:8443/water/api/v1/ReductionSingleParentYnService",
  },
  ARMUSER_USER: {
    BASE: "/api/user/armuser",
    /** 회원가입 아이디 중복 체크 GET /api/user/armuser/user-id-check?userId= */
    USER_ID_CHECK: (userId: string) =>
      `/api/user/armuser/user-id-check?userId=${encodeURIComponent(userId)}`,
    /** 학원조회 목록: 정상 학원 전부 + 과목(콤마/공백) POST /api/user/armuser/academy-list */
    ACADEMY_LIST: "/api/user/armuser/academy-list",
    /** 로그인한 학원 상세(메인 reqGbPosition=3) GET /api/user/armuser/academy-detail */
    ACADEMY_DETAIL: "/api/user/armuser/academy-detail",
  },
  USER_ARMCHIL: {
    CHILDREN: "/api/user/armchil/children",
    /** 로그인한 학생의 보호자 목록 (학생 신청 시 보호자 선택용) */
    PARENTS: "/api/user/armchil/parents",
  },
  USER_ARTAPPM: {
    BY_STUDENT: "/api/user/artappm/by-student",
    /** 멘토정보(진로진학 상담) 조회 GET ?reqId= */
    MENTOR_INFO: (reqId: string) =>
      `/api/user/artappm/mentor-info?reqId=${encodeURIComponent(reqId)}`,
    /** 멘토정보 저장 PUT (멘토일지, 배정 멘토만) */
    MENTOR_INFO_SAVE: "/api/user/artappm/mentor-info",
    /** 반려 저장 PUT (멘토일지, 사유+상태11. 배정 멘토만) */
    REJECT: "/api/user/artappm/reject",
    /** 멘토정보 첨부파일 업로드 PUT multipart ?reqId= */
    MENTOR_INFO_UPLOAD: (reqId: string) =>
      `/api/user/artappm/mentor-info/upload?reqId=${encodeURIComponent(reqId)}`,
    /** 멘토정보 첨부파일 1건 삭제 DELETE ?reqId=&fileId=&seq= */
    MENTOR_INFO_DELETE_FILE: (reqId: string, fileId: string, seq: number) =>
      `/api/user/artappm/mentor-info/files?reqId=${encodeURIComponent(reqId)}&fileId=${encodeURIComponent(fileId)}&seq=${seq}`,
    /** 멘토일지 진입 시 신청 건 상세(보호자·학생·학교 등) GET ?reqId= (배정 멘토만 허용) */
    MENTOR_DIARY_DETAIL: (reqId: string) =>
      `/api/user/artappm/mentor-diary-detail?reqId=${encodeURIComponent(reqId)}`,
    INSERT: "/api/user/artappm/",
    /** 멘토 신청 등록 POST multipart: data(JSON UserMentorApplicationRegisterRequest), mentorApplicationFiles */
    MENTOR_APPLICATION_REGISTER: (proId: string) =>
      `/api/user/artappm/mentor-applications/${encodeURIComponent(proId)}`,
    /** MY PAGE 멘토 신청 상세 GET — ARTAPMM reqId, 본인만, fileList 선택 */
    MENTOR_APPLICATION_BY_REQ_ID: (reqId: string) =>
      `/api/user/artappm/mentor-application/by-req-id/${encodeURIComponent(reqId)}`,
    /** MY PAGE 전용 수정 PUT (reqId) */
    UPDATE_BY_REQ_ID: (reqId: string) =>
      `/api/user/artappm/by-req-id/${encodeURIComponent(reqId)}`,
    /** @deprecated 파일 삭제는 DELETE_FILE_BY_REQ_ID만 사용 */
    DELETE_FILE_BASE: "/api/user/artappm",
    /** reqId 기준 (PRO_SEQ 변경에 안전): 수강확인증·변경이력·파일삭제 */
    BY_REQ_ID: (reqId: string) =>
      `/api/user/artappm/by-req-id/${encodeURIComponent(reqId)}`,
    /** 수강확인증 상세 GET (reqId) */
    STUDY_CERT_BY_REQ_ID: (reqId: string, seq: number) =>
      `/api/user/artappm/by-req-id/${encodeURIComponent(reqId)}/study-cert?seq=${seq}`,
    /** 수강확인증 업로드 PUT (reqId) */
    STUDY_CERT_PUT_BY_REQ_ID: (reqId: string) =>
      `/api/user/artappm/by-req-id/${encodeURIComponent(reqId)}/study-cert`,
    /** 수강확인증 삭제 POST (reqId, CORS 회피) */
    STUDY_CERT_DELETE_BY_REQ_ID: (reqId: string, seq: number) =>
      `/api/user/artappm/by-req-id/${encodeURIComponent(reqId)}/study-cert/delete?seq=${seq}`,
    /** 변경이력 목록 GET (reqId) */
    CHANGE_LIST_BY_REQ_ID: (reqId: string) =>
      `/api/user/artappm/by-req-id/${encodeURIComponent(reqId)}/change-list`,
    /** 첨부파일 1건 삭제 DELETE (reqId) */
    DELETE_FILE_BY_REQ_ID: (reqId: string, fileId: string, seq: number) =>
      `/api/user/artappm/by-req-id/${encodeURIComponent(reqId)}/files/${encodeURIComponent(fileId)}/${seq}`,
    /** 수강확인증 목록(사용자, 페이징 없음) */
    STUDY_CERT_LIST: "/api/user/artappm/study-cert-list",
    /** 변경이력 목록 (proId, proSeq, reqEsntlId) - 레거시 */
    CHANGE_LIST_BASE: "/api/user/artappm",
  },
  USER_ARTPROM: {
    LIST: "/api/user/artprom/list",
    /** 포털(/userWeb) 메인 카드 슬라이더용 (REQ_GB 필터 없음) */
    MAIN_CARDS: (includePromo?: boolean) =>
      `/api/user/artprom/main-cards${
        includePromo != null
          ? `?includePromo=${encodeURIComponent(String(includePromo))}`
          : ""
      }`,
    MY_APPLIED_LIST: "/api/user/artprom/my-applied/list",
    /** MY PAGE 멘토 신청현황 — POST JSON `{ sttusCode? }` — MNR만 ARTAPMM 목록, 그 외 빈 배열 */
    MY_APPLIED_MENTOR_LIST: "/api/user/artprom/my-applied/mentor/list",
    /** MY PAGE 즐겨찾기 목록 POST JSON `{ start?, length? }` — 로그인 사용자 ARTMARK 기준 */
    MY_FAVORITE_LIST: "/api/user/artprom/my-favorite/list",
    DETAIL: "/api/user/artprom",
    /** 상담일자별 상담장소/시간 목록 GET /api/user/artprom/{proId}/schedule-options?date=YYYY-MM-DD */
    SCHEDULE_OPTIONS: (proId: string, date: string) =>
      `/api/user/artprom/${encodeURIComponent(proId)}/schedule-options?date=${encodeURIComponent(date)}`,
    /** 기준년월별 목록(접수현황 달력) GET /api/user/artprom/{proId}/list01-options?workYm=YYYYMM */
    LIST01_OPTIONS: (proId: string, workYm: string) =>
      `/api/user/artprom/${encodeURIComponent(proId)}/list01-options?workYm=${encodeURIComponent(workYm)}`,
    /** 지역연계 진로체험(proGb 05) 회차 목록 GET /api/user/artprom/{proId}/schedules (회차 모달용) */
    SCHEDULES: (proId: string) =>
      `/api/user/artprom/${encodeURIComponent(proId)}/schedules`,
    /** 지원사업 일정 + 신청 인원 목록 조회(회차·탐방국가 등) GET /api/user/artprom/{proId}/schedule-with-apply — proGb 05·07 등 */
    SCHEDULE_WITH_APPLY: (proId: string) =>
      `/api/user/artprom/${encodeURIComponent(proId)}/schedule-with-apply`,
    /** 즐겨찾기 저장 POST JSON `{ proId }` — 로그인 필수, 401 시 프론트에서 로그인 모달 */
    FAVORITE: "/api/user/artprom/favorite",
    /** 즐겨찾기 삭제 DELETE — `proId` 경로 */
    FAVORITE_BY_PRO_ID: (proId: string) =>
      `/api/user/artprom/favorite/${encodeURIComponent(proId)}`,
  },
  USER_BANNER: {
    /** 사용자웹 메인 배너 목록 (기간/구분 필터는 body로 전달) */
    LIST: "/api/user/banner/list",
  },
  /** 가맹학원 목록 (사용자웹 학원목록 모달) */
  USER_ARTEDUM: {
    LIST: "/api/user/artedum/list",
  },
  /** NEIS 학교/학급 정보 (학교검색 모달) */
  NEIS: {
    GUNSAN_SCHOOLS: "/api/neis/gunsan-schools",
    CLASS_INFO: "/api/neis/class-info",
  },
  /** 사용자웹 게시글 목록 (공지/지원사업 등) GET ?bbsId=&limit=&offset= */
  USER_ARTICLES: "/api/user/articles",
  /** 사용자웹 아카이브 전용 목록 GET ?bbsId=&limit=&offset=&searchKeyword= (본문 LIKE) */
  USER_ARTICLES_ARCHIVE: "/api/user/articles/archive",
  /** 사용자웹 게시글 상세 GET ?bbsId=&nttId= */
  USER_ARTICLE_DETAIL: "/api/user/articles/detail",
  /** 사용자웹 아카이브 상세(현재+이전+다음) GET ?bbsId=&nttId= */
  USER_ARTICLES_ARCHIVE_DETAIL: "/api/user/articles/archive/detail",
  /** 사용자웹 비밀글 비밀번호 확인 POST body: { bbsId, nttId, password } */
  USER_ARTICLE_CONFIRM_PASSWORD: "/api/user/articles/confirm-password",
  /** 사용자웹 게시판 설정 조회 GET ?bbsId= (비밀글 사용 여부 secretYn, 글쓰기 비밀번호 입력란 노출용) */
  USER_ARTICLE_BOARD_SETTINGS: "/api/user/articles/board-settings",
  /** 사용자웹 게시글 등록 (묻고답하기 등) POST multipart - 관리자 insertArticle.Ajax 동일 */
  USER_ARTICLE_REGISTER: "/api/cont/bord/insertArticle.Ajax",
  /** 멘토업무(사용자웹) - 사업검색 모달 목록 / 정보조회 목록 */
  USER_MENTOR_WORK: {
    PROJECTS: "/api/user/mentor-work/projects",
    LIST: "/api/user/mentor-work/list",
  },
};

/** 사용자웹 자료실 통합 게시판 — `/userWeb/qna?tab=archive`, 커뮤니티 `tab=eumArchive`(이음 아카이브). ARMBORD `BBS_0000000000000025`와 동일 ID 유지 */
export const USER_ARCHIVE_BBS_ID = "BBS_0000000000000025";

/** 커뮤니티 `tab=guide` · 사이드「일반 자료실」— ARMBORD `BBS_0000000000000024`과 동일 ID 유지 */
export const USER_GENERAL_ARCHIVE_BBS_ID = "BBS_0000000000000024";

/** 게시판 BBS_ID (커뮤니티 탭별 목록 조회용) */
export const USER_BOARD_BBS_IDS = {
  NOTICE: "BBS_0000000000000001",
  SUPPORT: "BBS_0000000000000002",
  /** 문의하기 (ARMBORD에 등록된 bbsId와 맞출 것) */
  INQUIRY: "BBS_0000000000000005",
  /** 이용안내(레거시 URL `bbsId` 호환용; 목록은 `USER_GENERAL_ARCHIVE_BBS_ID` 사용) */
  GUIDE: "BBS_0000000000000007",
  /** 일반 자료실 — `USER_GENERAL_ARCHIVE_BBS_ID`와 동일 */
  GENERAL_ARCHIVE: USER_GENERAL_ARCHIVE_BBS_ID,
  /** 묻고 답하기 (메인/QnA 페이지, 학생) */
  QNA: "BBS_0000000000000009",
  /** 학부모 묻고 답하기 (reqGbPosition=2 또는 type=parent일 때) */
  QNA_PARENT: "BBS_0000000000000012",
  /** 학원 묻고 답하기 (reqGbPosition=3일 때) */
  QNA_ACADEMY: "BBS_0000000000000015",
  /** 멘토 묻고 답하기 (reqGbPosition=4일 때) */
  QNA_MENTOR: "BBS_0000000000000018",
  /** 묻고 답하기: 학교 (reqGbPosition=5 또는 type=school) */
  QNA_SCHOOL: "BBS_0000000000000021",
  /** 자료실 — 역할 구분 없이 `USER_ARCHIVE_BBS_ID`와 동일 */
  ARCHIVE_STUDENT: USER_ARCHIVE_BBS_ID,
  ARCHIVE_PARENT: USER_ARCHIVE_BBS_ID,
  ARCHIVE_ACADEMY: USER_ARCHIVE_BBS_ID,
  ARCHIVE: USER_ARCHIVE_BBS_ID,
  ARCHIVE_SCHOOL: USER_ARCHIVE_BBS_ID,
  /** 공지사항: 학생 */
  NOTICE_STUDENT: "BBS_0000000000000008",
  /** 공지사항: 학부모 */
  NOTICE_PARENT: "BBS_0000000000000011",
  /** 공지사항: 학원 */
  NOTICE_ACADEMY: "BBS_0000000000000014",
  /** 공지사항: 멘토 */
  NOTICE_MENTOR: "BBS_0000000000000017",
  /** 공지사항: 학교 (reqGbPosition=5 또는 type=school) */
  NOTICE_SCHOOL: "BBS_0000000000000022",
};

function isParent(reqGbPosition: string | null, type: string | null): boolean {
  return type === "parent" || reqGbPosition === "2";
}

function isSchool(reqGbPosition: string | null, type: string | null): boolean {
  return type === "school" || reqGbPosition === "5";
}

/**
 * URL에 reqGbPosition/type이 없을 때 로그인 userSe(SNR/PNR/ANR/MNR)로 게시판 구분.
 * URL에 둘 중 하나라도 있으면 URL 우선(공유 링크 등).
 */
export function resolveUserWebBoardParams(
  urlReqGbPosition: string | null,
  urlType: string | null,
  userSe: string | null | undefined,
): { reqGbPosition: string | null; type: string | null } {
  const req =
    urlReqGbPosition != null && urlReqGbPosition !== ""
      ? urlReqGbPosition
      : null;
  const typ = urlType != null && urlType !== "" ? urlType : null;
  if (req != null || typ != null) {
    return { reqGbPosition: req, type: typ };
  }
  if (!userSe) {
    return { reqGbPosition: null, type: null };
  }
  switch (userSe) {
    case "SNR":
      return { reqGbPosition: "1", type: null };
    case "PNR":
      return { reqGbPosition: "2", type: null };
    case "ANR":
      return { reqGbPosition: "3", type: null };
    case "MNR":
      return { reqGbPosition: "4", type: null };
    default:
      return { reqGbPosition: null, type: null };
  }
}

/** 묻고 답하기 BBS_ID: 학부모=0012, 학원(3)=0015, 멘토(4)=0018, 학교=0021, 그 외(학생)=0009 */
export function getQnaBbsId(
  reqGbPosition: string | null,
  type: string | null,
): string {
  if (isParent(reqGbPosition, type)) return USER_BOARD_BBS_IDS.QNA_PARENT;
  if (reqGbPosition === "3") return USER_BOARD_BBS_IDS.QNA_ACADEMY;
  if (reqGbPosition === "4") return USER_BOARD_BBS_IDS.QNA_MENTOR;
  if (isSchool(reqGbPosition, type)) return USER_BOARD_BBS_IDS.QNA_SCHOOL;
  return USER_BOARD_BBS_IDS.QNA;
}

/** 자료실 BBS_ID: 통합 `USER_ARCHIVE_BBS_ID` (BBS_0000000000000025). 역할·URL 파라미터와 무관. */
export function getArchiveBbsId(
  _reqGbPosition: string | null,
  _type?: string | null,
): string {
  return USER_ARCHIVE_BBS_ID;
}

/** 공지사항 BBS_ID: 학생=0008, 학부모=0011, 학원(3)=0014, 멘토(4)=0017, 학교=0022 */
export function getNoticeBbsId(
  reqGbPosition: string | null,
  type?: string | null,
): string {
  if (reqGbPosition === "3") return USER_BOARD_BBS_IDS.NOTICE_ACADEMY;
  if (reqGbPosition === "4") return USER_BOARD_BBS_IDS.NOTICE_MENTOR;
  if (isParent(reqGbPosition, type ?? null))
    return USER_BOARD_BBS_IDS.NOTICE_PARENT;
  if (isSchool(reqGbPosition, type ?? null))
    return USER_BOARD_BBS_IDS.NOTICE_SCHOOL;
  return USER_BOARD_BBS_IDS.NOTICE_STUDENT;
}
