import { apiClient } from "@/shared/lib";
import { API_ENDPOINTS } from "@/shared/config/apiUser";

/** GET /api/user/articles 목록 1건 (백엔드 ArticleListItemResponse) */
export interface UserArticleListItem {
  nttId: number | null;
  bbsId: string | null;
  nttSj: string | null;
  ntcrNm: string | null;
  ntcrDt: string | null;
  rdcnt: number | null;
  noticeAt: string | null;
  atchFileId: string | null;
  /** 아카이브 목록 API 전용 — 썸네일(NTT_IMG_FILE_ID) */
  nttImgFileId?: string | null;
  /** 아카이브 목록 API 전용 — 썸네일 캐시 무효화 */
  nttImgSaveNm?: string | null;
  answerCnt?: number | null;
  secretAt?: string | null;
}

/** GET /api/user/articles 응답 본문 */
export interface UserArticleListResponse {
  data?: UserArticleListItem[] | null;
  recordsTotal?: number;
  recordsFiltered?: number;
}

/**
 * 목록 조회 쿼리 (백엔드 ArticleManage_SQL_mysql.xml selectArticleList와 동일)
 * - searchCondition: 1=전체(제목 OR 작성자 OR 본문), 2=제목, 3=작성자, 4=본문
 */
export interface UserArticleListParams {
  bbsId: string;
  limit: number;
  offset: number;
  searchCondition?: "1" | "2" | "3" | "4";
  searchKeyword?: string;
}

/**
 * 사용자웹 게시글 목록 (공지/지원사업/문의/이용안내)
 * GET /api/user/articles?bbsId=&limit=&offset=&searchCondition=&searchKeyword=
 */
export async function getUserArticleList(
  params: UserArticleListParams,
): Promise<UserArticleListResponse> {
  const qs = new URLSearchParams();
  qs.set("bbsId", params.bbsId);
  qs.set("limit", String(params.limit));
  qs.set("offset", String(params.offset));
  const kw = params.searchKeyword?.trim() ?? "";
  if (kw) {
    qs.set("searchCondition", params.searchCondition ?? "1");
    qs.set("searchKeyword", kw);
  }
  const url = `${API_ENDPOINTS.USER_ARTICLES}?${qs.toString()}`;
  return apiClient.get<UserArticleListResponse>(url);
}

/** GET /api/user/articles/archive 목록 1건 */
export interface ArchiveArticleListItem {
  nttId: number | null;
  bbsId: string | null;
  nttSj: string | null;
  nttCn: string | null;
  nttImgFileId: string | null;
  /** 목록 썸네일 캐시 무효화용(저장 파일명) */
  nttImgSaveNm?: string | null;
}

export interface ArchiveArticleListResponse {
  data?: ArchiveArticleListItem[] | null;
  totalRegisteredCount?: number;
  recordsTotal?: number;
  recordsFiltered?: number;
}

export interface ArchiveArticleListParams {
  bbsId: string;
  limit: number;
  offset: number;
  searchKeyword?: string;
  /** 백엔드 `selectArticleList`와 동일: 1 통합, 2 제목, 3 작성자, 4 내용 */
  searchCondition?: "1" | "2" | "3" | "4";
}

/**
 * 사용자웹 아카이브 전용 목록 (이음 아카이브 등)
 * GET /api/user/articles/archive?bbsId=&limit=&offset=&searchKeyword=&searchCondition=
 */
export async function getArchiveArticleList(
  params: ArchiveArticleListParams,
): Promise<ArchiveArticleListResponse> {
  const qs = new URLSearchParams();
  qs.set("bbsId", params.bbsId);
  qs.set("limit", String(params.limit));
  qs.set("offset", String(params.offset));
  const kw = params.searchKeyword?.trim() ?? "";
  if (kw) {
    qs.set("searchKeyword", kw);
    if (params.searchCondition) {
      qs.set("searchCondition", params.searchCondition);
    }
  }
  const url = `${API_ENDPOINTS.USER_ARTICLES_ARCHIVE}?${qs.toString()}`;
  return apiClient.get<ArchiveArticleListResponse>(url);
}

/** 게시글 상세(사용자웹) — 아카이브 네비 응답에 중첩 */
export interface ArticleDetailApi {
  nttId?: number | null;
  bbsId?: string | null;
  bbsNm?: string | null;
  nttSj?: string | null;
  nttCn?: string | null;
  nttImgFileId?: string | null;
  nttData1?: string | null;
  nttData2?: string | null;
  nttData3?: string | null;
  nttData5?: string | null;
  nttData6?: string | null;
  rdcnt?: number | null;
  ntcrNm?: string | null;
  ntcrDt?: string | null;
  noticeAt?: string | null;
  maskNtcrNm?: string | null;
  atchFileId?: string | null;
  answerCnt?: number | null;
  attacheFiles?: {
    fileId: string;
    seq: number;
    orgfNm: string | null;
    saveNm?: string | null;
  }[];
  /** NTT_IMG_FILE_ID 그룹 내 이미지(seq 오름차순). 없으면 `nttImgFileId` 단일 표시 */
  nttImgFiles?: {
    fileId: string;
    seq: number;
    orgfNm: string | null;
    saveNm?: string | null;
  }[];
  prevArticle?: { nttId?: number | null; nttSj?: string | null } | null;
  nextArticle?: { nttId?: number | null; nttSj?: string | null } | null;
}

export interface ArchiveArticleDetailNavApi {
  prevArchive?: ArticleDetailApi | null;
  currentArchive?: ArticleDetailApi | null;
  nextArchive?: ArticleDetailApi | null;
}

/**
 * 이음 아카이브 상세 — 현재 글 + 이전/다음 글(전체 DTO)
 * GET /api/user/articles/archive/detail?bbsId=&nttId=
 */
export async function getArchiveArticleDetailNav(
  bbsId: string,
  nttId: number,
): Promise<ArchiveArticleDetailNavApi> {
  const qs = new URLSearchParams();
  qs.set("bbsId", bbsId);
  qs.set("nttId", String(nttId));
  const url = `${API_ENDPOINTS.USER_ARTICLES_ARCHIVE_DETAIL}?${qs.toString()}`;
  return apiClient.get<ArchiveArticleDetailNavApi>(url);
}
