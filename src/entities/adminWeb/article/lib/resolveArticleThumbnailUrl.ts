import { API_CONFIG, FILES } from "@/shared/config/api";

/** 백엔드 FileUtil / FileManageController.isAllowedThumbSize 와 동일 */
export const ARTICLE_FILE_THUMB_SIZES = [32, 64, 128, 256, 500] as const;
export type ArticleFileThumbSize = (typeof ARTICLE_FILE_THUMB_SIZES)[number];

/** 아카이브·목록 미리보기용 기본 썸네일 크기 */
export const ARTICLE_ARCHIVE_LIST_THUMB_SIZE: ArticleFileThumbSize = 128;

/** 사용자웹 이음 아카이브 목록 카드용(약 500px) */
export const USER_EUM_ARCHIVE_LIST_THUMB_SIZE: ArticleFileThumbSize = 500;

function appendThumbSize(
  url: string,
  thumbSize: number | undefined,
): string {
  if (
    thumbSize == null ||
    !ARTICLE_FILE_THUMB_SIZES.includes(thumbSize as ArticleFileThumbSize)
  ) {
    return url;
  }
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}thumbSize=${encodeURIComponent(String(thumbSize))}`;
}

/**
 * 게시글 첨부(ATCH_FILE_ID = 파일 그룹 ID)의 1건을 미리보기/썸네일로 표시할 때 사용하는 URL.
 * 백엔드: GET `/api/v1/files/view?fileId=&seq=` — 선택적 `thumbSize`(32|64|128|256|500)
 */
export function resolveArticleAttachmentViewUrl(
  fileId: string | null | undefined,
  seq: string | number = 1,
  thumbSize?: number,
): string {
  const id = String(fileId ?? "").trim();
  if (!id) return "";
  const base = API_CONFIG.BASE_URL?.replace(/\/$/, "") ?? "";
  if (!base) return "";
  const core = `${base}${FILES.VIEW}?fileId=${encodeURIComponent(id)}&seq=${encodeURIComponent(String(seq))}`;
  return appendThumbSize(core, thumbSize);
}

export interface ResolveArticleImageUrlOptions {
  /** 지정 시 `...&thumbSize=` 추가 (서버에 해당 썸네일 파일이 있을 때만 유효) */
  thumbSize?: number;
  /**
   * 같은 fileId+seq URL이라도 물리 파일이 바뀌면(재정렬 등) 브라우저가 옛 이미지를 캐시할 수 있음.
   * saveNm 등 행 단위 고유값을 넣어 캐시 무효화.
   */
  cacheBust?: string;
}

function appendCacheBust(url: string, cacheBust: string | undefined): string {
  if (cacheBust == null || String(cacheBust).trim() === "") {
    return url;
  }
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_cb=${encodeURIComponent(String(cacheBust).trim())}`;
}

/** NTT_IMG_FILE_ID를 표시용 절대 URL로 변환 (seq는 기본 0) */
export function resolveArticleImageUrl(
  path: string | null | undefined,
  options?: ResolveArticleImageUrlOptions,
): string {
  const p = String(path ?? "").trim();
  if (!p) return "";

  const thumbSize = options?.thumbSize;

  // DB 저장 포맷: "fileId" (신규), "fileId:seq" (레거시 호환)
  const idSeqMatch = p.match(/^(\d+)(?::(\d+))?$/);
  if (idSeqMatch) {
    const fileId = idSeqMatch[1];
    const seq = idSeqMatch[2] || "0";
    const base = API_CONFIG.BASE_URL?.replace(/\/$/, "") ?? "";
    if (!base) return "";
    const core = `${base}${FILES.VIEW}?fileId=${encodeURIComponent(fileId)}&seq=${encodeURIComponent(seq)}`;
    const withThumb = appendThumbSize(core, thumbSize);
    return appendCacheBust(withThumb, options?.cacheBust);
  }

  if (/^https?:\/\//i.test(p)) return p;
  const base = API_CONFIG.BASE_URL?.replace(/\/$/, "") ?? "";
  if (!base) return p;
  return p.startsWith("/") ? `${base}${p}` : `${base}/${p}`;
}

/** 목록 행에서 ATCH_FILE_ID (camelCase / DB 컬럼명) 수집 */
export function getArticleAtchFileIdFromRow(article: {
  atchFileId?: string;
  [key: string]: unknown;
}): string {
  const raw = article.atchFileId ?? article.ATCH_FILE_ID;
  return String(raw ?? "").trim();
}
